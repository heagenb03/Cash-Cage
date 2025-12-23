import React, { useRef, memo } from 'react';
import { Animated, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';
import { TapGestureHandler, State, Swipeable, HandlerStateChangeEvent, TapGestureHandlerEventPayload } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
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

  const handleStateChange = (event: HandlerStateChangeEvent<TapGestureHandlerEventPayload>) => {
    const { state } = event.nativeEvent;

    switch (state) {
      case State.BEGAN:
        // Scale down animation (60-80ms feel)
        if (!reduceMotion) {
          Animated.spring(scaleAnim, {
            toValue: 0.975,
            tension: 300,
            friction: 20,
            useNativeDriver: true
          }).start();
        }
        break;

      case State.END:
        // Navigate immediately (0ms delay)
        onPress(game.id);

        // Scale up with micro-bounce (100-120ms feel)
        if (!reduceMotion) {
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 200,
            friction: 15,
            velocity: -0.5, // Creates overshoot
            useNativeDriver: true
          }).start();
        }
        break;

      case State.FAILED:
      case State.CANCELLED:
        // Spring back without navigating
        if (!reduceMotion) {
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 200,
            friction: 15,
            useNativeDriver: true
          }).start();
        }
        break;
    }
  };

  return (
    <Swipeable
      renderRightActions={() => (
        <TouchableOpacity
          style={styles.deleteAction}
          onPress={() => onDelete({ id: game.id, name: game.name })}
          activeOpacity={0.8}
        >
          <Ionicons name="trash" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
      overshootLeft={false}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
    >
      <TapGestureHandler
        onHandlerStateChange={handleStateChange}
        maxDurationMs={200}
        maxDist={10}
      >
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
          <View style={styles.gameCardHeader}>
            <Text style={styles.gameCardTitle}>{game.name}</Text>
            <Text style={styles.gameCardDate}>{formatDate(game.date)}</Text>
          </View>
          <Text style={styles.gameCardInfo}>
            {isCompleted
              ? `${game.players.length} players • $${GameService.generateGameSummary(game).totalPot.toFixed(2)} pot`
              : `${game.players.length} players • ${game.transactions.length} transactions`
            }
          </Text>
        </Animated.View>
      </TapGestureHandler>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  gameCard: {
    padding: 20,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#1A1A1A',
  },
  completedCard: {
    backgroundColor: '#121212',
  },
  gameCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'transparent',
  },
  gameCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  gameCardDate: {
    fontSize: 13,
    opacity: 0.5,
    color: '#FFFFFF',
  },
  gameCardInfo: {
    fontSize: 13,
    opacity: 0.8,
    color: '#B072BB',
  },
  deleteAction: {
    backgroundColor: '#C04657',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 6,
    marginBottom: 12,
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
