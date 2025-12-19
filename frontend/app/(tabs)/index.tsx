import { StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useGame } from '@/contexts/GameContext';
import { useRouter } from 'expo-router';
import { GameService } from '@/services/gameService';

export default function HomeScreen() {
  const { games, activeGame, setActiveGame, deleteGame, createGame } = useGame();
  const router = useRouter();
  
  const activeGames = games.filter(g => g.status === 'active');
  const completedGames = games.filter(g => g.status === 'completed');
  
  const handleGamePress = async (gameId: string) => {
    await setActiveGame(gameId);
    const game = games.find(g => g.id === gameId);
    if (game?.status === 'active') {
      router.push('/game/active' as any);
    } else {
      router.push('/game/summary' as any);
    }
  };
  
  const handleDeleteGame = (gameId: string, gameName: string) => {
    Alert.alert(
      'Delete Game',
      `Are you sure you want to delete "${gameName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteGame(gameId)
        }
      ]
    );
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

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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
              <TouchableOpacity
                key={game.id}
                style={styles.gameCard}
                onPress={() => handleGamePress(game.id)}
                onLongPress={() => handleDeleteGame(game.id, game.name)}
              >
                <View style={styles.gameCardHeader}>
                  <Text style={styles.gameCardTitle}>{game.name}</Text>
                  <Text style={styles.gameCardDate}>{formatDate(game.date)}</Text>
                </View>
                <Text style={styles.gameCardInfo}>
                  {game.players.length} players • {game.transactions.length} transactions
                </Text>
              </TouchableOpacity>
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
              <TouchableOpacity
                key={game.id}
                style={[styles.gameCard, styles.completedCard]}
                onPress={() => handleGamePress(game.id)}
                onLongPress={() => handleDeleteGame(game.id, game.name)}
              >
                <View style={styles.gameCardHeader}>
                  <Text style={styles.gameCardTitle}>{game.name}</Text>
                  <Text style={styles.gameCardDate}>{formatDate(game.date)}</Text>
                </View>
                <Text style={styles.gameCardInfo}>
                  {game.players.length} players • ${GameService.generateGameSummary(game).totalPot.toFixed(2)} pot
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
      
      {/* New Game Button */}
      <TouchableOpacity
        style={styles.newGameButton}
        onPress={handleCreateNewGame}
      >
        <Text style={styles.newGameButtonText}>New Game</Text>
      </TouchableOpacity>
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
  gameCard: {
    padding: 20,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: 'transparent',
    borderLeftWidth: 4,
    borderLeftColor: '#B072BB',
  },
  completedCard: {
    opacity: 0.6,
    borderLeftColor: '#666',
  },
  gameCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
    opacity: 0.6,
    color: '#B072BB',
  },
  newGameButton: {
    margin: 20,
    padding: 20,
    borderRadius: 8,
    backgroundColor: '#B072BB',
    alignItems: 'center',
  },
  newGameButtonText: {
    color: '#0A0A0A',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
