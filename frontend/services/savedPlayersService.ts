import AsyncStorage from '@react-native-async-storage/async-storage';
import { PreferredPayment } from '@/types/game';

const KEY = 'saved_player_names';

/** Free tier: max saved players. Pro tier: effectively unlimited (bounds storage). */
export const FREE_SAVED_CAP = 15;
export const PRO_SAVED_CAP = 200;

export interface SavedPlayer {
  name: string;
  preferredPayment?: PreferredPayment;
}

/** Coerce a raw stored entry (legacy string or new object) into a SavedPlayer. */
function coerce(entry: unknown): SavedPlayer | null {
  if (typeof entry === 'string') return { name: entry };
  if (entry && typeof entry === 'object' && typeof (entry as any).name === 'string') {
    const e = entry as { name: string; preferredPayment?: PreferredPayment };
    return e.preferredPayment
      ? { name: e.name, preferredPayment: e.preferredPayment }
      : { name: e.name };
  }
  return null;
}

async function writeAll(players: SavedPlayer[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(players));
}

/**
 * Module-level promise queue serializing every mutating read-modify-write op.
 * Without this, concurrent/un-awaited calls (bulk add/delete, a double-tap) can
 * race: both read the same pre-mutation snapshot, and the second writeAll()
 * clobbers the first (last-write-wins), silently dropping a change.
 *
 * `enqueue` chains each op's body after the previous op settles (success OR
 * failure) so a rejection never poisons the chain for later ops, while still
 * returning each op's own result/error to its caller.
 */
let writeChain: Promise<void> = Promise.resolve();
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const result = writeChain.then(fn);
  // Swallow the outcome for chaining purposes only (a rejection must not
  // poison later queued ops); callers still get the real result/rejection
  // via `result`.
  writeChain = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

export async function getSavedPlayers(): Promise<SavedPlayer[]> {
  const raw = await AsyncStorage.getItem(KEY);
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

export async function getSavedPlayerNames(): Promise<string[]> {
  return (await getSavedPlayers()).map(p => p.name);
}

export async function getSavedPlayer(name: string): Promise<SavedPlayer | undefined> {
  const lower = name.toLowerCase();
  return (await getSavedPlayers()).find(p => p.name.toLowerCase() === lower);
}

/**
 * Persist a saved player. Updating an existing entry (case-insensitive) is always
 * allowed and moves it to the front. A brand-new entry is only added while the list
 * is under `limit`; at/over the limit the new name is dropped. Existing entries are
 * never truncated, so legacy lists longer than `limit` are preserved.
 */
export async function savePlayer(
  name: string,
  preferredPayment?: PreferredPayment,
  limit: number = PRO_SAVED_CAP,
): Promise<void> {
  return enqueue(async () => {
    const current = await getSavedPlayers();
    const lower = name.toLowerCase();
    const existing = current.find(p => p.name.toLowerCase() === lower);
    if (!existing && current.length >= limit) return; // list full — do not add a new name
    const merged: SavedPlayer = {
      name,
      preferredPayment: preferredPayment ?? existing?.preferredPayment,
    };
    const deduped = [merged, ...current.filter(p => p.name.toLowerCase() !== lower)];
    await writeAll(deduped);
  });
}

/** Backward-compatible wrapper for callers that only have a name. */
export async function savePlayerName(name: string, limit: number = PRO_SAVED_CAP): Promise<void> {
  return savePlayer(name, undefined, limit);
}

/** Remove one saved player (case-insensitive). */
export async function deleteSavedPlayer(name: string): Promise<void> {
  return enqueue(async () => {
    const lower = name.toLowerCase();
    const current = await getSavedPlayers();
    await writeAll(current.filter(p => p.name.toLowerCase() !== lower));
  });
}

/** Remove several saved players at once (case-insensitive). */
export async function deleteSavedPlayers(names: string[]): Promise<void> {
  return enqueue(async () => {
    const lowerSet = new Set(names.map(n => n.toLowerCase()));
    const current = await getSavedPlayers();
    await writeAll(current.filter(p => !lowerSet.has(p.name.toLowerCase())));
  });
}

/**
 * Bulk add. For each entry: blank names are skipped; an existing name (case-insensitive)
 * is merged (payment updated only if the entry supplies one); a new name is added while
 * under `limit`, else counted as `skippedFull`. Returns per-outcome counts.
 */
export async function addSavedPlayers(
  entries: SavedPlayer[],
  opts: { limit: number },
): Promise<{ added: number; updated: number; skippedFull: number }> {
  return enqueue(async () => {
    const result = await getSavedPlayers();
    let added = 0;
    let updated = 0;
    let skippedFull = 0;
    for (const entry of entries) {
      const name = entry.name.trim();
      if (!name) continue;
      const lower = name.toLowerCase();
      const idx = result.findIndex(p => p.name.toLowerCase() === lower);
      if (idx !== -1) {
        if (entry.preferredPayment) {
          result[idx] = { name: result[idx].name, preferredPayment: entry.preferredPayment };
          updated++;
        }
        continue;
      }
      if (result.length >= opts.limit) {
        skippedFull++;
        continue;
      }
      result.unshift(entry.preferredPayment ? { name, preferredPayment: entry.preferredPayment } : { name });
      added++;
    }
    await writeAll(result);
    return { added, updated, skippedFull };
  });
}
