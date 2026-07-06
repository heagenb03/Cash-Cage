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
} from '@/services/firebaseService';
import { getDoc } from 'firebase/firestore';

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
