import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { StyleSheet, ScrollView, TouchableOpacity, Share, ActivityIndicator, Animated, AccessibilityInfo } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useGame } from '@/contexts/GameContext';
import { useRouter } from 'expo-router';
import { GameService } from '@/services/gameService';
import { getSettlements } from '@/services/settlementService';
import { PlayerBalance, SettlementResult } from '@/types/game';
import { groupSettlementsByRecipient, sortPaymentsByAmount } from '@/utils/settlementUtils';
import { getNetBalanceColor, formatNetBalanceDisplay } from '@/utils/formatUtils';
import Button from '@/components/Button';
import { Ionicons } from '@expo/vector-icons';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

// HUD Section Header Component
function HudSectionHeader({ label }: { label: string }) {
  return (
    <View style={styles.hudHeader}>
      <View style={styles.hudLine} />
      <Text style={styles.hudLabel}>{label}</Text>
      <View style={styles.hudLine} />
    </View>
  );
}

// Read-Only Player Balance Card Component
interface BalanceCardProps {
  balance: PlayerBalance;
  reduceMotion: boolean;
}

function BalanceCard({ balance, reduceMotion }: BalanceCardProps) {
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

  const animateScaleUp = useCallback(() => {
    if (!reduceMotion) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 200,
        friction: 15,
        useNativeDriver: true
      }).start();
    }
  }, [reduceMotion, scaleAnim]);

  const tapGesture = Gesture.Tap()
    .maxDuration(200)
    .maxDistance(10)
    .onBegin(() => runOnJS(animateScaleDown)())
    .onFinalize(() => runOnJS(animateScaleUp)());

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${balance.playerName}, Net: ${formatNetBalanceDisplay(balance.netBalance)}`}
        style={[
          styles.playerCard,
          !reduceMotion && { transform: [{ scale: scaleAnim }] }
        ]}
      >
        {/* Name row */}
        <View style={styles.cardHeader}>
          <View style={styles.nameRow}>
            <Text style={styles.playerName}>{balance.playerName}</Text>
          </View>
        </View>

        {/* Data row — IN | OUT | NET */}
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
      </Animated.View>
    </GestureDetector>
  );
}

// Empty State Component
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

// Settlement Card Component
interface SettlementCardProps {
  groupedSettlement: { recipient: string; totalAmount: number; payments: Array<{ from: string; amount: number }> };
  reduceMotion: boolean;
}

function SettlementCard({ groupedSettlement, reduceMotion }: SettlementCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // Sort payments by amount (largest first)
  const sortedPayments = sortPaymentsByAmount(groupedSettlement).payments;

  const handleToggle = useCallback(() => {
    const newExpandedState = !isExpanded;
    setIsExpanded(newExpandedState);

    if (!reduceMotion) {
      Animated.timing(opacityAnim, {
        toValue: newExpandedState ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      opacityAnim.setValue(newExpandedState ? 1 : 0);
    }
  }, [isExpanded, reduceMotion, opacityAnim]);

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

  const animateScaleUp = useCallback(() => {
    if (!reduceMotion) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 200,
        friction: 15,
        useNativeDriver: true
      }).start();
    }
  }, [reduceMotion, scaleAnim]);

  const tapGesture = Gesture.Tap()
    .maxDuration(200)
    .maxDistance(10)
    .onBegin(() => runOnJS(animateScaleDown)())
    .onFinalize((_, success) => {
      runOnJS(animateScaleUp)();
      if (success) {
        runOnJS(handleToggle)();
      }
    });

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${groupedSettlement.recipient} receives $${groupedSettlement.totalAmount.toFixed(2)}. ${isExpanded ? 'Collapse' : 'Expand'} payment details.`}
        accessibilityHint={isExpanded ? 'Double tap to collapse payment details' : 'Double tap to expand payment details'}
        accessibilityState={{ expanded: isExpanded }}
        style={[
          styles.settlementCard,
          !reduceMotion && { transform: [{ scale: scaleAnim }] }
        ]}
      >
        <View style={styles.settlementHeader}>
          <Text style={styles.recipientName}>{groupedSettlement.recipient}</Text>
          <Ionicons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={20}
            color="rgba(176,114,187,0.6)"
          />
        </View>
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>RECEIVES</Text>
          <Text style={styles.totalAmount}>
            ${groupedSettlement.totalAmount.toFixed(2)}
          </Text>
        </View>

        {/* Conditionally render payment details */}
        {isExpanded && (
          <Animated.View
            style={[
              styles.paymentDetailsSection,
              !reduceMotion && { opacity: opacityAnim }
            ]}
          >
            <View style={styles.paymentDivider} />
            <Text style={styles.paymentSectionLabel}>
              FROM ({groupedSettlement.payments.length} {groupedSettlement.payments.length === 1 ? 'PLAYER' : 'PLAYERS'})
            </Text>
            <View style={styles.paymentGrid}>
              {sortedPayments.map((payment, index) => (
                <React.Fragment key={index}>
                  {index > 0 && index % 3 !== 0 && <View style={styles.paymentGridDivider} />}
                  <View style={styles.paymentGridCell}>
                    <Text style={styles.paymentNameLabel} numberOfLines={2} ellipsizeMode="tail">
                      {payment.from}
                    </Text>
                    <View style={styles.paymentAmountRow}>
                      <Ionicons
                        name="arrow-down"
                        size={11}
                        color="rgba(176,114,187,0.4)"
                        style={{ marginRight: 4, marginTop: 1 }}
                      />
                      <Text style={styles.paymentAmountValue}>
                        ${payment.amount.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </Animated.View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

export default function GameSummaryScreen() {
  const { activeGame, updateGame } = useGame();
  const router = useRouter();
  const [reduceMotion, setReduceMotion] = useState(false);

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

  // Accessibility: Reduce motion
  useEffect(() => {
    const checkReduceMotion = async () => {
      const isEnabled = await AccessibilityInfo.isReduceMotionEnabled();
      setReduceMotion(isEnabled);
    };
    checkReduceMotion();

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!summary) {
      setSettlementResult(null);
      return;
    }

    // Check for cached settlements first
    const cachedResult = activeGame
      ? GameService.getCachedSettlements(activeGame)
      : null;

    if (cachedResult) {
      console.log('[cache] Using cached settlements:', cachedResult.algorithm);
      setSettlementResult(cachedResult);
      setIsLoadingSettlements(false);

      // If server result, we're done
      if (cachedResult.source === 'server') {
        setLastError(undefined);
        return;
      }

      // If greedy fallback, show cached but allow manual retry
      setLastError(cachedResult.error ?? 'Using cached on-device result');
      return;
    }

    // No valid cache - fetch from server
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
        if (cancelled) return;

        setSettlementResult(result);

        // Cache the result
        if (activeGame) {
          GameService.cacheSettlements(activeGame, result);
          await updateGame(activeGame);
        }

        if (result.source !== 'server') {
          setLastError(result.error ?? 'Using on-device fallback');
        } else {
          setLastError(undefined);
        }
      } catch (error) {
        if (cancelled) return;

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
    if (!summary || !activeGame) return;

    setIsLoadingSettlements(true);
    setLastError(undefined);

    try {
      const result = await getSettlements(balancesRef.current, { timeoutMs: 5000 });
      setSettlementResult(result);

      // Cache the new result
      GameService.cacheSettlements(activeGame, result);
      await updateGame(activeGame);

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

  const activeSettlementResult: SettlementResult | null =
    settlementResult ?? (summary ? {
      settlements: summary.settlements,
      ...summary.settlementMeta,
    } : null);
  const settlementsToDisplay = activeSettlementResult?.settlements ?? [];

  const groupedSettlements = useMemo(
    () => groupSettlementsByRecipient(settlementsToDisplay),
    [settlementsToDisplay]
  );

  if (!activeGame || !summary) {
    return (
      <View style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState label="No active game" icon="game-controller-outline" />
        </View>
      </View>
    );
  }

  const handleShare = async () => {
    try {
      let message = `${activeGame.name}\n\n`;
      message += `Total Pot: $${summary.totalPot.toFixed(2)}\n\n`;
      message += `Settlements:\n`;

      if (settlementsToDisplay.length === 0) {
        message += `All balanced! No settlements needed.\n`;
      } else {
        groupedSettlements.forEach(({ recipient, payments }) => {
          const details = payments
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
          <View style={styles.headerTitleRow}>
            <View style={styles.titleColumn}>
              <Text style={styles.gameTitle}>{activeGame.name}</Text>
              <Text style={styles.gameDate}>
                {new Date(activeGame.date).toLocaleDateString()}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.shareIconButton}
              onPress={handleShare}
              activeOpacity={0.6}
              accessibilityLabel="Share game summary"
              accessibilityHint="Opens share dialog to send summary via apps"
              accessibilityRole="button"
            >
              <Ionicons name="share-outline" size={20} color="#B072BB" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Total Pot Hero Metric */}
        <View style={styles.heroPotSection}>
          <HudSectionHeader label="TOTAL POT" />
          <View style={styles.heroPotDisplay}>
            <Text style={styles.heroPotAmount}>
              ${summary.totalPot.toFixed(2)}
            </Text>
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
          <HudSectionHeader label="SETTLEMENTS" />

          {groupedSettlements.length === 0 ? (
            <EmptyState label="All balanced" icon="checkmark-circle-outline" />
          ) : (
            groupedSettlements.map((groupedSettlement, index) => (
              <SettlementCard
                key={index}
                groupedSettlement={groupedSettlement}
                reduceMotion={reduceMotion}
              />
            ))
          )}
        </View>

        {/* Player Balances */}
        <View style={styles.section}>
          <HudSectionHeader label="FINAL BALANCES" />
          <View style={styles.balancesContainer}>
            {summary.balances.map(balance => (
              <BalanceCard key={balance.playerId} balance={balance} reduceMotion={reduceMotion} />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          onPress={() => router.push('/')}
          title="Done"
          variant="primary"
          fullWidth
          accessibilityHint="Returns to the home screen"
        />
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
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  headerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
  },
  titleColumn: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  shareIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
  gameTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#B072BB',
    letterSpacing: 1,
  },
  gameDate: {
    fontSize: 14,
    opacity: 0.5,
    color: '#FFFFFF',
  },
  heroPotSection: {
    marginBottom: 32,
  },
  heroPotDisplay: {
    paddingVertical: 20,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  heroPotAmount: {
    fontSize: 52,
    fontWeight: 'bold',
    color: '#B072BB',
  },
  hudHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
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
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 28,
    backgroundColor: 'transparent',
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
    backgroundColor: 'transparent',
  },
  emptyStateText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.35)',
    letterSpacing: 0.5,
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
  settlementCard: {
    backgroundColor: '#161616',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#242424',
    borderTopColor: 'rgba(176,114,187,0.15)',
  },
  settlementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  recipientName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  totalSection: {
    backgroundColor: 'transparent',
  },
  totalLabel: {
    fontSize: 9,
    color: 'rgba(176,114,187,0.65)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 3,
  },
  totalAmount: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'SpaceMono',
  },
  paymentDetailsSection: {
    backgroundColor: 'transparent',
    marginTop: 12,
  },
  paymentDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginBottom: 8,
  },
  paymentSectionLabel: {
    fontSize: 9,
    color: 'rgba(176,114,187,0.65)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  paymentRow: {
    backgroundColor: 'transparent',
    marginBottom: 6,
  },
  paymentText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'SpaceMono',
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: 'transparent',
    rowGap: 14,
  },
  paymentGridCell: {
    width: '33.333%',
    paddingHorizontal: 4,
    backgroundColor: 'transparent',
  },
  paymentGridDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#2A2A2A',
    marginHorizontal: 8,
    alignSelf: 'center',
  },
  paymentNameLabel: {
    fontSize: 9,
    color: 'rgba(176,114,187,0.65)',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  paymentAmountRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'transparent',
  },
  paymentAmountValue: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontFamily: 'SpaceMono',
  },
  balancesContainer: {
    gap: 8,
    backgroundColor: 'transparent',
  },
  // Player Card styles (read-only version)
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
  actions: {
    paddingVertical: 20,
    gap: 12,
  },
});
