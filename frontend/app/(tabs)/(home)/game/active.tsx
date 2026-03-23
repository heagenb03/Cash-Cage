import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, Animated, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView, Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from '@/components/Themed';
import { useGame } from '@/contexts/GameContext';
import { useRouter } from 'expo-router';
import { GameService } from '@/services/gameService';
import { getSettlements } from '@/services/settlementService';
import { Player, PlayerBalance, Validation } from '@/types/game';
import { getNetBalanceColor, formatNetBalanceDisplay } from '@/utils/formatUtils';
import { incrementProfileStats } from '@/services/firebaseService';
import { isValidNumericInput } from '@/utils/validationUtils';
import PlayerCardActive from '@/components/PlayerCardActive';
import PlayerCardCompleted from '@/components/PlayerCardCompleted';
import Button from '@/components/Button';
import ModalButton from '@/components/ModalButton';
import PaywallModal from '@/components/PaywallModal';
import { useAuth } from '@/contexts/AuthContext';
import { useReduceMotion } from '@/hooks/useReduceMotion';

function HudSectionHeader({ label, onAction, actionIcon }: { label: string; onAction?: () => void; actionIcon?: string }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReduceMotion();

  const animateScaleDown = useCallback((scaleValue: number = 0.945) => {
    if (!reduceMotion) {
      Animated.spring(scaleAnim, {
        toValue: scaleValue,
        tension: 300,
        friction: 20,
        useNativeDriver: true
      }).start();
    }
  }, [reduceMotion, scaleAnim]);

  const animateScaleUp = useCallback((velocity: number = 0) => {
    if (!reduceMotion) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 200,
        friction: 15,
        velocity,
        useNativeDriver: true
      }).start();
    }
  }, [reduceMotion, scaleAnim]);

  const handleTapSuccess = useCallback(() => {
    if (onAction) {
      onAction();
    }
  }, [onAction]);

  const tapGesture = useMemo(() => Gesture.Tap()
    .maxDuration(200)
    .maxDistance(10)
    .enabled(!!onAction)
    .onBegin(() => {
      runOnJS(animateScaleDown)(0.9);
    })
    .onFinalize((_, success) => {
      if (success) {
        runOnJS(handleTapSuccess)();
        runOnJS(animateScaleUp)(-0.5);
      } else {
        runOnJS(animateScaleUp)(0);
      }
    }), [onAction, animateScaleDown, animateScaleUp, handleTapSuccess]);

  return (
    <View style={styles.hudHeader}>
      <View style={styles.hudLines}>
        <View style={styles.hudLine} />
      </View>
      <Text style={styles.hudLabel}>{label}</Text>
      {onAction && actionIcon && (
        <GestureDetector gesture={tapGesture}>
          <Animated.View
            style={[
              styles.hudIconSlot,
              !reduceMotion && { transform: [{ scale: scaleAnim }] }
            ]}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Add player"
            accessibilityHint="Opens the add player dialog"
          >
            <Ionicons
              name={actionIcon as any}
              size={22}
              color="rgba(176,114,187,0.7)"
            />
          </Animated.View>
        </GestureDetector>
      )}
    </View>
  );
}

function EmptyState({ label, icon }: { label: string; icon: string }) {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconRing}>
        <Ionicons name={icon as any} size={28} color="rgba(176,114,187,0.35)" />
      </View>
      <Text style={styles.emptyStateText}>{label}</Text>
    </View>
  );
}

