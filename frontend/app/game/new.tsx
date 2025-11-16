import React, { useState } from 'react'; 
import { StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useGame } from '@/contexts/GameContext';
import { useRouter } from 'expo-router';

export default function NewGameScreen() {
  const [gameName, setGameName] = useState('');
  const { createGame, setActiveGame } = useGame();
  const router = useRouter();
  
  const handleCreateGame = async () => {
    if (!gameName.trim()) {
      Alert.alert('Error', 'Please enter a game name');
      return;
    }
    
    try {
      const newGame = await createGame(gameName.trim());
      // Game is now automatically set as active in createGame
      router.navigate('/game/active' as any);
    } catch (error) {
      Alert.alert('Error', 'Failed to create game');
      console.error('Error creating game:', error);
    }
  };
  
  const handleCancel = () => {
    router.back();
  };
  
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>New Game</Text>
        <Text style={styles.subtitle}>Track your game</Text>
        
        <View style={styles.form}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={gameName}
            onChangeText={setGameName}
            placeholder="Friday Night Poker"
            placeholderTextColor="#666"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleCreateGame}
          />
          
          <TouchableOpacity 
            style={styles.createButton}
            onPress={handleCreateGame}
          >
            <Text style={styles.createButtonText}>Create Game</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={handleCancel}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#D4AF37',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.6,
    marginBottom: 48,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#D4AF37',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 18,
    fontSize: 18,
    color: '#fff',
    borderWidth: 2,
    borderColor: '#2A2A2A',
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#D4AF37',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  createButtonText: {
    color: '#0A0A0A',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  cancelButton: {
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
});
