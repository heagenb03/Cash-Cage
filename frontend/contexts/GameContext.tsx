import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Game } from '@/types/game';
import { GameService } from '@/services/gameService';
import { StorageService } from '@/services/storageService';
import { SyncService } from '@/services/syncService';
import { useAuth } from '@/contexts/AuthContext';

interface GameContextType {
  games: Game[];
  activeGame: Game | null;
  loading: boolean;
  createGame: (name: string) => Promise<Game>;
  setActiveGame: (gameId: string | null) => void;
  updateGame: (game: Game) => Promise<void>;
  deleteGame: (gameId: string) => Promise<void>;
  refreshGames: () => Promise<void>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [games, setGames] = useState<Game[]>([]);
  const [activeGame, setActiveGameState] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const uid = user?.uid ?? null;

  // ---------------------------------------------------------------------------
  // loadGames — reads from AsyncStorage immediately (offline-first), then
  // kicks off a background Firestore sync when signed in. The remote merge
  // result updates the UI transparently via onRemoteUpdate.
  // ---------------------------------------------------------------------------

  const loadGames = useCallback(async (currentUid: string | null) => {
    try {
      setLoading(true);

      const localGames = await SyncService.loadGames(currentUid, (mergedGames) => {
        // Background Firestore sync completed — refresh UI with merged data
        setGames(mergedGames);
        setActiveGameState(prev =>
          prev ? (mergedGames.find(g => g.id === prev.id) ?? null) : null,
        );
      });

      setGames(localGames);

      const activeGameId = await StorageService.loadActiveGameId();
      if (activeGameId) {
        const active = localGames.find(g => g.id === activeGameId);
        setActiveGameState(active ?? null);
      }
    } catch (error) {
      console.error('GameContext: error loading games', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-load whenever uid changes (sign-in, sign-out, or initial mount).
  // On sign-in: background Firestore sync merges remote games into local.
  // On sign-out: local games are preserved (uid=null skips Firestore).
  useEffect(() => {
    loadGames(uid);
  }, [uid, loadGames]);

  // ---------------------------------------------------------------------------
  // CRUD operations — update React state immediately, then persist via
  // SyncService (AsyncStorage + fire-and-forget Firestore when signed in).
  // ---------------------------------------------------------------------------

  const createGame = async (name: string): Promise<Game> => {
    const newGame = GameService.createGame(name);
    setGames(prev => [...prev, newGame]);
    await SyncService.saveGame(uid, newGame);
    setActiveGameState(newGame);
    await StorageService.saveActiveGameId(newGame.id);
    return newGame;
  };

  const setActiveGame = async (gameId: string | null) => {
    const game = gameId ? games.find(g => g.id === gameId) ?? null : null;
    setActiveGameState(game);
    await StorageService.saveActiveGameId(gameId);
  };

  const updateGame = async (updatedGame: Game) => {
    const freshGame = { ...updatedGame };
    setGames(prev => prev.map(g => (g.id === updatedGame.id ? freshGame : g)));
    if (activeGame?.id === updatedGame.id) {
      setActiveGameState(freshGame);
    }
    await SyncService.saveGame(uid, freshGame);
  };

  const deleteGame = async (gameId: string) => {
    setGames(prev => prev.filter(g => g.id !== gameId));
    if (activeGame?.id === gameId) {
      setActiveGameState(null);
      await StorageService.saveActiveGameId(null);
    }
    await SyncService.deleteGame(uid, gameId);
  };

  const refreshGames = async () => {
    await loadGames(uid);
  };

  return (
    <GameContext.Provider
      value={{
        games,
        activeGame,
        loading,
        createGame,
        setActiveGame,
        updateGame,
        deleteGame,
        refreshGames,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
