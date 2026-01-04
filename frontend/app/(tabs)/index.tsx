import { StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, AccessibilityInfo } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useGame } from '@/contexts/GameContext';
import { useRouter } from 'expo-router';
import { GameService } from '@/services/gameService';
import { Ionicons } from '@expo/vector-icons';
import { useState, useCallback, useEffect } from 'react';
import GameCard from '@/components/GameCard';
import Button from '@/components/Button';
import ModalButton from '@/components/ModalButton';

export default function HomeScreen() {
  const { games, activeGame, setActiveGame, deleteGame, createGame } = useGame();
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
      // Game is automatically set as active in createGame
      router.push('/game/active' as any);
    } catch (error) {
      Alert.alert('Error', 'Failed to create game');
      console.error('Error creating game:', error);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Active Games Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active</Text>
          {activeGames.length === 0 ? (
            <Text style={styles.emptyText}>No active games</Text>
          ) : (
            activeGames.map(game => (
              <GameCard
                key={game.id}
                game={game}
                onPress={handleGamePress}
                onDelete={confirmDeleteGame}
                isCompleted={false}
                reduceMotion={reduceMotionEnabled}
              />
            ))
          )}
        </View>
        
        {/* Completed Games Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>History</Text>
          {completedGames.length === 0 ? (
            <Text style={styles.emptyText}>No completed games</Text>
          ) : (
            completedGames.map(game => (
              <GameCard
                key={game.id}
                game={game}
                onPress={handleGamePress}
                onDelete={confirmDeleteGame}
                isCompleted={true}
                reduceMotion={reduceMotionEnabled}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          onPress={handleCreateNewGame}
          title="New Game"
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
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#B072BB',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  emptyText: {
    fontSize: 15,
    opacity: 0.4,
    textAlign: 'center',
    marginTop: 20,
    color: '#FFFFFF',
  },
  actions: {
    paddingVertical: 20,
    gap: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
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
