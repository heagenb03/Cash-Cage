import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, View } from '@/components/Themed';
import HudSectionHeader from '@/components/HudSectionHeader';
import Button from '@/components/Button';
import PaywallModal from '@/components/PaywallModal';
import { useAuth } from '@/contexts/AuthContext';
import { resendEmailVerification } from '@/services/firebaseService';

// ---------------------------------------------------------------------------
// Account Screen
// ---------------------------------------------------------------------------

export default function AccountScreen() {
  const router = useRouter();
  const { user, userDoc, isPro } = useAuth();

  const [showPaywall, setShowPaywall] = useState(false);

  // Email verification banner state
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const handleResendVerification = useCallback(async () => {
    if (resendLoading || resendCooldown > 0) return;

    setResendLoading(true);
    try {
      await resendEmailVerification();
      setResendSent(true);
      setResendCooldown(60);

      cooldownRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            if (cooldownRef.current) clearInterval(cooldownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Failed to resend verification email:', err);
    } finally {
      setResendLoading(false);
    }
  }, [resendLoading, resendCooldown]);

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
  const isEmailVerified = user?.emailVerified ?? false;
  const showBanner = user && !isEmailVerified && !bannerDismissed;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

        {/* Header */}
        <View style={styles.section}>
          <HudSectionHeader
            label="Account"
            centered={true}
            showSettingsIcon={true}
            onSettingsPress={() => router.push('/(tabs)/(profile)/settings' as any)}
          />

          {/* Profile card */}
          <View style={styles.profileCard}>
            {/* Avatar */}
            <View style={styles.avatarContainer}>
              {photoURL ? (
                <Image
                  source={{ uri: photoURL }}
                  style={styles.avatarImage}
                  accessibilityLabel="Profile photo"
                />
              ) : (
                <View style={styles.avatarInitials}>
                  <Text style={styles.initialsText}>{getInitials()}</Text>
                </View>
              )}
            </View>

            {/* Name */}
            <Text style={styles.displayName}>{displayName}</Text>

            {/* Email row */}
            <View style={styles.emailRow}>
              <Text style={styles.emailText}>{email}</Text>
              {isEmailVerified ? (
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color="#4CAF50"
                  accessibilityLabel="Email verified"
                  style={styles.emailStatusIcon}
                />
              ) : (
                <Ionicons
                  name="alert-circle"
                  size={16}
                  color="#FFA500"
                  accessibilityLabel="Email not verified"
                  style={styles.emailStatusIcon}
                />
              )}
            </View>

            {/* Tier badge */}
            <View style={[styles.tierBadge, isPro ? styles.tierBadgePro : styles.tierBadgeFree]}>
              {isPro && (
                <Ionicons name="star" size={12} color="#FFFFFF" style={styles.tierIcon} />
              )}
              <Text style={styles.tierText}>{isPro ? 'Pro' : 'Free Plan'}</Text>
            </View>
          </View>
        </View>

        {/* Email verification banner */}
        {showBanner && (
          <View style={styles.verificationBanner}>
            <View style={styles.verificationBannerContent}>
              <Ionicons name="mail-outline" size={20} color="#FFA500" style={styles.bannerIcon} />
              <Text style={styles.bannerText}>Please verify your email address.</Text>
            </View>
            <View style={styles.bannerActions}>
              <TouchableOpacity
                onPress={handleResendVerification}
                disabled={resendLoading || resendCooldown > 0}
                accessibilityLabel="Resend verification email"
                accessibilityHint="Sends a new verification email to your address"
              >
                {resendLoading ? (
                  <ActivityIndicator size="small" color="#FFA500" />
                ) : resendSent && resendCooldown > 0 ? (
                  <Text style={styles.bannerSentText}>Sent! ({resendCooldown}s)</Text>
                ) : resendCooldown > 0 ? (
                  <Text style={[styles.bannerResendText, styles.bannerResendDisabled]}>
                    Resend ({resendCooldown}s)
                  </Text>
                ) : (
                  <Text style={styles.bannerResendText}>Resend</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setBannerDismissed(true)}
                style={styles.bannerDismiss}
                accessibilityLabel="Dismiss verification banner"
              >
                <Ionicons name="close" size={18} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Upgrade CTA — only shown for free users */}
        {!isPro && (
          <View style={styles.section}>
            <View style={styles.upgradeCard}>
              <View style={styles.upgradeHeader}>
                <Ionicons name="star" size={20} color="#B072BB" style={styles.upgradeIcon} />
                <Text style={styles.upgradeTitle}>DEALR PRO</Text>
              </View>
              <Text style={styles.upgradeFeatures}>
                Unlimited game history · Unlimited players · All devices
              </Text>
              <Button
                title="Upgrade Now"
                variant="primary"
                fullWidth={true}
                onPress={() => setShowPaywall(true)}
                accessibilityLabel="Upgrade to Dealr Pro"
                accessibilityHint="Opens the subscription paywall"
              />
            </View>
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
  section: {
    marginBottom: 20,
    backgroundColor: 'transparent',
  },

  // Profile card
  profileCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(176,114,187,0.2)',
  },
  avatarContainer: {
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarInitials: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#B072BB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    backgroundColor: 'transparent',
  },
  displayName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
    backgroundColor: 'transparent',
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  emailText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    backgroundColor: 'transparent',
  },
  emailStatusIcon: {
    marginLeft: 6,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierBadgeFree: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  tierBadgePro: {
    backgroundColor: '#B072BB',
  },
  tierIcon: {
    marginRight: 4,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    backgroundColor: 'transparent',
  },

  // Email verification banner
  verificationBanner: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,165,0,0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  verificationBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: 'transparent',
  },
  bannerIcon: {
    marginRight: 10,
  },
  bannerText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    flex: 1,
    backgroundColor: 'transparent',
  },
  bannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'transparent',
  },
  bannerResendText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFA500',
  },
  bannerResendDisabled: {
    opacity: 0.5,
  },
  bannerSentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
  bannerDismiss: {
    padding: 2,
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
