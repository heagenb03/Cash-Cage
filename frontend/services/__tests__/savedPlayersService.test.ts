import AsyncStorage from '@react-native-async-storage/async-storage';

// Stub the Firestore layer so the service's fire-and-forget remote writes and
// background fetch never touch a real Firebase instance.
jest.mock('@/services/firebaseService', () => ({
  saveSavedPlayersToFirestore: jest.fn(() => Promise.resolve()),
  fetchSavedPlayersFromFirestore: jest.fn(() => Promise.resolve([])),
  isFirestoreOfflineError: jest.fn(() => false),
}));

import {
  getSavedPlayers,
  getSavedPlayerNames,
  getSavedPlayer,
  savePlayer,
  deleteSavedPlayer,
  deleteSavedPlayers,
  addSavedPlayers,
  loadSavedPlayers,
  unionMerge,
  SavedPlayer,
  FREE_SAVED_CAP,
  PRO_SAVED_CAP,
} from '@/services/savedPlayersService';
import { fetchSavedPlayersFromFirestore } from '@/services/firebaseService';

const LEGACY_KEY = 'saved_player_names';
const A = 'userA';
const B = 'userB';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  (fetchSavedPlayersFromFirestore as jest.Mock).mockResolvedValue([]);
});

describe('account isolation (the bug)', () => {
  it('does not leak saved players from one account to another', async () => {
    await savePlayer(A, 'Alice');
    expect(await getSavedPlayerNames(B)).toEqual([]);
    expect(await getSavedPlayerNames(A)).toEqual(['Alice']);
  });
});

describe('legacy-key migration', () => {
  it('adopts the legacy global key into the first uid and removes the legacy key', async () => {
    await AsyncStorage.setItem(LEGACY_KEY, JSON.stringify(['Alice', 'Bob']));
    const names = await getSavedPlayerNames(A);
    expect(names.sort()).toEqual(['Alice', 'Bob']);
    expect(await AsyncStorage.getItem(LEGACY_KEY)).toBeNull();
  });

  it('a second account does not inherit the already-adopted legacy pool', async () => {
    await AsyncStorage.setItem(LEGACY_KEY, JSON.stringify(['Alice']));
    await getSavedPlayerNames(A); // A adopts + clears legacy
    expect(await getSavedPlayerNames(B)).toEqual([]);
  });

  it('does not overwrite an existing uid-scoped list with legacy data', async () => {
    await savePlayer(A, 'Zed');
    await AsyncStorage.setItem(LEGACY_KEY, JSON.stringify(['Alice']));
    expect(await getSavedPlayerNames(A)).toEqual(['Zed']);
  });
});

describe('coercion of stored entries', () => {
  it('reads a legacy string[] under a uid key as SavedPlayer[]', async () => {
    await AsyncStorage.setItem(`saved_player_names:${A}`, JSON.stringify(['Alice', 'Bob']));
    expect(await getSavedPlayers(A)).toEqual([{ name: 'Alice' }, { name: 'Bob' }]);
  });

  it('reads a mixed array (legacy string + new object)', async () => {
    await AsyncStorage.setItem(
      `saved_player_names:${A}`,
      JSON.stringify(['Alice', { name: 'Bob', preferredPayment: { method: 'venmo', handle: '@bob' } }]),
    );
    const players = await getSavedPlayers(A);
    expect(players[0]).toEqual({ name: 'Alice' });
    expect(players[1].preferredPayment?.handle).toBe('@bob');
  });
});

describe('savePlayer / getSavedPlayer', () => {
  it('persists a payment and finds it case-insensitively', async () => {
    await savePlayer(A, 'Alice', { method: 'venmo', handle: '@alice' });
    const found = await getSavedPlayer(A, 'alice');
    expect(found?.preferredPayment).toEqual({ method: 'venmo', handle: '@alice' });
  });

  it('without a payment preserves an existing one', async () => {
    await savePlayer(A, 'Alice', { method: 'venmo', handle: '@alice' });
    await savePlayer(A, 'Alice');
    expect((await getSavedPlayer(A, 'Alice'))?.preferredPayment?.handle).toBe('@alice');
  });

  it('stamps updatedAt on save', async () => {
    await savePlayer(A, 'Alice');
    expect(typeof (await getSavedPlayer(A, 'Alice'))?.updatedAt).toBe('number');
  });
});

describe('delete', () => {
  it('removes an entry case-insensitively', async () => {
    await savePlayer(A, 'Alice');
    await savePlayer(A, 'Bob');
    await deleteSavedPlayer(A, 'ALICE');
    expect((await getSavedPlayerNames(A)).sort()).toEqual(['Bob']);
  });

  it('removes multiple entries', async () => {
    await savePlayer(A, 'Alice');
    await savePlayer(A, 'Bob');
    await savePlayer(A, 'Cara');
    await deleteSavedPlayers(A, ['alice', 'cara']);
    expect(await getSavedPlayerNames(A)).toEqual(['Bob']);
  });
});