export default function ActiveGameScreen() {
  const { activeGame, updateGame, setActiveGame, createGame } = useGame();
  const { user, isPro } = useAuth();
  const router = useRouter();

  // Helper function to highlight critical values in error/warning messages
  const highlightCriticalValues = (message: string): React.ReactNode => {
    // Pattern matches: $XX.XX, player names (if any), numeric values
    const parts = message.split(/(\$[\d,]+\.?\d*|\d+\.\d+)/);

    return (
      <Text style={styles.completionModalErrorText}>
        {parts.map((part, index) => {
          // Check if part matches currency or decimal number pattern
          if (/^\$[\d,]+\.?\d*$/.test(part) || /^\d+\.\d+$/.test(part)) {
            return (
              <Text key={index} style={styles.criticalValue}>
                {part}
              </Text>
            );
          }
          return part;
        })}
      </Text>
    );
  };

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
  const reduceMotionEnabled = useReduceMotion();
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renamedPlayerName, setRenamedPlayerName] = useState('');
  const [showPaywall, setShowPaywall] = useState(false);

  // Game completion modal state
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionModalMode, setCompletionModalMode] = useState<'error' | 'warning' | 'confirm'>('confirm');
  const [validationResult, setValidationResult] = useState<Validation | null>(null);
  const [showSolvingModal, setShowSolvingModal] = useState(false);

  const handleCreateNewGame = async () => {
    try {
      await createGame('Untitled Game');
      // The useEffect or state update will automatically handle the active game change
    } catch (error) {
      Alert.alert('Error', 'Failed to create game');
      console.error('Error creating game:', error);
    }
  };

  // Calculate balances - must be before early return to avoid hooks error
  const balances = activeGame ? GameService.calculateBalances(activeGame) : [];

  const getPlayerBalance = (playerId: string): PlayerBalance | undefined => {
    return balances.find(b => b.playerId === playerId);
  };

  const openTransactionModal = useCallback((player: Player, type: 'buyin' | 'cashout') => {
    const balance = getPlayerBalance(player.id);

    // Block cashout if player has no buy-in
    if (type === 'cashout') {
      const currentBuyin = balance?.totalBuyins ?? 0;
      if (currentBuyin <= 0) {
        Alert.alert('Error', 'Player must have a buy-in before cashing out');
        return;
      }
    }

    const currentTotal = type === 'buyin'
      ? balance?.totalBuyins ?? 0
      : balance?.totalCashouts ?? 0;

    setSelectedPlayer(player);
    setTransactionType(type);
    setTransactionAmount(currentTotal.toString());
    setShowAddTransaction(true);
  }, [balances]);

  const handleBuyIn = useCallback((player: Player) => {
    openTransactionModal(player, 'buyin');
  }, [openTransactionModal]);

  const handleCashOut = useCallback((player: Player) => {
    openTransactionModal(player, 'cashout');
  }, [openTransactionModal]);

  const openRenameModal = useCallback((player: Player) => {
    setSelectedPlayer(player);
    setRenamedPlayerName(player.name);
    setShowRenameModal(true);
  }, []);

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

  const activePlayers = activeGame.players.filter(p => !p.completedAt);
  const completedPlayers = activeGame.players.filter(p => p.completedAt);

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) {
      Alert.alert('Error', 'Please enter a player name');
      return;
    }

    // Validate format before parsing (if buy-in provided)
    if (newPlayerBuyIn.trim() && !isValidNumericInput(newPlayerBuyIn)) {
      Alert.alert('Error', 'Please enter a valid numeric amount (digits and decimal point only) or leave it empty');
      return;
    }

    const buyInAmount = parseFloat(newPlayerBuyIn);
    if (newPlayerBuyIn.trim() && (isNaN(buyInAmount) || buyInAmount < 0)) {
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

    // Validate format before parsing
    if (!isValidNumericInput(transactionAmount)) {
      Alert.alert('Error', 'Please enter a valid numeric amount (digits and decimal point only)');
      return;
    }

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

    if (transactionType === 'buyin') {
      const currentCashout = playerBalance?.totalCashouts ?? 0;
      if (currentCashout > 0 && amount < currentCashout) {
        Alert.alert('Error', `Buy-in cannot be less than cash out of $${currentCashout.toFixed(2)}`);
        return;
      }
    }

    if (transactionType === 'cashout') {
      const currentBuyin = playerBalance?.totalBuyins ?? 0;
      if (currentBuyin <= 0) {
        Alert.alert('Error', 'Player must have a buy-in before cashing out');
        return;
      }
      // No upper limit constraint - players can cash out more than their buy-in when they win
    }

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

    setValidationResult(validation);

    // Determine modal mode based on validation
    if (!validation.isValid) {
      setCompletionModalMode('error');
    } else if (validation.warnings.length > 0) {
      setCompletionModalMode('warning');
    } else {
      setCompletionModalMode('confirm');
    }

    setShowCompletionModal(true);
  };

  const handleConfirmCompletion = async () => {
    try {
      GameService.completeGame(activeGame);
      await updateGame(activeGame);
      setShowCompletionModal(false);
      setShowSolvingModal(true);

      const balances = GameService.calculateBalances(activeGame);
      const result = await getSettlements(balances);

      GameService.cacheSettlements(activeGame, result);
      await updateGame(activeGame);

      // Fire-and-forget profile stat increment — after successful completion
      if (user?.uid) {
        const totalPot = balances.reduce((sum, b) => sum + b.totalBuyins, 0);
        const playerCount = activeGame.players.length;
        if (Number.isFinite(totalPot) && totalPot > 0 && playerCount > 0) {
          incrementProfileStats(user.uid, {
            gamesPlayed: 1,
            moneyTracked: Math.round(totalPot * 100) / 100,
            playersHosted: playerCount,
          }).catch(err => console.warn('Profile stats increment failed:', err));
        }
      }

      setShowSolvingModal(false);
      router.push('/game/summary' as any);
    } catch (error) {
      setShowSolvingModal(false);
      Alert.alert('Error', 'Failed to complete game. Please try again.');
      console.error('Error completing game:', error);
    }
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

  const handleRenamePlayer = async () => {
    if (!selectedPlayer) return;
    const trimmedName = renamedPlayerName.trim();
    if (!trimmedName) {
      Alert.alert('Error', 'Player name cannot be empty');
      return;
    }
    if (trimmedName !== selectedPlayer.name) {
      GameService.renamePlayer(activeGame!, selectedPlayer.id, trimmedName);
      await updateGame(activeGame!);
    }
    setShowRenameModal(false);
    setSelectedPlayer(null);
    setRenamedPlayerName('');
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
          <HudSectionHeader
            label="Players"
            onAction={() => {
              if (!isPro && activeGame.players.length >= 12) {
                setShowPaywall(true);
              } else {
                setShowAddPlayer(true);
              }
            }}
            actionIcon="add-circle-outline"
          />

          {activePlayers.length === 0 ? (
            <EmptyState label="No players yet" icon="person-outline" />
          ) : (
            activePlayers.map(player => {
              const balance = getPlayerBalance(player.id);
              return (
                <View key={player.id} style={{ marginBottom: 8, backgroundColor: 'transparent' }}>
                  <PlayerCardActive
                    player={player}
                    balance={balance}
                    onBuyIn={handleBuyIn}
                    onCashOut={handleCashOut}
                    onComplete={handleCompletePlayer}
                    onDelete={confirmDeletePlayer}
                    onRename={openRenameModal}
                    reduceMotion={reduceMotionEnabled}
                  />
                </View>
              );
            })
          )}
        </View>

        {/* Completed Players List */}
        {completedPlayers.length > 0 && (
          <View style={styles.section}>
            <HudSectionHeader label="Completed" />

            {completedPlayers.map(player => {
              const balance = getPlayerBalance(player.id);
              return (
                <View key={player.id} style={{ marginBottom: 8, backgroundColor: 'transparent' }}>
                  <PlayerCardCompleted
                    player={player}
                    balance={balance}
                    onReactivate={handleReactivatePlayer}
                    onDelete={confirmDeletePlayer}
                    reduceMotion={reduceMotionEnabled}
                  />
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Actions */}
      {activeGame.players.length > 1 && activeGame.transactions.length > 0 && (
        <View style={styles.actions}>
          <Button
            onPress={handleCompleteGame}
            title="Complete Game"
            variant="primary"
            fullWidth
            accessibilityHint="Finalize game and calculate settlements"
           />
        </View>
      )}

      {/* Add Player Modal */}
      <Modal
        visible={showAddPlayer}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddPlayer(false)}
      >
        <GestureHandlerRootView style={{flex: 1}}>
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
              placeholder="Buy-In"
              placeholderTextColor="#666"
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={handleAddPlayer}
            />
            <View style={styles.modalButtons}>
              <ModalButton
                variant="cancel"
                title="Cancel"
                onPress={() => {
                  setNewPlayerName('');
                  setNewPlayerBuyIn('');
                  setShowAddPlayer(false);
                }}
              />
              <ModalButton
                variant="confirm"
                title="Add"
                onPress={handleAddPlayer}
              />
            </View>
          </View>
        </View>
        </GestureHandlerRootView>
      </Modal>

      {/* Add Transaction Modal */}
      <Modal
        visible={showAddTransaction}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddTransaction(false)}
      >
        <GestureHandlerRootView style={{flex: 1}}>
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
              <ModalButton
                variant="cancel"
                title="Cancel"
                onPress={() => {
                  setTransactionAmount('');
                  setShowAddTransaction(false);
                  setSelectedPlayer(null);
                }}
              />
              <ModalButton
                variant="confirm"
                title="Confirm"
                onPress={handleAddTransaction}
              />
            </View>
          </View>
        </View>
        </GestureHandlerRootView>
      </Modal>

      {/* Rename Player Modal */}
      <Modal
        visible={showRenameModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowRenameModal(false);
          setSelectedPlayer(null);
          setRenamedPlayerName('');
        }}
      >
        <GestureHandlerRootView style={{flex: 1}}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rename Player</Text>
            <TextInput
              style={styles.input}
              value={renamedPlayerName}
              onChangeText={setRenamedPlayerName}
              placeholder="New name"
              placeholderTextColor="#666"
              autoFocus
              onSubmitEditing={handleRenamePlayer}
              returnKeyType="done"
            />
            <View style={styles.modalButtons}>
              <ModalButton
                variant="cancel"
                title="Cancel"
                onPress={() => {
                  setShowRenameModal(false);
                  setSelectedPlayer(null);
                  setRenamedPlayerName('');
                }}
              />
              <ModalButton
                variant="confirm"
                title="Save"
                onPress={handleRenamePlayer}
              />
            </View>
          </View>
        </View>
        </GestureHandlerRootView>
      </Modal>

      {/* Delete Player Confirmation Modal */}
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
            <Text style={styles.modalTitle}>Delete Player?</Text>
            <Text style={styles.deleteWarningText}>
              This will remove {playerToDelete?.name} and all their transactions from this game. 
              {'\n\n'}This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <ModalButton
                variant="cancel"
                title="Cancel"
                onPress={() => {
                  setShowDeleteConfirmation(false);
                  setPlayerToDelete(null);
                }}
              />
              <ModalButton
                variant="destructive"
                title="Delete"
                onPress={handleDeletePlayer}
              />
            </View>
          </View>
        </View>
        </GestureHandlerRootView>
      </Modal>

      {/* Game Completion Modal */}
      <Modal
        visible={showCompletionModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowCompletionModal(false)}
      >
        <GestureHandlerRootView style={{flex: 1}}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Dynamic Icon */}
              {completionModalMode === 'error' && (
                <Ionicons name="alert-circle" size={48} color="#C04657" style={styles.completionModalIcon} />
              )}
              {completionModalMode === 'warning' && (
                <Ionicons name="warning" size={48} color="#C04657" style={styles.completionModalIcon} />
              )}
              {completionModalMode === 'confirm' && (
                <Ionicons name="checkmark-circle" size={48} color="#00D66F" style={styles.completionModalIcon} />
              )}

              {/* Dynamic Title */}
              <Text style={styles.modalTitle}>
                {completionModalMode === 'error' ? 'Cannot Complete Game' :
                completionModalMode === 'warning' ? 'Warning' :
                'Complete Game'}
              </Text>

              {/* Dynamic Content */}
              {completionModalMode === 'error' && validationResult && (
                <>
                  {validationResult.errors.map((error, index) => (
                    <View key={index} style={{ backgroundColor: 'transparent' }}>
                      {highlightCriticalValues(error)}
                      {index < validationResult.errors.length - 1 && <View style={{ height: 22, backgroundColor: 'transparent' }} />}
                    </View>
                  ))}
                </>
              )}

              {completionModalMode === 'warning' && validationResult && (
                <>
                  {validationResult.warnings.map((warning, index) => (
                    <View key={index} style={{ backgroundColor: 'transparent' }}>
                      {highlightCriticalValues(warning)}
                      {index < validationResult.warnings.length - 1 && <View style={{ height: 12, backgroundColor: 'transparent' }} />}
                    </View>
                  ))}
                </>
              )}

              {completionModalMode === 'confirm' && (
                <Text style={styles.completionModalConfirmText}>
                  Are you sure you want to complete this game? This action cannot be undone.
                </Text>
              )}

              {/* Dynamic Buttons */}
              {completionModalMode === 'error' ? (
                <ModalButton
                  variant="cancel"
                  title="OK"
                  onPress={() => setShowCompletionModal(false)}
                  fullWidth
                />
              ) : (
                <View style={styles.modalButtons}>
                  <ModalButton
                    variant="cancel"
                    title="Cancel"
                    onPress={() => setShowCompletionModal(false)}
                  />
                  <ModalButton
                    variant={completionModalMode === 'warning' ? 'destructive' : 'success'}
                    title={completionModalMode === 'warning' ? 'Complete Anyway' : 'Complete'}
                    onPress={handleConfirmCompletion}
                  />
                </View>
              )}
            </View>
          </View>
        </GestureHandlerRootView>
      </Modal>

      {/* Paywall Modal — shown when free user tries to add an 11th player */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        triggerMessage="Upgrade to Pro for unlimited players per game."
      />

      {/* Solving Modal */}
      <Modal visible={showSolvingModal} animationType="fade" transparent onRequestClose={() => {}}>
        <GestureHandlerRootView style={{flex: 1}}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              {/* Spinner */}
              <ActivityIndicator size="large" color="#B072BB" style={{ marginBottom: 20 }} />

              {/* Title */}
              <Text style={styles.solvingTitle}>CALCULATING SETTLEMENTS</Text>

              {/* Status Bar */}
              <View style={styles.solvingStatusBar}>
                <View style={styles.solvingStatusDot} />
                <Text style={styles.solvingStatusText}>OPTIMIZING PAYMENT GRAPH</Text>
              </View>

              {/* Technical Subtext */}
              <Text style={styles.solvingSubtext}>Running MILP solver for minimal transfer solution</Text>
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
  header: {
    marginBottom: 24,
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
    marginBottom: 28,
    backgroundColor: 'transparent',
  },

  // HUD section header
  hudHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    backgroundColor: 'transparent',
  },
  hudLines: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
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
    paddingHorizontal: 10,
    backgroundColor: '#0A0A0A',
    zIndex: 1,
  },
  hudIconSlot: {
    position: 'absolute',
    right: 0,
    width: 32,
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 2,
    backgroundColor: '#0A0A0A',
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
  emptyText: {
    fontSize: 15,
    opacity: 0.4,
    textAlign: 'center',
    marginTop: 20,
    color: '#FFFFFF',
  },
  actions: {
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalContent: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  input: {
    width: '100%',
    backgroundColor: '#0A0A0A',
    borderRadius: 6,
    padding: 16,
    fontSize: 18,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    backgroundColor: 'transparent',
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
  completedActionButton: {
    backgroundColor: '#141414',
    borderColor: '#4A3C4A',
  },
  completedActionButtonText: {
    opacity: 0.6,
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
  completionModalIcon: {
    marginBottom: 16,
  },
  completionModalErrorText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  completionModalWarningText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 12,
  },
  criticalValue: {
    color: '#C04657',
    fontWeight: 'bold',
  },
  completionModalConfirmText: {
    fontSize: 15,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    opacity: 0.8,
  },
  completionModalSubtext: {
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    opacity: 0.6,
  },
  solvingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#B072BB',
    textTransform: 'uppercase',
    letterSpacing: 2.5,
    textAlign: 'center',
    marginBottom: 12,
  },
  solvingStatusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  solvingStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00D66F',
    shadowColor: '#00D66F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 2,
  },
  solvingStatusText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: 'rgba(176,114,187,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  solvingSubtext: {
    fontSize: 11,
    fontFamily: 'SpaceMono',
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center' as const,
    letterSpacing: 0.5,
  },
});
