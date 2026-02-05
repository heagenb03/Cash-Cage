import React, { useRef, useCallback } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View as RNView } from 'react-native';
import { Text, View } from '@/components/Themed';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Ionicons } from '@expo/vector-icons';
import { Game } from '@/types/game';
import { GameService } from '@/services/gameService';

interface GameCardProps {
  game: Game;
  onPress: (gameId: string) => void;
  onDelete: (game: { id: string; name: string }) => void;
  isCompleted?: boolean;
  reduceMotion: boolean;
}

const GameCard: React.FC<GameCardProps> = ({ game, onPress, onDelete, isCompleted = false, reduceMotion }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

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

  const handleTapSuccess = useCallback(() => {
    onPress(game.id);
  }, [onPress, game.id]);

  const tapGesture = Gesture.Tap()
    .maxDuration(200)
    .maxDistance(10)
    .onBegin(() => {
      runOnJS(animateScaleDown)();
    })
    .onFinalize((_, success) => {
      if (success) {
        runOnJS(handleTapSuccess)();
        runOnJS(animateScaleUp)(-0.5);
      } else {
        runOnJS(animateScaleUp)(0);
      }
    });

  const totalPot = GameService.generateGameSummary(game).totalPot;

  return (
    <Swipeable
      renderRightActions={() => (
        <TouchableOpacity
          style={styles.deleteAction}
          onPress={() => onDelete({ id: game.id, name: game.name })}
          activeOpacity={0.8}
        >
          <Ionicons name="trash" size={22} color="rgba(192,70,87,0.85)" />
        </TouchableOpacity>
      )}
      overshootLeft={false}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
    >
      <GestureDetector gesture={tapGesture}>
        <Animated.View
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`${game.name}, ${formatDate(game.date)}, ${game.players.length} players`}
          accessibilityHint={isCompleted ? "View game summary" : "Open active game"}
          style={[
            styles.gameCard,
            isCompleted && styles.completedCard,
            !reduceMotion && { transform: [{ scale: scaleAnim }] }
          ]}
        >
          <RNView style={styles.gameCardHeader}>
            <Text style={styles.gameCardTitle}>{game.name}</Text>
            {isCompleted && <Ionicons name="checkmark-circle" size={18} color="rgba(176,114,187,0.5)" />}
          </RNView>

          {/* Data row */}
          <RNView style={styles.dataRow}>
            <RNView style={styles.dataItem}>
              <Text style={styles.dataLabel}>Players</Text>
              <Text style={styles.dataValue}>{game.players.length}</Text>
            </RNView>
            <RNView style={styles.dataDivider} />
            <RNView style={styles.dataItem}>
              <Text style={styles.dataLabel}>Pot</Text>
              <Text style={styles.dataValue}>${totalPot.toFixed(0)}</Text>
            </RNView>
            <RNView style={styles.dataDivider} />
            <RNView style={styles.dataItem}>
              <Text style={styles.dataLabel}>Date</Text>
              <Text style={styles.dataValue}>{formatDate(game.date)}</Text>
            </RNView>
          </RNView>
        </Animated.View>
      </GestureDetector>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  gameCard: {
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#242424',
    borderTopColor: 'rgba(176,114,187,0.2)',
  },
  completedCard: {
    backgroundColor: '#111111',
    borderTopColor: 'rgba(176,114,187,0.1)',
  },
  gameCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  gameCardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  dataItem: {
    flex: 1,
    alignItems: 'flex-start',
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
  deleteAction: {
    backgroundColor: '#1A1414',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(192,70,87,0.25)',
  },
});

export default React.memo(GameCard, (prevProps, nextProps) => {
  return (
    prevProps.game.id === nextProps.game.id &&
    prevProps.game.name === nextProps.game.name &&
    prevProps.game.date === nextProps.game.date &&
    prevProps.game.players.length === nextProps.game.players.length &&
    prevProps.game.transactions.length === nextProps.game.transactions.length &&
    prevProps.reduceMotion === nextProps.reduceMotion &&
    prevProps.isCompleted === nextProps.isCompleted
  );
});
