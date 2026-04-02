import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
 */
const OfflineBanner: React.FC = () => {
  const { isOnline } = useNetwork();
  const reduceMotion = useReduceMotion();

  const [dismissed, setDismissed] = useState(false);

  // Track the previous isOnline value so we can reset dismissed state whenever
  // the device goes offline again after having been online.
  const prevIsOnlineRef = useRef(isOnline);

  useEffect(() => {
    const wasOnline = prevIsOnlineRef.current;
    prevIsOnlineRef.current = isOnline;

    // Device just went offline — reset dismissed so the banner re-appears
    if (wasOnline && !isOnline) {
      setDismissed(false);
    }
  }, [isOnline]);

  // Slide animation: translateY starts at -BANNER_HEIGHT (above viewport) and
  // animates to 0 when the banner should be visible.
  const slideAnim = useRef(new Animated.Value(-BANNER_HEIGHT)).current;

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
        slideAnim.setValue(-BANNER_HEIGHT);
      } else {
        Animated.spring(slideAnim, {
          toValue: -BANNER_HEIGHT,
          tension: 120,
          friction: 14,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [shouldShow, slideAnim, reduceMotion]);

  // Do not mount the component at all when online (after slide-out completes
  // we keep it mounted until online to allow the slide-out animation to finish,
  // so only skip mount entirely when online AND animation is at rest).
  if (isOnline && !shouldShow) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
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
          You're offline · changes are saved locally
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
    backgroundColor: AMBER_BG,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AMBER_BORDER,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    height: BANNER_HEIGHT,
    // Ensure it sits on top of content beneath it during slide animation
    zIndex: 100,
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
    // Slight upward nudge for optical alignment with the text baseline
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
