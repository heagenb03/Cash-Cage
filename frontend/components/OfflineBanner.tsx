import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNetwork } from '@/contexts/NetworkContext';
import { useReduceMotion } from '@/hooks/useReduceMotion';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AMBER = 'rgba(255, 165, 0, 0.85)';
const AMBER_BG = 'rgba(255, 165, 0, 0.08)';
const AMBER_BORDER = 'rgba(255, 165, 0, 0.15)';
const BANNER_HEIGHT = 40;

// ---------------------------------------------------------------------------
// OfflineBanner
// ---------------------------------------------------------------------------

/**
 * Slim banner rendered at the top of the screen when the device is offline.
 * Slides down from above on first render, auto-resets dismissed state on each
 * new offline transition. Dismissible via the X button.
 *
 * NOTE: This component is currently unused. The offline strip is embedded
 * directly inside DynamicCashCageHeader in app/(tabs)/_layout.tsx to avoid
 * z-index conflicts with the React Navigation header layer.
 */
const OfflineBanner: React.FC = () => {
  const { isOnline } = useNetwork();
  const reduceMotion = useReduceMotion();
  const { top: topInset } = useSafeAreaInsets();

  const [dismissed, setDismissed] = useState(false);

  const prevIsOnlineRef = useRef(isOnline);

  useEffect(() => {
    const wasOnline = prevIsOnlineRef.current;
    prevIsOnlineRef.current = isOnline;

    if (wasOnline && !isOnline) {
      setDismissed(false);
    }
  }, [isOnline]);

  const totalHeight = BANNER_HEIGHT + topInset;
  const slideAnim = useRef(new Animated.Value(-totalHeight)).current;

  const shouldShow = !isOnline && !dismissed;

  useEffect(() => {
    if (shouldShow) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 120,
        friction: 14,
        useNativeDriver: true,
      }).start();
    } else {
      if (reduceMotion) {
        slideAnim.setValue(-totalHeight);
      } else {
        Animated.spring(slideAnim, {
          toValue: -totalHeight,
          tension: 120,
          friction: 14,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [shouldShow, slideAnim, reduceMotion, totalHeight]);

  if (isOnline && !shouldShow) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingTop: topInset, height: totalHeight },
        !reduceMotion && { transform: [{ translateY: slideAnim }] },
        reduceMotion && !shouldShow && styles.hidden,
      ]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <View style={styles.content}>
        <Ionicons
          name="cloud-offline-outline"
          size={15}
          color={AMBER}
          style={styles.icon}
        />
        <Text style={styles.message}>
          You're offline · some features may be unavailable
        </Text>
      </View>

      <TouchableOpacity
        onPress={() => setDismissed(true)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityLabel="Dismiss offline banner"
        accessibilityRole="button"
      >
        <Ionicons name="close" size={16} color={AMBER} />
      </TouchableOpacity>
    </Animated.View>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: AMBER_BG,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AMBER_BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    zIndex: 100,
    elevation: 100,
  },
  hidden: {
    display: 'none',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    marginTop: 1,
  },
  message: {
    color: AMBER,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});

export default React.memo(OfflineBanner);
