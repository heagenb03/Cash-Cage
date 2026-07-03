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
}

/** Backward-compatible wrapper for callers that only have a name. */
export async function savePlayerName(name: string, limit: number = PRO_SAVED_CAP): Promise<void> {
  return savePlayer(name, undefined, limit);
}

/** Remove one saved player (case-insensitive). */
export async function deleteSavedPlayer(name: string): Promise<void> {
  const lower = name.toLowerCase();
  const current = await getSavedPlayers();
  await writeAll(current.filter(p => p.name.toLowerCase() !== lower));
}

/** Remove several saved players at once (case-insensitive). */
export async function deleteSavedPlayers(names: string[]): Promise<void> {
  const lowerSet = new Set(names.map(n => n.toLowerCase()));
  const current = await getSavedPlayers();
  await writeAll(current.filter(p => !lowerSet.has(p.name.toLowerCase())));
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
}
