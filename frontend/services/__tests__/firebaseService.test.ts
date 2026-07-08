// Firebase SDK is initialized at module scope in firebaseService, so every
// firebase entry point must be mocked before the module is imported.
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => ({})),
  getApps: jest.fn(() => []),
}));
jest.mock('firebase/auth', () => ({
  initializeAuth: jest.fn(() => ({})),
  getAuth: jest.fn(() => ({})),
  getReactNativePersistence: jest.fn(() => ({})),
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signInWithCredential: jest.fn(),
  signOut: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  updateProfile: jest.fn(),
  updatePassword: jest.fn(),
  reauthenticateWithCredential: jest.fn(),
  EmailAuthProvider: { credential: jest.fn() },
  deleteUser: jest.fn(),
  GoogleAuthProvider: { credential: jest.fn() },
  OAuthProvider: jest.fn(),
}));
jest.mock('firebase/firestore', () => ({
  initializeFirestore: jest.fn(() => ({})),
  persistentLocalCache: jest.fn(() => ({})),
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  deleteDoc: jest.fn(),
  updateDoc: jest.fn(),
  collection: jest.fn(),
  serverTimestamp: jest.fn(),
  increment: jest.fn(),
  runTransaction: jest.fn(),
}));
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(),
}));

import {
  deserializeFirestoreGame,
  fetchSavedPlayersFromFirestore,
  incrementProfileStats,
} from '@/services/firebaseService';
import { getDoc, runTransaction, increment, updateDoc } from 'firebase/firestore';

describe('deserializeFirestoreGame', () => {
  const baseDoc = {
    id: 'g1',
    name: 'Friday Night',
    date: new Date('2026-07-01T20:00:00Z'),
    status: 'active',
    players: [{ id: 'p1', name: 'Alice' }],
    transactions: [
      { id: 't1', playerId: 'p1', type: 'buyin', amount: 100, timestamp: new Date('2026-07-01T20:05:00Z') },
    ],
    createdAt: new Date('2026-07-01T20:00:00Z'),
    syncedAt: new Date('2026-07-02T01:00:00Z'),
  };

  it('preserves cashUnit so a synced game does not reset to the default', () => {
    const game = deserializeFirestoreGame({ ...baseDoc, cashUnit: 20 });
    expect(game.cashUnit).toBe(20);
  });

  it('preserves cashUnit=0 (Exact)', () => {
    const game = deserializeFirestoreGame({ ...baseDoc, cashUnit: 0 });
    expect(game.cashUnit).toBe(0);
  });

  it('preserves currency', () => {
    const game = deserializeFirestoreGame({ ...baseDoc, currency: 'JPY' });
    expect(game.currency).toBe('JPY');
  });

  it('leaves cashUnit/currency undefined when absent in the document', () => {
    const game = deserializeFirestoreGame(baseDoc);
    expect(game.cashUnit).toBeUndefined();
    expect(game.currency).toBeUndefined();
  });

  it('preserves a player preferredPayment so it does not reset after a sync', () => {
    const game = deserializeFirestoreGame({
      ...baseDoc,
      players: [{ id: 'p1', name: 'Alice', preferredPayment: { method: 'venmo', handle: '@alice' } }],
    });
    expect(game.players[0].preferredPayment).toEqual({ method: 'venmo', handle: '@alice' });
  });

  it('preserves a preferredPayment with no handle (e.g. cash)', () => {
    const game = deserializeFirestoreGame({
      ...baseDoc,
      players: [{ id: 'p1', name: 'Alice', preferredPayment: { method: 'cash' } }],
    });
    expect(game.players[0].preferredPayment).toEqual({ method: 'cash' });
  });

  it('leaves preferredPayment undefined when absent on the player', () => {
    const game = deserializeFirestoreGame(baseDoc);
    expect(game.players[0].preferredPayment).toBeUndefined();
  });
});

