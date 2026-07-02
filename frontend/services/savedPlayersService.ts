import AsyncStorage from '@react-native-async-storage/async-storage';
import { PreferredPayment } from '@/types/game';

const KEY = 'saved_player_names';
const MAX_SAVED = 30;

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

export async function savePlayer(
  name: string,
  preferredPayment?: PreferredPayment,
): Promise<void> {
  const current = await getSavedPlayers();
  const existing = current.find(p => p.name.toLowerCase() === name.toLowerCase());
  const merged: SavedPlayer = {
    name,
    preferredPayment: preferredPayment ?? existing?.preferredPayment,
  };
  const deduped = [merged, ...current.filter(p => p.name.toLowerCase() !== name.toLowerCase())];
  await AsyncStorage.setItem(KEY, JSON.stringify(deduped.slice(0, MAX_SAVED)));
}

/** Backward-compatible wrapper for callers that only have a name. */
export async function savePlayerName(name: string): Promise<void> {
  return savePlayer(name);
}
