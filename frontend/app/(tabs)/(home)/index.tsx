import { StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, AccessibilityInfo } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text, View } from '@/components/Themed';
import { useGame } from '@/contexts/GameContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback, useEffect } from 'react';
import GameCard from '@/components/GameCard';
import Button from '@/components/Button';
import ModalButton from '@/components/ModalButton';

function HudSectionHeader({ label }: { label: string }) {
  return (
    <View style={styles.hudHeader}>
      <View style={styles.hudLine} />
      <Text style={styles.hudLabel}>{label}</Text>
      <View style={styles.hudLine} />
    </View>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconRing}>
        <Ionicons name={label === 'Active' ? 'play-circle-outline' : 'checkmark-circle-outline'} size={28} color="rgba(176,114,187,0.35)" />
      </View>
      <Text style={styles.emptyStateText}>No {label.toLowerCase()} games</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { games, setActiveGame, deleteGame, createGame } = useGame();
  const router = useRouter();

  const [gameToDelete, setGameToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  const activeGames = games.filter(g => g.status === 'active');
  const completedGames = games.filter(g => g.status === 'completed');

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(enabled => {
      setReduceMotionEnabled(enabled ?? false);
    });

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotionEnabled
    );

    return () => {
      subscription.remove();
    };
  }, []);

  const handleGamePress = async (gameId: string) => {
    await setActiveGame(gameId);
    const game = games.find(g => g.id === gameId);
    if (game?.status === 'active') {
      router.push('/game/active' as any);
    } else {
      router.push('/game/summary' as any);
    }
  };

  const confirmDeleteGame = (game: { id: string; name: string }) => {
    setGameToDelete(game);
    setShowDeleteConfirmation(true);
  };

  const handleDeleteGame = async () => {
    if (!gameToDelete) return;

    try {
      await deleteGame(gameToDelete.id);
      setShowDeleteConfirmation(false);
      setGameToDelete(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete game. Please try again.');
      console.error('Error deleting game:', error);
    }
  };

  const handleCreateNewGame = async () => {
    try {
      await createGame('Untitled Game');
      router.push('/game/active' as any);
    } catch (error) {
      Alert.alert('Error', 'Failed to create game');
      console.error('Error creating game:', error);
    }
  };

  const renderCards = (
    gameList: typeof activeGames,
    isCompleted: boolean,
    startIndex: number = 0
  ) =>
    gameList.map((game, i) => (
      <GameCard
        key={game.id}
        game={game}
        onPress={handleGamePress}
        onDelete={confirmDeleteGame}
        isCompleted={isCompleted}
        reduceMotion={reduceMotionEnabled}
        entryIndex={startIndex + i}
      />
    ));

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Active Games Section */}
        <View style={styles.section}>
          <HudSectionHeader label="Active" />
          {activeGames.length === 0 ? (
            <EmptyState label="Active" />
          ) : (
            renderCards(activeGames, false, 0)
          )}
        </View>

        {/* Completed Games Section */}
        <View style={styles.section}>
          <HudSectionHeader label="History" />
          {completedGames.length === 0 ? (
            <EmptyState label="History" />
          ) : (
            renderCards(completedGames, true, activeGames.length)
          )}
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          onPress={handleCreateNewGame}
          title="+ New Game"
          variant="primary"
          fullWidth
          accessibilityHint="Creates a new poker game session"
        />
      </View>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteConfirmation}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteConfirmation(false)}
      >
        <GestureHandlerRootView style={{flex: 1}}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="warning" size={48} color="#C04657" style={styles.warningIcon} />
            <Text style={styles.modalTitle}>Delete Game?</Text>
            <Text style={styles.deleteWarningText}>
              Are you sure you want to delete "{gameToDelete?.name}"? This will remove all players,
              transactions, and settlements. This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <ModalButton
                variant="cancel"
                title="Cancel"
                onPress={() => {
                  setShowDeleteConfirmation(false);
                  setGameToDelete(null);
                }}
              />
              <ModalButton
                variant="destructive"
                title="Delete"
                onPress={handleDeleteGame}
              />
            </View>
          </View>
        </View>
        </GestureHandlerRootView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 28,
  },

  // HUD section header
  hudHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  hudLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2A2A2A',
  },
  hudLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#B072BB',
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptyIconRing: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(176,114,187,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.5,
  },
  emptyStateSubtext: {
    fontSize: 11,
    color: 'rgba(176,114,187,0.3)',
    letterSpacing: 2,
    marginTop: 4,
    fontFamily: 'SpaceMono',
  },

  // Actions bar
  actions: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 24,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
  },
  warningIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteWarningText: {
    fontSize: 15,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    backgroundColor: 'transparent',
  },
});
