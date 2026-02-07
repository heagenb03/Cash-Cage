import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, AccessibilityInfo, Animated } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from '@/components/Themed';

interface HudSectionHeaderProps {
  label: string;
  onAction?: () => void;
  actionIcon?: string;
  centered?: boolean;
  showSettingsIcon?: boolean;
  onSettingsPress?: () => void;
}

export default function HudSectionHeader({
  label,
  onAction,
  actionIcon,
  centered = false,
  showSettingsIcon = false,
  onSettingsPress
}: HudSectionHeaderProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const settingsScaleAnim = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let subscription: any;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (isMounted) {
        setReduceMotion(enabled);
      }
    });

    subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReduceMotion(enabled);
    });

    return () => {
      isMounted = false;
      subscription?.remove();
    };
  }, []);

  const animateScaleDown = useCallback((scaleValue: number = 0.945) => {
    if (!reduceMotion) {
      Animated.spring(scaleAnim, {
        toValue: scaleValue,
        tension: 300,
        friction: 20,
        useNativeDriver: true
      }).start();
    }
  }, [reduceMotion, scaleAnim]);

  const animateScaleUp = useCallback((velocity: number = 0) => {
    if (!reduceMotion) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 200,
        friction: 15,
        velocity,
        useNativeDriver: true
      }).start();
    }
  }, [reduceMotion, scaleAnim]);

  const handleTapSuccess = useCallback(() => {
    if (onAction) {
      onAction();
    }
  }, [onAction]);

  const handleSettingsTap = useCallback(() => {
    if (onSettingsPress) {
      onSettingsPress();
    }
  }, [onSettingsPress]);

  const animateSettingsScaleDown = useCallback((scaleValue: number = 0.9) => {
    if (!reduceMotion) {
      Animated.spring(settingsScaleAnim, {
        toValue: scaleValue,
        tension: 300,
        friction: 20,
        useNativeDriver: true
      }).start();
    }
  }, [reduceMotion, settingsScaleAnim]);

  const animateSettingsScaleUp = useCallback((velocity: number = 0) => {
    if (!reduceMotion) {
      Animated.spring(settingsScaleAnim, {
        toValue: 1,
        tension: 200,
        friction: 15,
        velocity,
        useNativeDriver: true
      }).start();
    }
  }, [reduceMotion, settingsScaleAnim]);

  const tapGesture = Gesture.Tap()
    .maxDuration(200)
    .maxDistance(10)
    .enabled(!!onAction)
    .onBegin(() => {
      runOnJS(animateScaleDown)(0.9);
    })
    .onFinalize((_, success) => {
      if (success) {
        runOnJS(handleTapSuccess)();
        runOnJS(animateScaleUp)(-0.5);
      } else {
        runOnJS(animateScaleUp)(0);
      }
    });

  const settingsTapGesture = Gesture.Tap()
    .maxDuration(200)
    .maxDistance(10)
    .enabled(!!onSettingsPress)
    .onBegin(() => {
      runOnJS(animateSettingsScaleDown)(0.9);
    })
    .onFinalize((_, success) => {
      if (success) {
        runOnJS(handleSettingsTap)();
        runOnJS(animateSettingsScaleUp)(-0.5);
      } else {
        runOnJS(animateSettingsScaleUp)(0);
      }
    });

  // Determine layout mode
  const isCenteredMode = centered || showSettingsIcon;
  const hasActionIcon = onAction && actionIcon;

  return (
    <View style={[styles.hudHeader, showSettingsIcon && styles.hudHeaderWithSettings]}>
      <View style={styles.hudLines}>
        <View style={styles.hudLine} />
      </View>
      <Text style={styles.hudLabel}>{label}</Text>
      {isCenteredMode && (
        <View style={styles.hudLines}>
          <View style={styles.hudLine} />
        </View>
      )}
      {hasActionIcon && !isCenteredMode && (
        <GestureDetector gesture={tapGesture}>
          <Animated.View
            style={[
              styles.hudIconSlot,
              !reduceMotion && { transform: [{ scale: scaleAnim }] }
            ]}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Add player"
            accessibilityHint="Opens the add player dialog"
          >
            <Ionicons
              name={actionIcon as any}
              size={22}
              color="rgba(176,114,187,0.7)"
            />
          </Animated.View>
        </GestureDetector>
      )}
      {showSettingsIcon && (
        <GestureDetector gesture={settingsTapGesture}>
          <Animated.View
            style={[
              styles.settingsIconSlot,
              !reduceMotion && { transform: [{ scale: settingsScaleAnim }] }
            ]}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Settings"
            accessibilityHint="Navigate to settings"
          >
            <Ionicons
              name="settings-outline"
              size={22}
              color="rgba(176,114,187,0.7)"
            />
          </Animated.View>
        </GestureDetector>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hudHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  hudHeaderWithSettings: {
    position: 'relative',
  },
  hudLines: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: 'transparent',
  },
  hudLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(176,114,187,0.2)',
  },
  hudLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 3,
    color: '#B072BB',
    backgroundColor: 'transparent',
  },
  hudIconSlot: {
    marginLeft: 12,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  settingsIconSlot: {
    position: 'absolute',
    right: 0,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});
