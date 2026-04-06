import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  Image,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, View } from '@/components/Themed';
import HudSectionHeader from '@/components/HudSectionHeader';
import Button from '@/components/Button';
import PaywallModal from '@/components/PaywallModal';
import { useAuth } from '@/contexts/AuthContext';
import { formatStatNumber, formatMonthYear } from '@/utils/formatUtils';
import { useCurrency } from '@/contexts/CurrencyContext';
import { getTrialLabel } from '@/utils/trialUtils';

// ---------------------------------------------------------------------------
// Account Screen
// ---------------------------------------------------------------------------

export default function AccountScreen() {
  const router = useRouter();
  const { user, userDoc, isPro, isTrialing, trialDaysRemaining, trialExpired } = useAuth();
  const { formatAmountCompact, meta } = useCurrency();

  const [showPaywall, setShowPaywall] = useState(false);

  // Derive initials from display name for avatar fallback
  const getInitials = useCallback((): string => {
    const name = userDoc?.displayName ?? user?.displayName ?? '';
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [userDoc, user]);

  const displayName = userDoc?.displayName || user?.displayName || 'Anonymous';
  const email = userDoc?.email || user?.email || '';
  const photoURL = userDoc?.photoURL || user?.photoURL || null;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

        {/* Header */}
        <HudSectionHeader
          label="Account"
          centered={true}
          showSettingsIcon={true}
          onSettingsPress={() => router.push('/(tabs)/(profile)/settings' as any)}
        />

        {/* Centered profile row */}
        <View style={styles.profileRow}>
          {photoURL ? (
            <Image
              source={{ uri: photoURL }}
              style={styles.miniAvatar}
              accessibilityLabel="Profile photo"
            />
          ) : (
            <View style={styles.miniAvatarInitials}>
              <Text style={styles.miniInitialsText}>{getInitials()}</Text>
            </View>
          )}
          <Text style={styles.profileName}>{displayName}</Text>
          {!!email && <Text style={styles.profileEmail}>{email}</Text>}
        </View>

        {/* Upgrade CTA — only shown for free users (not trialing, not Pro) */}
        {!isPro && (
          <View style={styles.upgradeCard}>
            <View style={styles.upgradeHeader}>
              <Ionicons name="star" size={20} color="#B072BB" style={styles.upgradeIcon} />
              <Text style={styles.upgradeTitle}>CASH CAGE PRO</Text>
            </View>
            <Text style={styles.upgradeFeatures}>
              Unlimited game history · Unlimited players · All devices
            </Text>
            <Button
              title="Upgrade Now"
              variant="primary"
              fullWidth={true}
              onPress={() => setShowPaywall(true)}
              accessibilityLabel="Upgrade to Cash Cage Pro"
              accessibilityHint="Opens the subscription paywall"
            />
          </View>
        )}

        {/* Trial badge — shown during active trial */}
        {isTrialing && (
          <View style={styles.trialCard}>
            <View style={styles.trialHeader}>
              <Ionicons name="star" size={16} color="#B072BB" />
              <Text style={styles.trialBadgeText}>PRO TRIAL</Text>
            </View>
            <Text style={styles.trialCountdown}>{getTrialLabel(trialDaysRemaining)}</Text>
            <TouchableOpacity onPress={() => setShowPaywall(true)} activeOpacity={0.7}>
              <Text style={styles.trialUpgradeLink}>Upgrade to keep Pro</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Pro member badge — only shown for paid Pro users */}
        {isPro && !isTrialing && (
          <View style={styles.proSinceCard}>
            <Ionicons name="star" size={16} color="#B072BB" />
            <Text style={styles.proSinceText}>
              Pro member{userDoc?.proSince ? ` since ${formatMonthYear(userDoc.proSince, meta.locale)}` : ''}
            </Text>
          </View>
        )}

        {/* Stats section header */}
        <View style={styles.statsHeader}>
          <HudSectionHeader
            label="Stats"
            centered={true}
          />
        </View>

        {/* Stats HUD strip */}
        <View style={styles.statsStrip}>
          <View style={styles.statsStripAccent} />
          <View style={styles.statsStripContent}>
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>GAMES</Text>
              <Text style={styles.statValue}>{formatStatNumber(userDoc?.totalGamesPlayed ?? 0)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>TRACKED</Text>
              <Text style={styles.statValue}>{formatAmountCompact(userDoc?.totalMoneyTracked ?? 0)}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statCell}>
              <Text style={styles.statLabel}>PLAYERS</Text>
              <Text style={styles.statValue}>{formatStatNumber(userDoc?.totalPlayersHosted ?? 0)}</Text>
            </View>
          </View>
        </View>

      </ScrollView>

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        trialExpired={trialExpired}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // Centered profile row
  profileRow: {
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  miniAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 8,
  },
  miniAvatarInitials: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#49264F',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  miniInitialsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: 'transparent',
  },
  profileName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    backgroundColor: 'transparent',
  },
  profileEmail: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
    backgroundColor: 'transparent',
  },

  // Stats section
  statsHeader: {
    marginTop: 20,
  },

  // Stats HUD strip
  statsStrip: {
    backgroundColor: '#161616',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#242424',
    borderTopColor: 'rgba(176,114,187,0.2)',
    overflow: 'hidden',
    marginBottom: 20,
  },
  statsStripAccent: {
    height: 1,
    backgroundColor: 'rgba(176,114,187,0.15)',
  },
  statsStripContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: 'transparent',
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(176,114,187,0.65)',
    letterSpacing: 1.5,
    marginBottom: 4,
    backgroundColor: 'transparent',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: { fontFamily: 'SpaceMono' },
      android: { fontFamily: 'SpaceMono' },
      default: { fontFamily: 'monospace' },
    }),
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#2A2A2A',
  },

  // Trial badge
  trialCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(176,114,187,0.3)',
  },
  trialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'transparent',
  },
  trialBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#B072BB',
    letterSpacing: 2,
    backgroundColor: 'transparent',
  },
  trialCountdown: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    backgroundColor: 'transparent',
  },
  trialUpgradeLink: {
    fontSize: 12,
    color: '#B072BB',
    textDecorationLine: 'underline',
    backgroundColor: 'transparent',
  },

  // Pro member badge
  proSinceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(176,114,187,0.2)',
  },
  proSinceText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    backgroundColor: 'transparent',
  },

  // Upgrade CTA card
  upgradeCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(176,114,187,0.4)',
  },
  upgradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  upgradeIcon: {
    marginRight: 8,
  },
  upgradeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#B072BB',
    letterSpacing: 2,
    backgroundColor: 'transparent',
  },
  upgradeFeatures: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
    backgroundColor: 'transparent',
  },
});
