import React, { useRef, useCallback } from 'react';
import { Animated, StyleSheet, TouchableOpacity as RNTouchableOpacity } from 'react-native';
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
          {/* Name row */}
          <View style={styles.cardHeader}>
            <View style={styles.nameRow}>
              <Text style={styles.playerName}>{player.name}</Text>
            </View>
          </View>

          {/* Data row — IN | OUT | NET */}
          {balance ? (
            <View style={styles.dataRow}>
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>In</Text>
                <Text style={styles.dataValue}>${balance.totalBuyins.toFixed(0)}</Text>
              </View>
              <View style={styles.dataDivider} />
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>Out</Text>
                <Text style={styles.dataValue}>${balance.totalCashouts.toFixed(0)}</Text>
              </View>
              <View style={styles.dataDivider} />
              <View style={styles.dataItem}>
                <Text style={styles.dataLabel}>Net</Text>
                <Text style={[
                  styles.dataValue,
                  { color: getNetBalanceColor(balance.netBalance) }
                ]}>
                  {formatNetBalanceDisplay(balance.netBalance)}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.dataRow}>
              <Text style={styles.noDataText}>No transaction data</Text>
            </View>
          )}
        </Animated.View>
      </GestureDetector>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  playerCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#242424',
    borderTopColor: 'rgba(176,114,187,0.15)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'transparent',
  },
  playerName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  nameEditIcon: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.4,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  dataItem: {
    flex: 1,
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
  },
  dataLabel: {
    fontSize: 9,
    color: 'rgba(176,114,187,0.65)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  dataValue: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'SpaceMono',
  },
  dataDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#2A2A2A',
    marginHorizontal: 12,
  },
  noDataText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontStyle: 'italic',
  },
  reactivateAction: {
    backgroundColor: '#141A14',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.25)',
    height: '100%',
  },
  deleteAction: {
    backgroundColor: '#1A1414',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(192,70,87,0.25)',
    height: '100%',
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
