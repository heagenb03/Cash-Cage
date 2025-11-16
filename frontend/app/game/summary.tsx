import React from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Share } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useGame } from '@/contexts/GameContext';
import { useRouter } from 'expo-router';
import { GameService } from '@/services/gameService';

export default function GameSummaryScreen() {
  const { activeGame } = useGame();
  const router = useRouter();
  
  if (!activeGame) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No active game.</Text>
      </View>
    );
  }
  
  const summary = GameService.generateGameSummary(activeGame);
  
  const handleShare = async () => {
    try {
      let message = `${activeGame.name} - Settlement Summary\n\n`;
      message += `Total Pot: $${summary.totalPot.toFixed(2)}\n\n`;
      message += `Settlements:\n`;

      if (summary.settlements.length === 0) {
        message += `All balanced! No settlements needed.\n`;
      } else {
        const settlementsByRecipient = summary.settlements.reduce<Record<string, { from: string; amount: number }[]>>(
          (acc, settlement) => {
            const { to, from, amount } = settlement;
            if (!acc[to]) {
              acc[to] = [];
            }
            acc[to].push({ from, amount });
            return acc;
          },
          {}
        );

        Object.entries(settlementsByRecipient).forEach(([recipient, incoming]) => {
          const details = incoming
            .map(({ from, amount }) => `$${amount.toFixed(2)} from ${from}`)
            .join(', ');
          message += `• ${recipient}: ${details}\n`;
        });
      }
      
      await Share.share({ message });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };
  
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Game Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{activeGame.name}</Text>
          <Text style={styles.subtitle}>
            {new Date(activeGame.date).toLocaleDateString()}
          </Text>
          <View style={styles.totalPotCard}>
            <Text style={styles.totalPotLabel}>Total Pot</Text>
            <Text style={styles.totalPotAmount}>${summary.totalPot.toFixed(2)}</Text>
          </View>
        </View>
        
        {/* Settlements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settlements</Text>
          <Text style={styles.sectionSubtitle}>
            {summary.settlements.length} payment{summary.settlements.length !== 1 ? 's' : ''}
          </Text>
          
          {summary.settlements.length === 0 ? (
            <Text style={styles.emptyText}>All balanced</Text>
          ) : (
            summary.settlements.map((settlement, index) => (
              <View key={index} style={styles.settlementCard}>
                <View style={styles.settlementInfo}>
                  <Text style={styles.settlementFrom}>{settlement.from}</Text>
                  <Text style={styles.settlementArrow}>→</Text>
                  <Text style={styles.settlementTo}>{settlement.to}</Text>
                </View>
                <Text style={styles.settlementAmount}>
                  ${settlement.amount.toFixed(2)}
                </Text>
              </View>
            ))
          )}
        </View>
        
        {/* Player Balances */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Final Balances</Text>
          {summary.balances.map(balance => (
            <View key={balance.playerId} style={styles.balanceCard}>
              <View style={styles.balanceInfo}>
                <Text style={styles.balanceName}>{balance.playerName}</Text>
                <Text style={styles.balanceDetail}>
                  In: ${balance.totalBuyins.toFixed(0)} • Out: ${balance.totalCashouts.toFixed(0)}
                </Text>
              </View>
              <Text style={[
                styles.balanceNet,
                { color: balance.netBalance >= 0 ? '#51A687' : '#C04657' }
              ]}>
                {balance.netBalance >= 0 ? '+' : ''}{balance.netBalance.toFixed(0)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
      
      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={handleShare}
        >
          <Text style={styles.shareButtonText}>Share Summary</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.doneButton}
          onPress={() => router.push('/')}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
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
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
    color: '#D4AF37',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.5,
    marginBottom: 24,
    color: '#FFFFFF',
  },
  totalPotCard: {
    backgroundColor: '#1A1A1A',
    padding: 28,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  totalPotLabel: {
    fontSize: 12,
    color: '#D4AF37',
    opacity: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  totalPotAmount: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#D4AF37',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#D4AF37',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    opacity: 0.5,
    marginBottom: 16,
    color: '#FFFFFF',
  },
  emptyText: {
    fontSize: 15,
    opacity: 0.4,
    textAlign: 'center',
    marginTop: 20,
    color: '#FFFFFF',
  },
  settlementCard: {
    backgroundColor: '#1A1A1A',
    padding: 14,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#D4AF37',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settlementInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: 'transparent',
  },
  settlementFrom: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  settlementArrow: {
    fontSize: 16,
    marginHorizontal: 10,
    opacity: 0.5,
    color: '#D4AF37',
  },
  settlementTo: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  settlementAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  balanceCard: {
    backgroundColor: '#1A1A1A',
    padding: 14,
    borderRadius: 6,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#D4AF37',
  },
  balanceInfo: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  balanceName: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
    color: '#FFFFFF',
  },
  balanceDetail: {
    fontSize: 13,
    opacity: 0.6,
    color: '#FFFFFF',
  },
  balanceNet: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  actions: {
    padding: 20,
    gap: 12,
  },
  shareButton: {
    backgroundColor: 'transparent',
    padding: 18,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2A2A2A',
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  doneButton: {
    backgroundColor: '#D4AF37',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#0A0A0A',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