describe('fetchSavedPlayersFromFirestore', () => {
  it('returns the players array when the document exists', async () => {
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ players: [{ name: 'Alice', updatedAt: 5 }] }),
    });
    const players = await fetchSavedPlayersFromFirestore('userA');
    expect(players).toEqual([{ name: 'Alice', updatedAt: 5 }]);
  });

  it('returns [] when the document is missing', async () => {
    (getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => false });
    expect(await fetchSavedPlayersFromFirestore('userA')).toEqual([]);
  });

  it('returns [] when players is not an array', async () => {
    (getDoc as jest.Mock).mockResolvedValueOnce({
      exists: () => true,
      data: () => ({}),
    });
    expect(await fetchSavedPlayersFromFirestore('userA')).toEqual([]);
  });
});

describe('incrementProfileStats — biggestPot', () => {
  beforeEach(() => {
    (increment as jest.Mock).mockImplementation((n: number) => ({ __increment: n }));
    (updateDoc as jest.Mock).mockClear();
    (updateDoc as jest.Mock).mockResolvedValue(undefined);
  });

  // Counters are now written via a separate offline-durable `updateDoc` call
  // that runs before the biggestPot transaction — see incrementProfileStats.
  function runWith(existingBiggest: unknown, gamePot: number) {
    const update = jest.fn();
    (runTransaction as jest.Mock).mockImplementationOnce(async (_db, cb) => {
      await cb({
        get: async () => ({
          exists: () => true,
          data: () => (existingBiggest === undefined ? {} : { biggestPot: existingBiggest }),
        }),
        update,
      });
    });
    return { update, gamePot };
  }

  it('raises biggestPot when the new pot is larger', async () => {
    const { update } = runWith(500, 1200);
    await incrementProfileStats('u1', { gamesPlayed: 1, moneyTracked: 200, playersHosted: 4, gamePot: 1200 });
    expect(update.mock.calls[0][1]).toEqual(expect.objectContaining({ biggestPot: 1200 }));
  });

  it('holds biggestPot when the new pot is smaller', async () => {
    const { update } = runWith(1500, 300);
    await incrementProfileStats('u1', { gamesPlayed: 1, moneyTracked: 300, playersHosted: 3, gamePot: 300 });
    expect(update.mock.calls[0][1]).toEqual(expect.objectContaining({ biggestPot: 1500 }));
  });

  it('initializes biggestPot from 0 when the field is absent', async () => {
    const { update } = runWith(undefined, 800);
    await incrementProfileStats('u1', { gamesPlayed: 1, moneyTracked: 800, playersHosted: 5, gamePot: 800 });
    expect(update.mock.calls[0][1]).toEqual(expect.objectContaining({ biggestPot: 800 }));
  });

  it('still increments the three counters via updateDoc', async () => {
    runWith(0, 100);
    await incrementProfileStats('u1', { gamesPlayed: 1, moneyTracked: 100, playersHosted: 2, gamePot: 100 });
    expect((updateDoc as jest.Mock).mock.calls[0][1]).toEqual(expect.objectContaining({
      totalGamesPlayed: { __increment: 1 },
      totalMoneyTracked: { __increment: 100 },
      totalPlayersHosted: { __increment: 2 },
    }));
  });

  it('preserves the three counters when the biggestPot transaction rejects offline (durability regression guard)', async () => {
    (runTransaction as jest.Mock).mockRejectedValueOnce(new Error('offline'));

    await expect(
      incrementProfileStats('u1', { gamesPlayed: 1, moneyTracked: 150, playersHosted: 3, gamePot: 900 }),
    ).rejects.toThrow('offline');

    // The counters must have been written via updateDoc BEFORE the
    // transaction rejected — that's the whole point of the split.
    expect((updateDoc as jest.Mock).mock.calls[0][1]).toEqual(expect.objectContaining({
      totalGamesPlayed: { __increment: 1 },
      totalMoneyTracked: { __increment: 150 },
      totalPlayersHosted: { __increment: 3 },
    }));
  });
});
