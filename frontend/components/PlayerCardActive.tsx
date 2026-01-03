import React, { useRef, useCallback } from 'react';
import { Animated, StyleSheet, TouchableOpacity as RNTouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';
import { Gesture, GestureDetector, TouchableOpacity } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Ionicons } from '@expo/vector-icons';
import { Player, PlayerBalance } from '@/types/game';

interface PlayerCardActiveProps {
  player: Player;
  balance: PlayerBalance | undefined;
  onBuyIn: (player: Player) => void;
  onCashOut: (player: Player) => void;
  onComplete: (player: Player) => void;
  onDelete: (player: Player) => void;
  reduceMotion: boolean;
}

const PlayerCardActive: React.FC<PlayerCardActiveProps> = ({
  player,
  balance,
  onBuyIn,
  onCashOut,
  onComplete,
  onDelete,
  reduceMotion
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const animateScaleDown = useCallback(() => {
    if (!reduceMotion) {
      Animated.spring(scaleAnim, {
        toValue: 0.975,
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

  const tapGesture = Gesture.Tap()
    .maxDuration(200)
    .maxDistance(10)
    .onBegin(() => runOnJS(animateScaleDown)())
    .onFinalize(() => {
      runOnJS(animateScaleUp)(0);
    });

  const renderLeftActions = useCallback(() => (
    <TouchableOpacity
      style={styles.completeAction}
      onPress={() => onComplete(player)}
      activeOpacity={0.8}
    >
      <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
    </TouchableOpacity>
  ), [player, onComplete]);

  const renderRightActions = useCallback(() => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={() => onDelete(player)}
      activeOpacity={0.8}
    >
      <Ionicons name="trash" size={24} color="#FFFFFF" />
    </TouchableOpacity>
  ), [player, onDelete]);

  return (
    <Swipeable
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      overshootLeft={false}
      overshootRight={false}
      friction={2}
      leftThreshold={40}
      rightThreshold={40}
    >
      <GestureDetector gesture={tapGesture}>
        <Animated.View
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`${player.name}, Buy-in: $${balance?.totalBuyins ?? 0}, Cash out: $${balance?.totalCashouts ?? 0}`}
          accessibilityHint="Double tap to view player details. Swipe for actions."
          style={[
            styles.playerCard,
            !reduceMotion && { transform: [{ scale: scaleAnim }] }
          ]}
        >
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
            <RNTouchableOpacity
              style={styles.actionButton}
              onPress={() => onBuyIn(player)}
            >
              <Text style={styles.actionButtonText}>Buy-in</Text>
            </RNTouchableOpacity>
            <RNTouchableOpacity
              style={styles.actionButton}
              onPress={() => onCashOut(player)}
            >
              <Text style={styles.actionButtonText}>Cash Out</Text>
            </RNTouchableOpacity>
          </View>
        </Animated.View>
      </GestureDetector>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
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
  completeAction: {
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: 6,
  },
  deleteAction: {
    backgroundColor: '#C04657',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: 6,
  },
});

export default React.memo(PlayerCardActive, (prevProps, nextProps) => {
  return (
    prevProps.player.id === nextProps.player.id &&
    prevProps.player.name === nextProps.player.name &&
    prevProps.balance?.totalBuyins === nextProps.balance?.totalBuyins &&
    prevProps.balance?.totalCashouts === nextProps.balance?.totalCashouts &&
    prevProps.reduceMotion === nextProps.reduceMotion
  );
});
