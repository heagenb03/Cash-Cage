import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text, View } from '@/components/Themed';
import ModalButton from '@/components/ModalButton';
import { PurchasesPackage } from 'react-native-purchases';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
} from '@/services/revenueCatService';
import { useAuth } from '@/contexts/AuthContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  /** Optional message shown at the top to explain why the paywall appeared */
  triggerMessage?: string;
}

// Hardcoded display data shown while offerings load or as fallback
const DISPLAY_MONTHLY = {
  period: 'Monthly',
  price: '$2.99',
  detail: 'per month',
  badge: null,
};
const DISPLAY_ANNUAL = {
  period: 'Annual',
  price: '$14.99',
  detail: 'per year · ~$1.25/mo',
  badge: 'Best Value',
};

const FEATURES = [
  'Unlimited game history',
  'Unlimited players per game',
  'All your devices',
];

// ---------------------------------------------------------------------------
// PaywallModal
// ---------------------------------------------------------------------------

export default function PaywallModal({ visible, onClose, triggerMessage }: PaywallModalProps) {
  const { refreshEntitlements } = useAuth();

  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'annual'>('annual');
  const [offerings, setOfferings] = useState<{ monthly: PurchasesPackage | null; annual: PurchasesPackage | null }>({
    monthly: null,
    annual: null,
  });
  const [loading, setLoading] = useState(false);
  const [offeringsLoading, setOfferingsLoading] = useState(false);
  const [error, setError] = useState('');
  const [restoring, setRestoring] = useState(false);

  // Fetch offerings when modal opens
  useEffect(() => {
    if (!visible) return;

    setError('');
    setSelectedPeriod('annual');

    const fetchOfferings = async () => {
      setOfferingsLoading(true);
      try {
        const result = await getOfferings();
        if (result?.current?.availablePackages) {
          const pkgs = result.current.availablePackages;
          const monthly = pkgs.find(p =>
            p.packageType === 'MONTHLY' ||
            p.product.identifier.includes('monthly')
          ) ?? null;
          const annual = pkgs.find(p =>
            p.packageType === 'ANNUAL' ||
            p.product.identifier.includes('annual')
          ) ?? null;
          setOfferings({ monthly, annual });
        }
      } catch {
        // Offerings unavailable — fall back to display-only UI
      } finally {
        setOfferingsLoading(false);
      }
    };

    fetchOfferings();
  }, [visible]);

  const selectedPackage = selectedPeriod === 'monthly' ? offerings.monthly : offerings.annual;

  const handlePurchase = useCallback(async () => {
    if (!selectedPackage) {
      setError('Unable to load pricing. Please check your connection and try again.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const customerInfo = await purchasePackage(selectedPackage);
      if (customerInfo) {
        // Purchase succeeded — refresh entitlements in AuthContext
        await refreshEntitlements();
        onClose();
      }
      // null = user cancelled — stay on paywall
    } catch (err: any) {
      const message = err?.message ?? 'Purchase failed. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [selectedPackage, refreshEntitlements, onClose]);

  const handleRestore = useCallback(async () => {
    setRestoring(true);
    setError('');
    try {
      const customerInfo = await restorePurchases();
      if (customerInfo?.entitlements?.active?.['pro']) {
        await refreshEntitlements();
        onClose();
      } else {
        setError('No active Pro subscription found to restore.');
      }
    } catch {
      setError('Restore failed. Please try again.');
    } finally {
      setRestoring(false);
    }
  }, [refreshEntitlements, onClose]);

  const getDisplayPrice = (period: 'monthly' | 'annual'): string => {
    const pkg = period === 'monthly' ? offerings.monthly : offerings.annual;
    if (pkg?.product?.priceString) return pkg.product.priceString;
    return period === 'monthly' ? DISPLAY_MONTHLY.price : DISPLAY_ANNUAL.price;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            {/* Dismiss button */}
            <TouchableOpacity style={styles.dismissButton} onPress={onClose} accessibilityLabel="Close paywall">
              <Ionicons name="close" size={22} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
              {/* Header */}
              <View style={styles.headerRow}>
                <Ionicons name="star" size={24} color="#B072BB" style={styles.starIcon} />
                <Text style={styles.title}>CASHCAGE PRO</Text>
              </View>

              {triggerMessage && (
                <Text style={styles.triggerMessage}>{triggerMessage}</Text>
              )}

              {/* Feature list */}
              <View style={styles.featureList}>
                {FEATURES.map((feature) => (
                  <View key={feature} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={18} color="#B072BB" style={styles.checkIcon} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              {/* Plan selector */}
              {offeringsLoading ? (
                <ActivityIndicator color="#B072BB" style={styles.offeringsSpinner} />
              ) : (
                <View style={styles.planRow}>
                  {/* Monthly option */}
                  <TouchableOpacity
                    style={[styles.planCard, selectedPeriod === 'monthly' && styles.planCardSelected]}
                    onPress={() => setSelectedPeriod('monthly')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.planPeriod}>{DISPLAY_MONTHLY.period}</Text>
                    <Text style={[styles.planPrice, selectedPeriod === 'monthly' && styles.planPriceSelected]}>
                      {getDisplayPrice('monthly')}
                    </Text>
                    <Text style={styles.planDetail}>{DISPLAY_MONTHLY.detail}</Text>
                  </TouchableOpacity>

                  {/* Annual option (default / best value) */}
                  <TouchableOpacity
                    style={[styles.planCard, selectedPeriod === 'annual' && styles.planCardSelected]}
                    onPress={() => setSelectedPeriod('annual')}
                    activeOpacity={0.8}
                  >
                    {DISPLAY_ANNUAL.badge && (
                      <View style={styles.bestValueBadge}>
                        <Text style={styles.bestValueText}>{DISPLAY_ANNUAL.badge}</Text>
                      </View>
                    )}
                    <Text style={styles.planPeriod}>{DISPLAY_ANNUAL.period}</Text>
                    <Text style={[styles.planPrice, selectedPeriod === 'annual' && styles.planPriceSelected]}>
                      {getDisplayPrice('annual')}
                    </Text>
                    <Text style={styles.planDetail}>{DISPLAY_ANNUAL.detail}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Error */}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {/* CTA */}
              <View style={styles.ctaContainer}>
                {loading ? (
                  <ActivityIndicator color="#B072BB" size="large" />
                ) : (
                  <ModalButton
                    title="Upgrade Now"
                    variant="confirm"
                    onPress={handlePurchase}
                    disabled={loading || offeringsLoading}
                  />
                )}
              </View>

              {/* Restore */}
              <TouchableOpacity
                onPress={handleRestore}
                disabled={restoring}
                style={styles.restoreButton}
                accessibilityLabel="Restore purchases"
              >
                {restoring ? (
                  <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />
                ) : (
                  <Text style={styles.restoreText}>Restore purchases</Text>
                )}
              </TouchableOpacity>

            </ScrollView>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0A0A0A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(176,114,187,0.3)',
    paddingTop: 8,
    paddingBottom: 40,
    maxHeight: '90%',
  },
  dismissButton: {
    alignSelf: 'flex-end',
    padding: 16,
    paddingBottom: 4,
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },
  starIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#B072BB',
    letterSpacing: 3,
    backgroundColor: 'transparent',
  },
  triggerMessage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
    backgroundColor: 'transparent',
  },

  // Features
  featureList: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(176,114,187,0.15)',
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkIcon: {
    marginRight: 10,
  },
  featureText: {
    fontSize: 15,
    color: '#FFFFFF',
    backgroundColor: 'transparent',
  },

  // Plan cards
  offeringsSpinner: {
    marginVertical: 24,
  },
  planRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  planCard: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(176,114,187,0.2)',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: '#B072BB',
    backgroundColor: 'rgba(176,114,187,0.08)',
  },
  bestValueBadge: {
    position: 'absolute',
    top: -11,
    backgroundColor: '#B072BB',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  bestValueText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  planPeriod: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
    backgroundColor: 'transparent',
  },
  planPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.7)',
    backgroundColor: 'transparent',
  },
  planPriceSelected: {
    color: '#FFFFFF',
  },
  planDetail: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 4,
    textAlign: 'center',
    backgroundColor: 'transparent',
  },

  // Error
  errorText: {
    fontSize: 13,
    color: '#C04657',
    textAlign: 'center',
    marginBottom: 12,
    backgroundColor: 'transparent',
  },

  // CTA
  ctaContainer: {
    marginBottom: 16,
  },

  // Restore
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 12,
  },
  restoreText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
    textDecorationLine: 'underline',
  },

  // Legal
  legalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    backgroundColor: 'transparent',
  },
  legalLink: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    textDecorationLine: 'underline',
  },
  legalSep: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.2)',
    backgroundColor: 'transparent',
  },
});
