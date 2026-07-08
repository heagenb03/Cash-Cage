import AsyncStorage from '@react-native-async-storage/async-storage';
import { PreferredPayment } from '@/types/game';
import {
  saveSavedPlayersToFirestore,
  fetchSavedPlayersFromFirestore,
  isFirestoreOfflineError,
} from '@/services/firebaseService';

/** Legacy device-global key (pre account-scoping). Migrated once per device. */
const LEGACY_KEY = 'saved_player_names';
/** Per-account local key. */
function keyFor(uid: string): string {
  return `saved_player_names:${uid}`;
}

/** Free tier: max saved players. Pro tier: effectively unlimited (bounds storage). */
export const FREE_SAVED_CAP = 15;
export const PRO_SAVED_CAP = 200;

/** The effective saved-players cap for a tier. */
export function savedCapFor(isPro: boolean): number {
  return isPro ? PRO_SAVED_CAP : FREE_SAVED_CAP;
}

/**
 * Whether a NEW saved player can still be added at this count. Gate on count vs
 * the tier cap — never on tier alone: free users may add until their cap is full.
 */
export function canAddMoreSavedPlayers(count: number, isPro: boolean): boolean {
  return count < savedCapFor(isPro);
}

export interface SavedPlayer {
  name: string;
  preferredPayment?: PreferredPayment;
  /** Epoch ms of the last edit; tie-breaker for cross-device union merge. */
  updatedAt?: number;
}

/** Coerce a raw stored entry (legacy string or object) into a SavedPlayer. */
function coerce(entry: unknown): SavedPlayer | null {
  if (typeof entry === 'string') return { name: entry };
  if (entry && typeof entry === 'object' && typeof (entry as any).name === 'string') {
    const e = entry as { name: string; preferredPayment?: PreferredPayment; updatedAt?: number };
    const out: SavedPlayer = { name: e.name };
    if (e.preferredPayment) out.preferredPayment = e.preferredPayment;
    if (typeof e.updatedAt === 'number') out.updatedAt = e.updatedAt;
    return out;
  }
  return null;
}

function parseList(raw: string | null): SavedPlayer[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map(coerce).filter((p): p is SavedPlayer => p !== null);
}

/**
 * Read the uid-scoped list. If it is absent AND the legacy global key still holds
 * data, adopt that data into this uid once (stamping updatedAt), then delete the
 * legacy key. Runs at most once per device — the first uid to open the app wins.
 */
async function readLocal(uid: string): Promise<SavedPlayer[]> {
  const scoped = await AsyncStorage.getItem(keyFor(uid));
  if (scoped !== null) return parseList(scoped);

  const legacy = await AsyncStorage.getItem(LEGACY_KEY);
  if (legacy === null) return [];

  const now = Date.now();
  const migrated = parseList(legacy).map(p => (p.updatedAt ? p : { ...p, updatedAt: now }));
  await AsyncStorage.setItem(keyFor(uid), JSON.stringify(migrated));
  await AsyncStorage.removeItem(LEGACY_KEY);
  return migrated;
}

async function writeLocal(uid: string, players: SavedPlayer[]): Promise<void> {
  await AsyncStorage.setItem(keyFor(uid), JSON.stringify(players));
}

/** Push the full list to Firestore (fire-and-forget; offline is swallowed). */
function pushRemote(uid: string, players: SavedPlayer[]): void {
  saveSavedPlayersToFirestore(uid, players).catch(err => {
    if (isFirestoreOfflineError(err)) {
      console.debug('savedPlayers: skipping Firestore save — device offline');
      return;
    }
    console.warn('savedPlayers: Firestore save failed', err);
  });
}

/**
 * Union two lists by lowercased name. For a name in both, keep the entry with the
 * greater updatedAt (missing → 0). Result sorted by updatedAt desc so the most
 * recently touched name sorts first.
 */
