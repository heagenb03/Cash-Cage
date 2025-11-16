import React, { useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useGame } from '@/contexts/GameContext';
import { useRouter } from 'expo-router';
import { GameService } from '@/services/gameService';
import { Player, PlayerBalance } from '@/types/game';

export default function ActiveGameScreen() {
  const { activeGame, updateGame, setActiveGame } = useGame();
  const router = useRouter();
  
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionType, setTransactionType] = useState<'buyin' | 'cashout'>('buyin');
  
  if (!activeGame) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No active game. Please select or create a game.</Text>
        <TouchableOpacity 
          style={styles.button}
          onPress={() => router.push('/game/new')}
        >
          <Text style={styles.buttonText}>Create New Game</Text>
        </TouchableOpacity>
      </View>
    );
  }
  
  const balances = GameService.calculateBalances(activeGame);
  
  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) {
      Alert.alert('Error', 'Please enter a player name');
      return;
    }
    
    const player = GameService.addPlayer(activeGame, newPlayerName.trim());
    await updateGame(activeGame);
    setNewPlayerName('');
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
        'Game Data Warning',
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
  
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Game Info */}
        <View style={styles.header}>
          <Text style={styles.gameTitle}>{activeGame.name}</Text>
          <Text style={styles.gameInfo}>
            {new Date(activeGame.date).toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </Text>
        </View>
        
        {/* Players List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Players</Text>
            <TouchableOpacity onPress={() => setShowAddPlayer(true)}>
              <Text style={styles.addButton}>+</Text>
            </TouchableOpacity>
          </View>
          
          {activeGame.players.length === 0 ? (
            <Text style={styles.emptyText}>Add players to start</Text>
          ) : (
            activeGame.players.map(player => {
              const balance = getPlayerBalance(player.id);
              return (
                <View key={player.id} style={styles.playerCard}>
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
              );
            })
          )}
        </View>
        
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
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Player</Text>
            <TextInput
              style={styles.input}
              value={newPlayerName}
              onChangeText={setNewPlayerName}
              placeholder="Name"
              placeholderTextColor="#666"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setNewPlayerName('');
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
        </KeyboardAvoidingView>
      </Modal>
      
      {/* Add Transaction Modal */}
      <Modal
        visible={showAddTransaction}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddTransaction(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
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
        </KeyboardAvoidingView>
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
  gameTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#D4AF37',
    letterSpacing: 1,
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
    color: '#D4AF37',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  addButton: {
    fontSize: 28,
    color: '#D4AF37',
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
    marginBottom: 8,
    backgroundColor: '#1A1A1A',
    borderLeftWidth: 3,
    borderLeftColor: '#D4AF37',
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
    borderColor: '#D4AF37',
  },
  actionButtonText: {
    color: '#D4AF37',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  completeButton: {
    backgroundColor: '#D4AF37',
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
    backgroundColor: '#D4AF37',
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
    borderColor: '#2A2A2A',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#D4AF37',
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
    borderColor: '#2A2A2A',
  },
  confirmButton: {
    backgroundColor: '#D4AF37',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  confirmButtonText: {
    color: '#0A0A0A',
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
    borderColor: '#F4D03F',
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
    color: '#F4D03F',
    marginBottom: 4,
    lineHeight: 20,
  },
});
