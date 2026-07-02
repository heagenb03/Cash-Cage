import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getSavedPlayers,
  getSavedPlayerNames,
  getSavedPlayer,
  savePlayer,
} from '@/services/savedPlayersService';

const KEY = 'saved_player_names';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('savedPlayersService migration', () => {
  it('reads a legacy string[] as SavedPlayer[]', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify(['Alice', 'Bob']));
    const players = await getSavedPlayers();
    expect(players).toEqual([{ name: 'Alice' }, { name: 'Bob' }]);
  });

  it('reads a mixed array (legacy string + new object)', async () => {
    await AsyncStorage.setItem(
      KEY,
      JSON.stringify(['Alice', { name: 'Bob', preferredPayment: { method: 'venmo', handle: '@bob' } }]),
    );
    const players = await getSavedPlayers();
    expect(players[0]).toEqual({ name: 'Alice' });
    expect(players[1].preferredPayment?.handle).toBe('@bob');
  });

  it('getSavedPlayerNames returns just names', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify(['Alice', 'Bob']));
    expect(await getSavedPlayerNames()).toEqual(['Alice', 'Bob']);
  });

  it('savePlayer persists a payment and getSavedPlayer finds it case-insensitively', async () => {
    await savePlayer('Alice', { method: 'venmo', handle: '@alice' });
    const found = await getSavedPlayer('alice');
    expect(found?.preferredPayment).toEqual({ method: 'venmo', handle: '@alice' });
  });

  it('savePlayer without a payment preserves an existing one', async () => {
    await savePlayer('Alice', { method: 'venmo', handle: '@alice' });
    await savePlayer('Alice'); // e.g. re-added later with no payment arg
    const found = await getSavedPlayer('Alice');
    expect(found?.preferredPayment?.handle).toBe('@alice');
  });
});
