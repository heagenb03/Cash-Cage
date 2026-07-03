import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getSavedPlayers,
  getSavedPlayerNames,
  getSavedPlayer,
  savePlayer,
  deleteSavedPlayer,
  deleteSavedPlayers,
  addSavedPlayers,
  FREE_SAVED_CAP,
  PRO_SAVED_CAP,
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

describe('savedPlayersService delete', () => {
  it('deleteSavedPlayer removes an entry case-insensitively', async () => {
    await savePlayer('Alice');
    await savePlayer('Bob');
    await deleteSavedPlayer('ALICE');
    expect(await getSavedPlayerNames()).toEqual(['Bob']);
  });

  it('deleteSavedPlayers removes multiple entries', async () => {
    await savePlayer('Alice');
    await savePlayer('Bob');
    await savePlayer('Cara');
    await deleteSavedPlayers(['alice', 'cara']);
    expect(await getSavedPlayerNames()).toEqual(['Bob']);
  });
});

describe('savedPlayersService addSavedPlayers', () => {
  it('adds new entries and merges duplicates (updating payment)', async () => {
    await savePlayer('Alice', { method: 'venmo', handle: 'alice' });
    const res = await addSavedPlayers(
      [
        { name: 'Bob' },
        { name: 'alice', preferredPayment: { method: 'cashapp', handle: 'aliceC' } },
      ],
      { limit: PRO_SAVED_CAP },
    );
    expect(res).toEqual({ added: 1, updated: 1, skippedFull: 0 });
    expect((await getSavedPlayer('Alice'))?.preferredPayment).toEqual({
      method: 'cashapp',
      handle: 'aliceC',
    });
    expect(await getSavedPlayer('Bob')).toBeDefined();
  });

  it('respects the limit for new entries and reports skippedFull', async () => {
    await addSavedPlayers([{ name: 'A' }, { name: 'B' }], { limit: 2 });
    const res = await addSavedPlayers([{ name: 'C' }, { name: 'D' }], { limit: 2 });
    expect(res).toEqual({ added: 0, updated: 0, skippedFull: 2 });
    expect((await getSavedPlayers()).length).toBe(2);
  });
});

describe('savedPlayersService cap semantics', () => {
  it('savePlayer does not add a new entry when at the limit', async () => {
    await addSavedPlayers([{ name: 'A' }, { name: 'B' }], { limit: 2 });
    await savePlayer('C', undefined, 2);
    expect(await getSavedPlayerNames()).not.toContain('C');
    expect((await getSavedPlayers()).length).toBe(2);
  });

  it('savePlayer updates an existing entry even at/over the limit', async () => {
    await addSavedPlayers([{ name: 'A' }, { name: 'B' }], { limit: 2 });
    await savePlayer('A', { method: 'venmo', handle: 'a' }, 2);
    expect((await getSavedPlayer('A'))?.preferredPayment).toEqual({ method: 'venmo', handle: 'a' });
  });

  it('never truncates existing entries above the limit', async () => {
    await addSavedPlayers([{ name: 'A' }, { name: 'B' }, { name: 'C' }], { limit: PRO_SAVED_CAP });
    await savePlayer('A', { method: 'venmo', handle: 'a' }, 2); // limit 2, but 3 already stored
    expect((await getSavedPlayers()).length).toBe(3);
  });

  it('exports the tier caps', () => {
    expect(FREE_SAVED_CAP).toBe(15);
    expect(PRO_SAVED_CAP).toBe(200);
  });
});
