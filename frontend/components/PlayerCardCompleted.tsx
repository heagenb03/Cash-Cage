import React, { useRef, useCallback } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { Text, View } from '@/components/Themed';
import { Gesture, GestureDetector, TouchableOpacity } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Ionicons } from '@expo/vector-icons';
import { Player, PlayerBalance } from '@/types/game';
import { getNetBalanceColor, formatNetBalanceDisplay } from '@/utils/formatUtils';

interface PlayerCardCompletedProps {
  player: Player;
  balance: PlayerBalance | undefined;
  onReactivate: (player: Player) => void;
  onDelete: (player: Player) => void;
  reduceMotion: boolean;
}

const PlayerCardCompleted: React.FC<PlayerCardCompletedProps> = ({
  player,
  balance,
  onReactivate,
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

  // NOTE: PlayerCards don't navigate on tap - only show animation feedback
  const tapGesture = Gesture.Tap()
    .maxDuration(200)
    .maxDistance(10)
    .onBegin(() => runOnJS(animateScaleDown)())
    .onFinalize(() => {
      runOnJS(animateScaleUp)(0);  // No navigation, just animate back
    });

  const renderLeftActions = useCallback(() => (
    <TouchableOpacity
      style={styles.reactivateAction}
      onPress={() => onReactivate(player)}
      activeOpacity={0.8}
    >
      <Ionicons name="arrow-undo" size={22} color="rgba(76,175,80,0.85)" />
    </TouchableOpacity>
  ), [player, onReactivate]);

  const renderRightActions = useCallback(() => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={() => onDelete(player)}
      activeOpacity={0.8}
    >
      <Ionicons name="trash" size={22} color="rgba(192,70,87,0.85)" />
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
          accessibilityLabel={balance
            ? `${player.name}, Net: ${formatNetBalanceDisplay(balance.netBalance)}`
            : `${player.name}, No transaction data`
          }
          accessibilityHint="Swipe to reactivate or delete player"
          style={[
            styles.playerCard,
            !reduceMotion && { transform: [{ scale: scaleAnim }] }
          ]}
        >
          {balance ? (
            <View style={styles.completedContent}>
              <View style={styles.completedRow}>
                {/* Column 1: Name */}
                <View style={styles.completedNameColumn}>
                  <View>
                    <Text style={styles.completedName}>{player.name}</Text>
                  </View>
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
              <View>
                <Text style={styles.completedName}>{player.name}</Text>
              </View>
              <Text style={styles.completedInOut}>No transaction data</Text>
            </View>
          )}
        </Animated.View>
      </GestureDetector>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  playerCard: {
    backgroundColor: '#161616',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#242424',
    borderTopColor: 'rgba(176,114,187,0.15)',
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
  completedInOut: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.7,
    backgroundColor: 'transparent',
  },
  netBalanceHero: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  reactivateAction: {
    backgroundColor: '#141A14',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.25)',
  },
  deleteAction: {
    backgroundColor: '#1A1414',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(192,70,87,0.25)',
  },
});

export default React.memo(PlayerCardCompleted, (prevProps, nextProps) => {
  return (
    prevProps.player.id === nextProps.player.id &&
    prevProps.player.name === nextProps.player.name &&
    prevProps.balance?.totalBuyins === nextProps.balance?.totalBuyins &&
    prevProps.balance?.totalCashouts === nextProps.balance?.totalCashouts &&
    prevProps.balance?.netBalance === nextProps.balance?.netBalance &&
    prevProps.reduceMotion === nextProps.reduceMotion
  );
});