export function unionMerge(local: SavedPlayer[], remote: SavedPlayer[]): SavedPlayer[] {
  const byName = new Map<string, SavedPlayer>();
  for (const entry of [...remote, ...local]) {
    const key = entry.name.toLowerCase();
    const existing = byName.get(key);
    if (!existing || (entry.updatedAt ?? 0) >= (existing.updatedAt ?? 0)) {
      byName.set(key, entry);
    }
  }
  return Array.from(byName.values()).sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

/**
 * Module-level promise queue serializing every mutating read-modify-write op.
 * Without this, concurrent/un-awaited calls can race: both read the same
 * pre-mutation snapshot and the second writeLocal() clobbers the first.
 */
let writeChain: Promise<void> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const result = writeChain.then(fn);
  writeChain = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export async function getSavedPlayers(uid: string): Promise<SavedPlayer[]> {
  return enqueue(() => readLocal(uid));
}

export async function getSavedPlayerNames(uid: string): Promise<string[]> {
  return (await getSavedPlayers(uid)).map(p => p.name);
}

export async function getSavedPlayer(uid: string, name: string): Promise<SavedPlayer | undefined> {
  const lower = name.toLowerCase();
  return (await getSavedPlayers(uid)).find(p => p.name.toLowerCase() === lower);
}

/**
 * Persist a saved player. Updating an existing entry (case-insensitive) is always
 * allowed and moves it to the front. A brand-new entry is only added while the list
 * is under `limit`; at/over the limit the new name is dropped. Existing entries are
 * never truncated. With opts.updateOnly, a missing entry is a no-op — the in-game payment
 * editor must never create or resurrect entries.
 */
export async function savePlayer(
  uid: string,
  name: string,
  preferredPayment?: PreferredPayment,
  limit: number = PRO_SAVED_CAP,
  opts?: { updateOnly?: boolean },
): Promise<void> {
  return enqueue(async () => {
    const current = await readLocal(uid);
    const lower = name.toLowerCase();
    const existing = current.find(p => p.name.toLowerCase() === lower);
    if (!existing && opts?.updateOnly) return; // update-only: never create an entry
    if (!existing && current.length >= limit) return; // list full — do not add a new name
    const merged: SavedPlayer = { name, updatedAt: Date.now() };
    const pay = preferredPayment ?? existing?.preferredPayment;
    if (pay) merged.preferredPayment = pay;
    const deduped = [merged, ...current.filter(p => p.name.toLowerCase() !== lower)];
    await writeLocal(uid, deduped);
    pushRemote(uid, deduped);
  });
}

/** Backward-compatible wrapper for callers that only have a name. */
export async function savePlayerName(uid: string, name: string, limit: number = PRO_SAVED_CAP): Promise<void> {
  return savePlayer(uid, name, undefined, limit);
}

/** Remove one saved player (case-insensitive). */
export async function deleteSavedPlayer(uid: string, name: string): Promise<void> {
  return enqueue(async () => {
    const lower = name.toLowerCase();
    const current = await readLocal(uid);
    const next = current.filter(p => p.name.toLowerCase() !== lower);
    await writeLocal(uid, next);
    pushRemote(uid, next);
  });
}

/** Remove several saved players at once (case-insensitive). */
export async function deleteSavedPlayers(uid: string, names: string[]): Promise<void> {
  return enqueue(async () => {
    const lowerSet = new Set(names.map(n => n.toLowerCase()));
    const current = await readLocal(uid);
    const next = current.filter(p => !lowerSet.has(p.name.toLowerCase()));
    await writeLocal(uid, next);
    pushRemote(uid, next);
  });
}

/**
 * Bulk add. For each entry: blank names are skipped; an existing name (case-insensitive)
 * is merged (payment updated only if the entry supplies one); a new name is added while
 * under `limit`, else counted as `skippedFull`. Returns per-outcome counts.
 */
export async function addSavedPlayers(
  uid: string,
  entries: SavedPlayer[],
  opts: { limit: number },
): Promise<{ added: number; updated: number; skippedFull: number }> {
  return enqueue(async () => {
    const result = await readLocal(uid);
    let added = 0;
    let updated = 0;
    let skippedFull = 0;
    const now = Date.now();
    for (const entry of entries) {
      const name = entry.name.trim();
      if (!name) continue;
      const lower = name.toLowerCase();
      const idx = result.findIndex(p => p.name.toLowerCase() === lower);
      if (idx !== -1) {
        if (entry.preferredPayment) {
          result[idx] = { name: result[idx].name, preferredPayment: entry.preferredPayment, updatedAt: now };
          updated++;
        }
        continue;
      }
      if (result.length >= opts.limit) {
        skippedFull++;
        continue;
      }
      const fresh: SavedPlayer = { name, updatedAt: now };
      if (entry.preferredPayment) fresh.preferredPayment = entry.preferredPayment;
      result.unshift(fresh);
      added++;
    }
    await writeLocal(uid, result);
    pushRemote(uid, result);
    return { added, updated, skippedFull };
  });
}

/**
 * Offline-first load: returns the local (uid-scoped, migrated) list immediately,
 * then background-fetches Firestore, union-merges against the latest local, writes
 * the merged list back to BOTH local and Firestore, and calls onRemoteUpdate(merged).
 * Known offline errors are swallowed to a debug log. Mirrors SyncService.loadGames.
 */
export async function loadSavedPlayers(
  uid: string,
  onRemoteUpdate?: (players: SavedPlayer[]) => void,
  signal?: AbortSignal,
): Promise<SavedPlayer[]> {
  const local = await getSavedPlayers(uid);
  if (uid) {
    (async () => {
      try {
        const remote = await fetchSavedPlayersFromFirestore(uid);
        if (signal?.aborted) return;
        const merged = await enqueue(async () => {
          const cur = await readLocal(uid);
          // Clamp to PRO_SAVED_CAP so the merged list never exceeds the Firestore
          // security rule's `players.size() <= 200` ceiling (keep in sync with that rule).
          // unionMerge already sorts by updatedAt desc, so this keeps the most-recently-touched names.
          const m = unionMerge(cur, remote).slice(0, PRO_SAVED_CAP);
          await writeLocal(uid, m);
          return m;
        });
        pushRemote(uid, merged);
        if (signal?.aborted) return;
        onRemoteUpdate?.(merged);
      } catch (err) {
        if (signal?.aborted) return;
        if (isFirestoreOfflineError(err)) {
          console.debug('loadSavedPlayers: skipping background sync — device offline');
          return;
        }
        console.warn('loadSavedPlayers: background sync failed', err);
      }
    })();
  }
  return local;
}
