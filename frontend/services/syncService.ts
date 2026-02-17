import { Game } from '@/types/game';
import { StorageService } from '@/services/storageService';
import {
  saveGameToFirestore,
  deleteGameFromFirestore,
  fetchGamesFromFirestore,
} from '@/services/firebaseService';

// ---------------------------------------------------------------------------
// SyncService — offline-first dual-write with background Firestore sync.
//
// Architecture:
//   - AsyncStorage is the source of truth for reads (always available offline).
//   - Firestore is synced in the background when the user is signed in.
//   - Conflict resolution: last-write-wins by syncedAt timestamp (falls back
//     to createdAt for games that have never been synced to Firestore).
//
// Notes:
//   - saveGame / deleteGame read the current AsyncStorage state, mutate it,
//     and write it back. This is safe for sequential user-driven operations.
//   - Firestore writes are fire-and-forget — failures are logged but do not
//     block the local operation or surface errors to the user.
// ---------------------------------------------------------------------------

export class SyncService {
  /**
   * Load games from AsyncStorage immediately (offline-first), then kick off a
   * background Firestore fetch if the user is signed in. The background merge
   * result is delivered via `onRemoteUpdate` when available.
   */
  static async loadGames(
    uid: string | null,
    onRemoteUpdate?: (games: Game[]) => void,
  ): Promise<Game[]> {
    const local = await StorageService.loadGames();
    const localWithDates = local.map(deserializeSyncedAt);

    if (uid) {
      // Fire background Firestore sync — non-blocking
      (async () => {
        try {
          const remote = await fetchGamesFromFirestore(uid);
          const merged = SyncService.mergeGames(localWithDates, remote);
          await StorageService.saveGames(merged);
          onRemoteUpdate?.(merged);
        } catch (err) {
          console.warn('SyncService: background Firestore sync failed', err);
        }
      })();
    }

    return localWithDates;
  }

  /**
   * Persist a game locally (AsyncStorage) and asynchronously write it to
   * Firestore if the user is signed in.
   */
  static async saveGame(uid: string | null, game: Game): Promise<void> {
    // Read current local state, patch the target game, write back
    const current = await StorageService.loadGames();
    const withDates = current.map(deserializeSyncedAt);
    const exists = withDates.some(g => g.id === game.id);
    const updated = exists
      ? withDates.map(g => (g.id === game.id ? game : g))
      : [...withDates, game];
    await StorageService.saveGames(updated);

    // Fire-and-forget Firestore write
    if (uid) {
      saveGameToFirestore(uid, game).catch(err =>
        console.warn('SyncService: Firestore save failed', err),
      );
    }
  }

  /**
   * Remove a game locally and asynchronously delete it from Firestore.
   */
  static async deleteGame(uid: string | null, gameId: string): Promise<void> {
    const current = await StorageService.loadGames();
    const updated = current.filter(g => g.id !== gameId);
    await StorageService.saveGames(updated);

    if (uid) {
      deleteGameFromFirestore(uid, gameId).catch(err =>
        console.warn('SyncService: Firestore delete failed', err),
      );
    }
  }

  /**
   * Merge local and remote game arrays using last-write-wins by syncedAt.
   * Falls back to createdAt for games that have never been synced.
   * Games present in only one source are included unconditionally.
   */
  private static mergeGames(local: Game[], remote: Game[]): Game[] {
    const merged = new Map<string, Game>();

    for (const game of local) {
      merged.set(game.id, game);
    }

    for (const remoteGame of remote) {
      const localGame = merged.get(remoteGame.id);
      if (!localGame) {
        // Only in Firestore — add it
        merged.set(remoteGame.id, remoteGame);
      } else {
        // In both — keep the newer version
        const localTime = localGame.syncedAt ?? localGame.createdAt;
        const remoteTime = remoteGame.syncedAt ?? remoteGame.createdAt;
        if (remoteTime > localTime) {
          merged.set(remoteGame.id, remoteGame);
        }
      }
    }

    return Array.from(merged.values());
  }
}

/**
 * StorageService doesn't know about syncedAt, so after loading from
 * AsyncStorage the field comes back as an ISO string. Convert it to a Date.
 */
function deserializeSyncedAt(game: Game & { syncedAt?: any }): Game {
  if (game.syncedAt && typeof game.syncedAt === 'string') {
    return { ...game, syncedAt: new Date(game.syncedAt) };
  }
  return game;
}
