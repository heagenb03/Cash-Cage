import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Share, ActivityIndicator } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useGame } from '@/contexts/GameContext';
import { useRouter } from 'expo-router';
import { GameService } from '@/services/gameService';
import { getSettlements } from '@/services/settlementService';
import { PlayerBalance, SettlementResult } from '@/types/game';

export default function GameSummaryScreen() {
  const { activeGame } = useGame();
  const router = useRouter();
  const summary = useMemo(
    () => (activeGame ? GameService.generateGameSummary(activeGame) : null),
    [activeGame]
  );
  const [settlementResult, setSettlementResult] = useState<SettlementResult | null>(() =>
    summary
      ? {
          settlements: summary.settlements,
          ...summary.settlementMeta,
        }
      : null
  );
  const [isLoadingSettlements, setIsLoadingSettlements] = useState(false);
  const [lastError, setLastError] = useState<string | undefined>();
  const balancesRef = useRef<PlayerBalance[]>(summary?.balances ?? []);

  useEffect(() => {
    balancesRef.current = summary?.balances ?? [];
  }, [summary]);

  useEffect(() => {
    if (!summary) {
      setSettlementResult(null);
      return;
    }

    let cancelled = false;
    setSettlementResult({
      settlements: summary.settlements,
      ...summary.settlementMeta,
    });
    setIsLoadingSettlements(true);
    setLastError(undefined);

    (async () => {
      try {
        const result = await getSettlements(summary.balances);
        if (cancelled) {
          return;
        }
        setSettlementResult(result);
        if (result.source !== 'server') {
          setLastError(result.error ?? 'Using on-device fallback');
        } else {
          setLastError(undefined);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        const message = error instanceof Error ? error.message : 'unknown-error';
        setLastError(message);
        setSettlementResult(prev =>
          prev ?? {
            settlements: summary.settlements,
            ...summary.settlementMeta,
            error: message,
          }
        );
      } finally {
        if (!cancelled) {
          setIsLoadingSettlements(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [summary?.game.id]);

  const handleRetry = async () => {
    if (!summary) {
      return;
    }

    setIsLoadingSettlements(true);
    setLastError(undefined);
    try {
      const result = await getSettlements(balancesRef.current, { timeoutMs: 5000 });
      setSettlementResult(result);
      if (result.source !== 'server') {
        setLastError(result.error ?? 'Using on-device fallback');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown-error';
      setLastError(message);
      setSettlementResult(prev =>
        prev ?? {
          settlements: summary.settlements,
          ...summary.settlementMeta,
          error: message,
        }
      );
    } finally {
      setIsLoadingSettlements(false);
    }
  };
  
  if (!activeGame || !summary) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No active game.</Text>
      </View>
    );
  }
  
  const activeSettlementResult: SettlementResult =
    settlementResult ?? {
      settlements: summary.settlements,
      ...summary.settlementMeta,
    };
  const settlementsToDisplay = activeSettlementResult.settlements;
  
  const handleShare = async () => {
    try {
      let message = `${activeGame.name} - Settlement Summary\n\n`;
      message += `Total Pot: $${summary.totalPot.toFixed(2)}\n\n`;
      message += `Settlements:\n`;

      if (settlementsToDisplay.length === 0) {
        message += `All balanced! No settlements needed.\n`;
      } else {
        const settlementsByRecipient = settlementsToDisplay.reduce<Record<string, { from: string; amount: number }[]>>(
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
        
        {/* Debug - Server/Client Status Card */}
        {/*
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                activeSettlementResult.source === 'server'
                  ? styles.statusDotServer
                  : styles.statusDotLocal,
              ]}
            />
            <View style={styles.statusTextGroup}>
              <Text style={styles.statusTitle}>
                {activeSettlementResult.source === 'server'
                  ? 'Optimized via server solver'
                  : 'Calculated on device'}
              </Text>
              <Text style={styles.statusSubtitle}>
                {activeSettlementResult.source === 'server'
                  ? `Algorithm: ${activeSettlementResult.algorithm}`
                  : lastError
                  ? `Fallback reason: ${lastError}`
                  : 'Using greedy fallback while offline'}
              </Text>
            </View>
          </View>
          <View style={styles.statusActions}>
            {isLoadingSettlements && (
              <ActivityIndicator size="small" color="#D4AF37" />
            )}
            {!isLoadingSettlements && activeSettlementResult.source !== 'server' && (
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
                <Text style={styles.retryButtonText}>Retry Online</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        */}
        {/* Settlements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settlements</Text>
          <Text style={styles.sectionSubtitle}>
            {settlementsToDisplay.length} payment{settlementsToDisplay.length !== 1 ? 's' : ''}
          </Text>
          
          {settlementsToDisplay.length === 0 ? (
            <Text style={styles.emptyText}>All balanced</Text>
          ) : (
            settlementsToDisplay.map((settlement, index) => (
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
    color: '#B072BB',
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
    borderColor: '#B072BB',
  },
  totalPotLabel: {
    fontSize: 12,
    color: '#B072BB',
    opacity: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  totalPotAmount: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#B072BB',
  },
  section: {
    marginBottom: 32,
  },
  statusCard: {
    backgroundColor: '#111111',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginBottom: 24,
    gap: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusDotServer: {
    backgroundColor: '#51A687',
  },
  statusDotLocal: {
    backgroundColor: '#C04657',
  },
  statusTextGroup: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  statusTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  statusSubtitle: {
    color: '#BBBBBB',
    fontSize: 12,
    marginTop: 2,
  },
  statusActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },
  retryButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#B072BB',
  },
  retryButtonText: {
    color: '#B072BB',
    fontWeight: '600',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#B072BB',
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
    borderLeftColor: '#B072BB',
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
    color: '#B072BB',
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
    borderLeftColor: '#B072BB',
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
    backgroundColor: '#B072BB',
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