describe('addSavedPlayers', () => {
  it('adds new entries and merges duplicates (updating payment)', async () => {
    await savePlayer(A, 'Alice', { method: 'venmo', handle: 'alice' });
    const res = await addSavedPlayers(
      A,
      [
        { name: 'Bob' },
        { name: 'alice', preferredPayment: { method: 'cashapp', handle: 'aliceC' } },
      ],
      { limit: PRO_SAVED_CAP },
    );
    expect(res).toEqual({ added: 1, updated: 1, skippedFull: 0 });
    expect((await getSavedPlayer(A, 'Alice'))?.preferredPayment).toEqual({
      method: 'cashapp',
      handle: 'aliceC',
    });
    expect(await getSavedPlayer(A, 'Bob')).toBeDefined();
  });

  it('respects the limit for new entries and reports skippedFull', async () => {
    await addSavedPlayers(A, [{ name: 'A' }, { name: 'B' }], { limit: 2 });
    const res = await addSavedPlayers(A, [{ name: 'C' }, { name: 'D' }], { limit: 2 });
    expect(res).toEqual({ added: 0, updated: 0, skippedFull: 2 });
    expect((await getSavedPlayers(A)).length).toBe(2);
  });
});

describe('cap semantics', () => {
  it('savePlayer does not add a new entry when at the limit', async () => {
    await addSavedPlayers(A, [{ name: 'A' }, { name: 'B' }], { limit: 2 });
    await savePlayer(A, 'C', undefined, 2);
    expect(await getSavedPlayerNames(A)).not.toContain('C');
    expect((await getSavedPlayers(A)).length).toBe(2);
  });

  it('savePlayer updates an existing entry even at/over the limit', async () => {
    await addSavedPlayers(A, [{ name: 'A' }, { name: 'B' }], { limit: 2 });
    await savePlayer(A, 'A', { method: 'venmo', handle: 'a' }, 2);
    expect((await getSavedPlayer(A, 'A'))?.preferredPayment).toEqual({ method: 'venmo', handle: 'a' });
  });

  it('never truncates existing entries above the limit', async () => {
    await addSavedPlayers(A, [{ name: 'A' }, { name: 'B' }, { name: 'C' }], { limit: PRO_SAVED_CAP });
    await savePlayer(A, 'A', { method: 'venmo', handle: 'a' }, 2);
    expect((await getSavedPlayers(A)).length).toBe(3);
  });

  it('exports the tier caps', () => {
    expect(FREE_SAVED_CAP).toBe(15);
    expect(PRO_SAVED_CAP).toBe(200);
  });
});

describe('concurrency', () => {
  it('serializes concurrent writes without dropping one', async () => {
    await Promise.all([
      addSavedPlayers(A, [{ name: 'A' }], { limit: 200 }),
      addSavedPlayers(A, [{ name: 'B' }], { limit: 200 }),
    ]);
    expect((await getSavedPlayers(A)).length).toBe(2);
  });
});

describe('unionMerge', () => {
  it('unions names from both sides', () => {
    const merged = unionMerge(
      [{ name: 'Alice', updatedAt: 1 }, { name: 'Bob', updatedAt: 2 }],
      [{ name: 'Alice', updatedAt: 1 }, { name: 'Carol', updatedAt: 3 }],
    );
    expect(merged.map(p => p.name).sort()).toEqual(['Alice', 'Bob', 'Carol']);
  });

  it('keeps the payment from the entry with the greater updatedAt', () => {
    const merged = unionMerge(
      [{ name: 'Alice', preferredPayment: { method: 'venmo', handle: 'old' }, updatedAt: 1 }],
      [{ name: 'alice', preferredPayment: { method: 'cashapp', handle: 'new' }, updatedAt: 9 }],
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].preferredPayment).toEqual({ method: 'cashapp', handle: 'new' });
  });
});

describe('loadSavedPlayers', () => {
  it('returns local immediately and delivers the union-merged remote via onRemoteUpdate', async () => {
    await savePlayer(A, 'Alice');
    await savePlayer(A, 'Bob');
    (fetchSavedPlayersFromFirestore as jest.Mock).mockResolvedValueOnce([
      { name: 'Alice', updatedAt: 1 },
      { name: 'Carol', updatedAt: 2 },
    ]);
    const merged = await new Promise<SavedPlayer[]>((resolve, reject) => {
      loadSavedPlayers(A, resolve).catch(reject);
    });
    expect(merged.map(p => p.name).sort()).toEqual(['Alice', 'Bob', 'Carol']);
    // merged result was written back to local
    expect((await getSavedPlayerNames(A)).sort()).toEqual(['Alice', 'Bob', 'Carol']);
  });
});
