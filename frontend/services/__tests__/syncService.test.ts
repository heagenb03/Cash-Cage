import AsyncStorage from '@react-native-async-storage/async-storage';

// Stub the Firestore layer so background fetches / fire-and-forget writes never
// touch a real Firebase instance. Each test drives the fetch resolution itself.
jest.mock('@/services/firebaseService', () => ({
  saveGameToFirestore: jest.fn(() => Promise.resolve()),
  deleteGameFromFirestore: jest.fn(() => Promise.resolve()),
  fetchGamesFromFirestore: jest.fn(() => Promise.resolve([])),
  isFirestoreOfflineError: jest.fn(() => false),
}));

import { Game } from '@/types/game';
import { SyncService } from '@/services/syncService';
import { StorageService } from '@/services/storageService';
import { fetchGamesFromFirestore } from '@/services/firebaseService';

const UID = 'user1';

// Flush pending microtasks + the AsyncStorage macrotasks the background sync awaits.
const flush = async () => {
  for (let i = 0; i < 5; i++) {
    await new Promise(res => setTimeout(res, 0));
  }
};

function makeGame(players: { id: string; name: string }[]): Game {
  return {
    id: 'game1',
    name: 'Friday Night',
    date: new Date('2026-07-01T00:00:00Z'),
    status: 'active',
    players: players.map(p => ({ id: p.id, name: p.name })),
    transactions: [],
    createdAt: new Date('2026-07-01T00:00:00Z'),
    syncedAt: new Date('2026-07-01T00:00:00Z'),
  } as Game;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('background-sync race: a local edit during the sync window survives (the bug)', () => {
  it('does not resurrect a player deleted after loadGames but before the background merge resolves', async () => {
    // Seed local storage with a game containing players A and X, already in sync.
    const gameWithX = makeGame([{ id: 'A', name: 'Alice' }, { id: 'X', name: 'Xavier' }]);
    await StorageService.saveGames([gameWithX]);

    // Hold the background Firestore fetch open so we can interleave a local delete
    // before it resolves — exactly the post-reload window the bug lives in.
    let resolveFetch!: (games: Game[]) => void;
    (fetchGamesFromFirestore as jest.Mock).mockReturnValue(
      new Promise<Game[]>(res => { resolveFetch = res; }),
    );

    const delivered: Game[][] = [];
    const local = await SyncService.loadGames(UID, merged => { delivered.push(merged); });

    // loadGames returns the pre-delete local snapshot immediately.
    expect(local[0].players.map(p => p.id)).toEqual(['A', 'X']);

    // User swipe-deletes player X (same path GameContext.updateGame takes).
    const afterDelete: Game = { ...gameWithX, players: gameWithX.players.filter(p => p.id !== 'X') };
    await SyncService.saveGame(UID, afterDelete);

    // NOW the in-flight background fetch resolves, returning the stale pre-delete
    // remote (still has X). It must not clobber the just-persisted deletion.
    resolveFetch([gameWithX]);
    await flush();

    // Storage must still reflect the deletion.
    const stored = await StorageService.loadGames();
    expect(stored[0].players.map(p => p.id)).not.toContain('X');
    expect(stored[0].players.map(p => p.id)).toEqual(['A']);

    // The UI update delivered via onRemoteUpdate must not bring X back either.
    const lastDelivered = delivered[delivered.length - 1];
    expect(lastDelivered).toBeDefined();
    expect(lastDelivered[0].players.map(p => p.id)).not.toContain('X');
  });
});
