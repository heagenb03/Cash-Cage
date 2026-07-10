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
import { SyncService, applyPendingMutations } from '@/services/syncService';
import { StorageService } from '@/services/storageService';
import {
  fetchGamesFromFirestore,
  saveGameToFirestore,
  deleteGameFromFirestore,
} from '@/services/firebaseService';

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
  SyncService.clearPendingMutations();
  (fetchGamesFromFirestore as jest.Mock).mockResolvedValue([]);
  (saveGameToFirestore as jest.Mock).mockResolvedValue(undefined);
  (deleteGameFromFirestore as jest.Mock).mockResolvedValue(undefined);
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

describe('applyPendingMutations (pure reconciliation)', () => {
  const g = (id: string, players: { id: string; name: string }[]) => {
    const base = makeGame(players);
    return { ...base, id } as Game;
  };

  it('forces the fresh-local version for a game with a pending save', () => {
    const localEdited = g('game1', [{ id: 'A', name: 'Alice' }]);            // B removed locally
    const mergedRemote = g('game1', [{ id: 'A', name: 'Alice' }, { id: 'B', name: 'Bob' }]);
    const out = applyPendingMutations([mergedRemote], [localEdited], new Set(['game1']), new Set());
    expect(out).toHaveLength(1);
    expect(out[0].players.map(p => p.id)).toEqual(['A']);
  });

  it('re-adds a pending-saved game that the merge dropped entirely', () => {
    const localOnly = g('game1', [{ id: 'A', name: 'Alice' }]);
    const out = applyPendingMutations([], [localOnly], new Set(['game1']), new Set());
    expect(out.map(x => x.id)).toEqual(['game1']);
  });

  it('removes a game with a pending delete', () => {
    const remoteStillHasIt = g('game1', [{ id: 'A', name: 'Alice' }]);
    const out = applyPendingMutations([remoteStillHasIt], [], new Set(), new Set(['game1']));
    expect(out).toEqual([]);
  });

  it('leaves non-pending games untouched', () => {
    const other = g('game2', [{ id: 'C', name: 'Cara' }]);
    const out = applyPendingMutations([other], [], new Set(), new Set());
    expect(out).toEqual([other]);
  });
});

describe('pending-mutations registry protects local edits (Limitation 1)', () => {
  it('keeps a local edit when a strictly-newer remote would otherwise revert it', async () => {
    const T1 = new Date('2026-07-01T00:00:00Z');
    const T2 = new Date('2026-07-02T00:00:00Z');
    const original = { ...makeGame([{ id: 'A', name: 'Alice' }, { id: 'B', name: 'Bob' }]), syncedAt: T1 } as Game;
    await StorageService.saveGames([original]);

    // The local edit's Firestore write is still in flight when the merge runs.
    (saveGameToFirestore as jest.Mock).mockReturnValue(new Promise<void>(() => {}));
    const edited = { ...original, players: [{ id: 'A', name: 'Alice' }] } as Game;   // B removed
    await SyncService.saveGame(UID, edited);

    let resolveFetch!: (games: Game[]) => void;
    (fetchGamesFromFirestore as jest.Mock).mockReturnValue(new Promise<Game[]>(res => { resolveFetch = res; }));
    const delivered: Game[][] = [];
    await SyncService.loadGames(UID, merged => { delivered.push(merged); });

    // Another device's newer state still has B (and a C) — must NOT clobber the local delete of B.
    resolveFetch([{ ...original, players: [{ id: 'A', name: 'Alice' }, { id: 'B', name: 'Bob' }, { id: 'C', name: 'Cara' }], syncedAt: T2 } as Game]);
    await flush();

    const stored = await StorageService.loadGames();
    expect(stored[0].players.map(p => p.id)).toEqual(['A']);
    expect(delivered[delivered.length - 1][0].players.map(p => p.id)).toEqual(['A']);
  });

  it('releases protection once the Firestore write confirms (no permanent lock)', async () => {
    const T1 = new Date('2026-07-01T00:00:00Z');
    const T2 = new Date('2026-07-02T00:00:00Z');
    const original = { ...makeGame([{ id: 'A', name: 'Alice' }, { id: 'B', name: 'Bob' }]), syncedAt: T1 } as Game;
    await StorageService.saveGames([original]);

    (saveGameToFirestore as jest.Mock).mockResolvedValue(undefined);   // confirms immediately
    await SyncService.saveGame(UID, { ...original, players: [{ id: 'A', name: 'Alice' }] } as Game);
    await flush();   // let the .then clear pendingSaves

    let resolveFetch!: (games: Game[]) => void;
    (fetchGamesFromFirestore as jest.Mock).mockReturnValue(new Promise<Game[]>(res => { resolveFetch = res; }));
    await SyncService.loadGames(UID, () => {});
    resolveFetch([{ ...original, players: [{ id: 'A', name: 'Alice' }, { id: 'B', name: 'Bob' }, { id: 'C', name: 'Cara' }], syncedAt: T2 } as Game]);
    await flush();

    const stored = await StorageService.loadGames();
    expect(stored[0].players.map(p => p.id)).toEqual(['A', 'B', 'C']);   // remote won — protection released
  });

  it('clearPendingMutations() drops protection immediately', async () => {
    const T1 = new Date('2026-07-01T00:00:00Z');
    const T2 = new Date('2026-07-02T00:00:00Z');
    const original = { ...makeGame([{ id: 'A', name: 'Alice' }, { id: 'B', name: 'Bob' }]), syncedAt: T1 } as Game;
    await StorageService.saveGames([original]);

    (saveGameToFirestore as jest.Mock).mockReturnValue(new Promise<void>(() => {}));   // stays pending
    await SyncService.saveGame(UID, { ...original, players: [{ id: 'A', name: 'Alice' }] } as Game);
    SyncService.clearPendingMutations();

    let resolveFetch!: (games: Game[]) => void;
    (fetchGamesFromFirestore as jest.Mock).mockReturnValue(new Promise<Game[]>(res => { resolveFetch = res; }));
    await SyncService.loadGames(UID, () => {});
    resolveFetch([{ ...original, players: [{ id: 'A', name: 'Alice' }, { id: 'B', name: 'Bob' }, { id: 'C', name: 'Cara' }], syncedAt: T2 } as Game]);
    await flush();

    const stored = await StorageService.loadGames();
    expect(stored[0].players.map(p => p.id)).toEqual(['A', 'B', 'C']);   // no longer protected
  });
});

describe('pending-mutations registry protects local deletes', () => {
  it('does not resurrect a game deleted locally while its Firestore delete is in flight', async () => {
    const T1 = new Date('2026-07-01T00:00:00Z');
    const T2 = new Date('2026-07-02T00:00:00Z');
    const game = { ...makeGame([{ id: 'A', name: 'Alice' }]), syncedAt: T1 } as Game;
    await StorageService.saveGames([game]);

    (deleteGameFromFirestore as jest.Mock).mockReturnValue(new Promise<void>(() => {}));
    await SyncService.deleteGame(UID, game.id);

    let resolveFetch!: (games: Game[]) => void;
    (fetchGamesFromFirestore as jest.Mock).mockReturnValue(new Promise<Game[]>(res => { resolveFetch = res; }));
    const delivered: Game[][] = [];
    await SyncService.loadGames(UID, merged => { delivered.push(merged); });

    resolveFetch([{ ...game, syncedAt: T2 } as Game]);   // remote still has it, newer
    await flush();

    const stored = await StorageService.loadGames();
    expect(stored).toEqual([]);
    expect(delivered[delivered.length - 1]).toEqual([]);
  });
});
