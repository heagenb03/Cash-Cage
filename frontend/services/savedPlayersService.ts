import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'saved_player_names';
const MAX_SAVED = 30;

export async function getSavedPlayers(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function savePlayerName(name: string): Promise<void> {
  const current = await getSavedPlayers();
  const deduped = [name, ...current.filter(n => n.toLowerCase() !== name.toLowerCase())];
  await AsyncStorage.setItem(KEY, JSON.stringify(deduped.slice(0, MAX_SAVED)));
}
