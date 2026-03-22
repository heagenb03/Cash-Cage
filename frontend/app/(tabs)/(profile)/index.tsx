import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, View } from '@/components/Themed';
import HudSectionHeader from '@/components/HudSectionHeader';
import Button from '@/components/Button';
import PaywallModal from '@/components/PaywallModal';
import { useAuth } from '@/contexts/AuthContext';
import { formatStatNumber, formatStatCurrency, formatMonthYear } from '@/utils/formatUtils';

// ---------------------------------------------------------------------------
// Account Screen
// ---------------------------------------------------------------------------

export default function AccountScreen() {
  const router = useRouter();
  const { user, userDoc, isPro } = useAuth();

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

        {/* Compact profile row */}
        <View style={styles.profileRow}>
          {/* Mini avatar */}
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

          {/* Name + email */}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{displayName}</Text>
            {!!email && <Text style={styles.profileEmail}>{email}</Text>}
          </View>

          {/* Tier badge */}
          <View style={[styles.tierBadge, isPro ? styles.tierBadgePro : styles.tierBadgeFree]}>
            {isPro && <Ionicons name="star" size={10} color="#FFFFFF" style={styles.tierIcon} />}
            <Text style={styles.tierText}>{isPro ? 'Pro' : 'Free'}</Text>
          </View>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatStatNumber(userDoc?.totalGamesPlayed ?? 0)}</Text>
            <Text style={styles.statLabel}>Games</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatStatCurrency(userDoc?.totalMoneyTracked ?? 0)}</Text>
            <Text style={styles.statLabel}>Tracked</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{formatStatNumber(userDoc?.totalPlayersHosted ?? 0)}</Text>
            <Text style={styles.statLabel}>Players</Text>
          </View>
        </View>

        {/* Upgrade CTA — only shown for free users */}
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

        {/* Pro member badge — only shown for Pro users */}
        {isPro && (
          <View style={styles.proSinceCard}>
            <Ionicons name="star" size={16} color="#B072BB" />
            <Text style={styles.proSinceText}>
              Pro member{userDoc?.proSince ? ` since ${formatMonthYear(userDoc.proSince)}` : ''}
            </Text>
          </View>
        )}

      </ScrollView>

      <PaywallModal visible={showPaywall} onClose={() => setShowPaywall(false)} />
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

  // Compact profile row
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 20,
    backgroundColor: 'transparent',
  },
  miniAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  miniAvatarInitials: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#49264F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  miniInitialsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: 'transparent',
  },
  profileInfo: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  profileName: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
    backgroundColor: 'transparent',
  },
  profileEmail: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 1,
    backgroundColor: 'transparent',
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tierBadgeFree: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  tierBadgePro: {
    backgroundColor: '#B072BB',
  },
  tierIcon: {
    marginRight: 3,
  },
  tierText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    backgroundColor: 'transparent',
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#B072BB',
    backgroundColor: 'transparent',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
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
