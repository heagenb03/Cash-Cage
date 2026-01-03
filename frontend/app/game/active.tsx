import React, { useState, useCallback } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from '@/components/Themed';
import { useGame } from '@/contexts/GameContext';
import { useRouter } from 'expo-router';
import { GameService } from '@/services/gameService';
import { Player, PlayerBalance } from '@/types/game';
import { getNetBalanceColor, formatNetBalanceDisplay } from '@/utils/formatUtils';

export default function ActiveGameScreen() {
  const { activeGame, updateGame, setActiveGame, createGame } = useGame();
  const router = useRouter();

  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerBuyIn, setNewPlayerBuyIn] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionType, setTransactionType] = useState<'buyin' | 'cashout'>('buyin');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const handleCreateNewGame = async () => {
    try {
      await createGame('Untitled Game');
      // The useEffect or state update will automatically handle the active game change
    } catch (error) {
      Alert.alert('Error', 'Failed to create game');
      console.error('Error creating game:', error);
    }
  };

  if (!activeGame) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No active game. Please select or create a game.</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={handleCreateNewGame}
        >
          <Text style={styles.buttonText}>Create New Game</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  const balances = GameService.calculateBalances(activeGame);

  const activePlayers = activeGame.players.filter(p => !p.completedAt);
  const completedPlayers = activeGame.players.filter(p => p.completedAt);

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) {
      Alert.alert('Error', 'Please enter a player name');
      return;
    }
    
    const buyInAmount = parseFloat(newPlayerBuyIn);
    if (newPlayerBuyIn.trim() && (isNaN(buyInAmount) || buyInAmount <= 0)) {
      Alert.alert('Error', 'Please enter a valid buy-in amount or leave it empty');
      return;
    }
    
    const player = GameService.addPlayer(activeGame, newPlayerName.trim());
    
    // Add initial buy-in if amount was provided
    if (!isNaN(buyInAmount) && buyInAmount > 0) {
      GameService.addTransaction(activeGame, player.id, 'buyin', buyInAmount);
    }
    
    await updateGame(activeGame);
    setNewPlayerName('');
    setNewPlayerBuyIn('');
    setShowAddPlayer(false);
  };
  
  const handleAddTransaction = async () => {
    if (!selectedPlayer) return;

    const amount = parseFloat(transactionAmount);
    if (isNaN(amount) || amount < 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const playerBalance = GameService
      .calculateBalances(activeGame)
      .find(balance => balance.playerId === selectedPlayer.id);

    const currentTotal = transactionType === 'buyin'
      ? playerBalance?.totalBuyins ?? 0
      : playerBalance?.totalCashouts ?? 0;

    if (amount === currentTotal) {
      setTransactionAmount('');
      setShowAddTransaction(false);
      setSelectedPlayer(null);
      return;
    }

    GameService.setPlayerTransactionTotal(activeGame, selectedPlayer.id, transactionType, amount);
    await updateGame(activeGame);
    setTransactionAmount('');
    setShowAddTransaction(false);
    setSelectedPlayer(null);
  };
  
  const handleCompleteGame = () => {
    const balances = GameService.calculateBalances(activeGame);
    const validation = GameService.validateGame(balances);
    
    if (!validation.isValid) {
      Alert.alert(
        'Cannot Complete Game',
        `Please fix the following issues:\n\n${validation.errors.join('\n\n')}`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    if (validation.warnings.length > 0) {
      Alert.alert(
        'Warning',
        `The following issues were detected:\n\n${validation.warnings.join('\n\n')}\n\nDo you want to complete the game anyway?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Complete Anyway',
            style: 'destructive',
            onPress: async () => {
              try {
                GameService.completeGame(activeGame);
                await updateGame(activeGame);
                router.push('/game/summary' as any);
              } catch (error) {
                Alert.alert('Error', 'Failed to complete game. Please try again.');
                console.error('Error completing game:', error);
              }
            }
          }
        ]
      );
      return;
    }
    
    Alert.alert(
      'Complete Game',
      'Are you sure you want to complete this game? You can view settlements afterward.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              GameService.completeGame(activeGame);
              await updateGame(activeGame);
              router.push('/game/summary' as any);
            } catch (error) {
              Alert.alert('Error', 'Failed to complete game. Please try again.');
              console.error('Error completing game:', error);
            }
          }
        }
      ]
    );
  };
  
  const openTransactionModal = (player: Player, type: 'buyin' | 'cashout') => {
    const balance = getPlayerBalance(player.id);
    const currentTotal = type === 'buyin'
      ? balance?.totalBuyins ?? 0
      : balance?.totalCashouts ?? 0;

    setSelectedPlayer(player);
    setTransactionType(type);
    setTransactionAmount(currentTotal.toString());
    setShowAddTransaction(true);
  };
  
  const getPlayerBalance = (playerId: string): PlayerBalance | undefined => {
    return balances.find(b => b.playerId === playerId);
  };

  const handleTitlePress = () => {
    setEditedTitle(activeGame.name);
    setIsEditingTitle(true);
  };

  const handleTitleBlur = async () => {
    const trimmedTitle = editedTitle.trim();

    // Validation: empty title
    if (!trimmedTitle) {
      Alert.alert('Error', 'Game name cannot be empty');
      setEditedTitle(activeGame.name);
      setIsEditingTitle(false);
      return;
    }

    // Only update if changed
    if (trimmedTitle !== activeGame.name) {
      activeGame.name = trimmedTitle;
      await updateGame(activeGame);
    }

    setIsEditingTitle(false);
  };

  const renderRightActions = useCallback((player: Player) => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => confirmDeletePlayer(player)}
        activeOpacity={0.8}
      >
        <Ionicons name="trash" size={24} color="#FFFFFF" />
      </TouchableOpacity>
    );
  }, []);

  const renderLeftActions = useCallback((player: Player) => {
    const isCompleted = !!player.completedAt;

    if (isCompleted) {
      return (
        <TouchableOpacity
          style={styles.reactivateAction}
          onPress={() => handleReactivatePlayer(player)}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-undo" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      );
    } else {
      return (
        <TouchableOpacity
          style={styles.completeAction}
          onPress={() => handleCompletePlayer(player)}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      );
    }
  }, []);

  const confirmDeletePlayer = (player: Player) => {
    setPlayerToDelete(player);
    setShowDeleteConfirmation(true);
  };

  const handleDeletePlayer = async () => {
    if (!playerToDelete || !activeGame) return;

    try {
      GameService.removePlayer(activeGame, playerToDelete.id);
      await updateGame(activeGame);

      setShowDeleteConfirmation(false);
      setPlayerToDelete(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete player. Please try again.');
      console.error('Error deleting player:', error);
    }
  };

  const handleCompletePlayer = async (player: Player) => {
    if (!activeGame) return;

    try {
      GameService.markPlayerAsCompleted(activeGame, player.id);
      await updateGame(activeGame);
    } catch (error) {
      Alert.alert('Error', 'Failed to mark player as completed. Please try again.');
      console.error('Error completing player:', error);
    }
  };

  const handleReactivatePlayer = async (player: Player) => {
    if (!activeGame) return;

    try {
      GameService.markPlayerAsActive(activeGame, player.id);
      await updateGame(activeGame);
    } catch (error) {
      Alert.alert('Error', 'Failed to reactivate player. Please try again.');
      console.error('Error reactivating player:', error);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Game Info */}
        <View style={styles.header}>
          {isEditingTitle ? (
            <TextInput
              style={styles.gameTitleInput}
              value={editedTitle}
              onChangeText={setEditedTitle}
              onBlur={handleTitleBlur}
              onSubmitEditing={handleTitleBlur}
              autoFocus
              returnKeyType="done"
              maxLength={50}
              placeholder="Game name"
              placeholderTextColor="#666"
            />
          ) : (
            <TouchableOpacity onPress={handleTitlePress} activeOpacity={0.7}>
              <View style={styles.titleContainer}>
                <Text style={styles.gameTitle}>{activeGame.name}</Text>
                <Text style={styles.editIcon}>✎</Text>
              </View>
            </TouchableOpacity>
          )}
          <Text style={styles.gameInfo}>
            {new Date(activeGame.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            })}
          </Text>
        </View>
        
        {/* Active Players List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Players</Text>
            <TouchableOpacity onPress={() => setShowAddPlayer(true)}>
              <Text style={styles.addButton}>+</Text>
            </TouchableOpacity>
          </View>

          {activePlayers.length === 0 ? (
            <Text style={styles.emptyText}>Add players to start</Text>
          ) : (
            activePlayers.map(player => {
              const balance = getPlayerBalance(player.id);
              return (
                <View key={player.id} style={{ marginBottom: 8 }}>
                  <Swipeable
                    renderLeftActions={() => renderLeftActions(player)}
                    renderRightActions={() => renderRightActions(player)}
                    overshootLeft={false}
                    overshootRight={false}
                    friction={2}
                    leftThreshold={40}
                    rightThreshold={40}
                  >
                    <View style={styles.playerCard}>
                      <View style={styles.playerInfo}>
                        <Text style={styles.playerName}>{player.name}</Text>
                        {balance && (
                          <View style={styles.playerStats}>
                            <Text style={styles.statText}>
                              In: ${balance.totalBuyins.toFixed(0)} • Out: ${balance.totalCashouts.toFixed(0)}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.playerActions}>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => openTransactionModal(player, 'buyin')}
                        >
                          <Text style={styles.actionButtonText}>Buy-in</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => openTransactionModal(player, 'cashout')}
                        >
                          <Text style={styles.actionButtonText}>Cash Out</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Swipeable>
                </View>
              );
            })
          )}
        </View>

        {/* Completed Players List */}
        {completedPlayers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Completed Players</Text>
            </View>

            {completedPlayers.map(player => {
              const balance = getPlayerBalance(player.id);
              return (
                <View key={player.id} style={{ marginBottom: 8 }}>
                  <Swipeable
                    key={player.id}
                    renderLeftActions={() => renderLeftActions(player)}
                    renderRightActions={() => renderRightActions(player)}
                    overshootLeft={false}
                    overshootRight={false}
                    friction={2}
                    leftThreshold={40}
                    rightThreshold={40}
                  >
                    <View style={[styles.playerCard, styles.completedCardHero]}>
                      {balance ? (
                        <View style={styles.completedContent}>
                          <View style={styles.completedRow}>
                            {/* Column 1: Name */}
                            <View style={styles.completedNameColumn}>
                              <Text style={styles.completedName}>{player.name}</Text>
                            </View>

                            {/* Column 2: In/Out (stacked vertically, centered) */}
                            <View style={styles.completedInOutColumn}>
                              <Text style={styles.completedInOut}>In ${balance.totalBuyins.toFixed(0)}</Text>
                              <Text style={styles.completedInOut}>Out ${balance.totalCashouts.toFixed(0)}</Text>
                            </View>

                            {/* Column 3: Net Balance (right-aligned) */}
                            <View style={styles.completedNetColumn}>
                              <Text style={[
                                styles.netBalanceHero,
                                { color: getNetBalanceColor(balance.netBalance) }
                              ]}>
                                {formatNetBalanceDisplay(balance.netBalance)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.completedContent}>
                          <Text style={styles.completedName}>{player.name}</Text>
                          <Text style={styles.completedInOut}>No transaction data</Text>
                        </View>
                      )}
                    </View>
                  </Swipeable>
                </View>
              );
            })}
          </View>
        )}
        
        {/* Complete Game Button */}
        {activeGame.players.length > 1 && activeGame.transactions.length > 0 && (
          <TouchableOpacity 
            style={styles.completeButton}
            onPress={handleCompleteGame}
          >
            <Text style={styles.completeButtonText}>Complete Game</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
      
      {/* Add Player Modal */}
      <Modal
        visible={showAddPlayer}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddPlayer(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Player</Text>
            <TextInput
              style={styles.input}
              value={newPlayerName}
              onChangeText={setNewPlayerName}
              placeholder="Name"
              placeholderTextColor="#666"
              autoFocus
              returnKeyType="next"
            />
            <TextInput
              style={styles.input}
              value={newPlayerBuyIn}
              onChangeText={setNewPlayerBuyIn}
              placeholder="Initial Buy-in"
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={handleAddPlayer}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setNewPlayerName('');
                  setNewPlayerBuyIn('');
                  setShowAddPlayer(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAddPlayer}
              >
                <Text style={styles.confirmButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Add Transaction Modal */}
      <Modal
        visible={showAddTransaction}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddTransaction(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {transactionType === 'buyin' ? 'Buy-in' : 'Cash Out'} - {selectedPlayer?.name}
            </Text>
            <TextInput
              style={styles.input}
              value={transactionAmount}
              onChangeText={setTransactionAmount}
              placeholder="Amount"
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setTransactionAmount('');
                  setShowAddTransaction(false);
                  setSelectedPlayer(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleAddTransaction}
              >
                <Text style={styles.confirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Player Confirmation Modal */}
      <Modal
        visible={showDeleteConfirmation}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteConfirmation(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="warning" size={48} color="#C04657" style={styles.warningIcon} />
            <Text style={styles.modalTitle}>Delete Player?</Text>
            <Text style={styles.deleteWarningText}>
              This will remove {playerToDelete?.name} and all their transactions from this game. This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowDeleteConfirmation(false);
                  setPlayerToDelete(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteConfirmButton]}
                onPress={handleDeletePlayer}
              >
                <Text style={styles.deleteConfirmButtonText}>Delete</Text>
              </TouchableOpacity>
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
  header: {
    marginBottom: 32,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    backgroundColor: 'transparent',
  },
  gameTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#B072BB',
    letterSpacing: 1,
  },
  gameTitleInput: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#B072BB',
    letterSpacing: 1,
    textAlign: 'left',
    borderBottomWidth: 2,
    borderBottomColor: '#B072BB',
    paddingBottom: 4,
    marginBottom: 4,
    minWidth: 200,
  },
  editIcon: {
    fontSize: 20,
    color: '#B072BB',
    opacity: 0.5,
    marginBottom: 4,
  },
  gameInfo: {
    fontSize: 14,
    opacity: 0.5,
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#B072BB',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  addButton: {
    fontSize: 28,
    color: '#B072BB',
    fontWeight: '300',
  },
  emptyText: {
    fontSize: 15,
    opacity: 0.4,
    textAlign: 'center',
    marginTop: 20,
    color: '#FFFFFF',
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 6,
    backgroundColor: '#1A1A1A',
  },
  playerInfo: {
    flex: 1,
    marginRight: 12,
    backgroundColor: 'transparent',
  },
  playerName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  playerStats: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
  },
  statText: {
    fontSize: 13,
    opacity: 0.6,
    color: '#FFFFFF',
  },
  playerActions: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'transparent',
  },
  actionButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 4,
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#B072BB',
  },
  actionButtonText: {
    color: '#B072BB',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  completeButton: {
    backgroundColor: '#B072BB',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  completeButtonText: {
    color: '#0A0A0A',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  button: {
    backgroundColor: '#B072BB',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    margin: 20,
  },
  buttonText: {
    color: '#0A0A0A',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.9)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#5A5A5A',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#B072BB',
  },
  input: {
    width: '100%',
    backgroundColor: '#0A0A0A',
    borderRadius: 6,
    padding: 18,
    fontSize: 18,
    color: '#fff',
    borderWidth: 2,
    borderColor: '#2A2A2A',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    backgroundColor: 'transparent',
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#C04657',
  },
  confirmButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#B072BB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#C04657',
  },
  confirmButtonText: {
    color: '#B072BB',
    fontSize: 16,
    fontWeight: 'bold',
  },
  validationBox: {
    flexDirection: 'row',
    backgroundColor: '#2A0A0A',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#FF3B5C',
  },
  validationWarningBox: {
    backgroundColor: '#2A1A0A',
    borderColor: '#B072BB',
  },
  validationIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  validationContent: {
    flex: 1,
  },
  validationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#fff',
  },
  validationError: {
    fontSize: 14,
    color: '#FF3B5C',
    marginBottom: 4,
    lineHeight: 20,
  },
  validationWarning: {
    fontSize: 14,
    color: '#B072BB',
    marginBottom: 4,
    lineHeight: 20,
  },
  deleteAction: {
    backgroundColor: '#C04657',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 6,
  },
  completeAction: {
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 6,
  },
  reactivateAction: {
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 6,
  },
  completedActionButton: {
    backgroundColor: '#141414',
    borderColor: '#4A3C4A',
  },
  completedActionButtonText: {
    opacity: 0.6,
  },
  completedCardHero: {
    backgroundColor: '#121212',
    height: 70,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  completedContent: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    gap: 8,
  },
  completedNameColumn: {
    flex: 1.5,
    backgroundColor: 'transparent',
    justifyContent: 'center',
  },
  completedInOutColumn: {
    flex: 1.5,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  completedInOut: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.7,
    backgroundColor: 'transparent',
  },
  completedNetColumn: {
    flex: 1.5,
    backgroundColor: 'transparent',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  completedName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.7,
  },
  netBalanceHero: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  completeConfirmButton: {
    backgroundColor: '#4CAF50',
    borderWidth: 0,
  },
  completeConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  warningIcon: {
    marginBottom: 16,
  },
  deleteWarningText: {
    fontSize: 15,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    opacity: 0.8,
  },
  deleteConfirmButton: {
    backgroundColor: '#C04657',
    borderWidth: 0,
  },
  deleteConfirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
