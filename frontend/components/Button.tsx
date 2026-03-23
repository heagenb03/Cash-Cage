import React, { useRef, useCallback, useMemo } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { useReduceMotion } from '@/hooks/useReduceMotion';

interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'destructive' | 'success';
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const Button: React.FC<ButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  disabled = false,
  fullWidth = false,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReduceMotion();

  const animateScaleDown = useCallback(() => {
    if (!reduceMotion && !disabled) {
      Animated.spring(scaleAnim, {
        toValue: 0.945,
        tension: 300,
        friction: 20,
        useNativeDriver: true
      }).start();
    }
  }, [reduceMotion, disabled, scaleAnim]);

  const animateScaleUp = useCallback((velocity: number = 0) => {
    if (!reduceMotion && !disabled) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 200,
        friction: 15,
        velocity,
        useNativeDriver: true
      }).start();
    }
  }, [reduceMotion, disabled, scaleAnim]);

  const handleTapSuccess = useCallback(() => {
    if (!disabled) {
      onPress();
    }
  }, [onPress, disabled]);

  const tapGesture = useMemo(() => Gesture.Tap()
    .maxDuration(200)
    .maxDistance(10)
    .enabled(!disabled)
    .onBegin(() => {
      runOnJS(animateScaleDown)();
    })
    .onFinalize((_, success) => {
      if (success) {
        runOnJS(handleTapSuccess)();
        runOnJS(animateScaleUp)(-0.5);
      } else {
        runOnJS(animateScaleUp)(0);
      }
    }), [disabled, animateScaleDown, animateScaleUp, handleTapSuccess]);

  const getButtonStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryButton;
      case 'secondary':
        return styles.secondaryButton;
      case 'destructive':
        return styles.destructiveButton;
      case 'success':
        return styles.successButton;
      default:
        return styles.primaryButton;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryButtonText;
      case 'secondary':
        return styles.secondaryButtonText;
      case 'destructive':
        return styles.destructiveButtonText;
      case 'success':
        return styles.successButtonText;
      default:
        return styles.primaryButtonText;
    }
  };

  return (
    <GestureDetector gesture={tapGesture}>
      <Animated.View
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={accessibilityHint}
        accessibilityState={{ disabled }}
        style={[
          styles.button,
          getButtonStyle(),
          fullWidth && styles.fullWidth,
          disabled && styles.disabled,
          !reduceMotion && !disabled && { transform: [{ scale: scaleAnim }] }
        ]}
      >
        <Text style={[styles.buttonText, getTextStyle()]}>
          {title}
        </Text>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    marginHorizontal: 20,
  },
  disabled: {
    opacity: 0.5,
  },
  primaryButton: {
    backgroundColor: '#B072BB',
    shadowColor: '#B072BB',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 14,
    shadowOpacity: 0.35,
    elevation: 6,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(176,114,187,0.5)',
  },
  destructiveButton: {
    backgroundColor: '#C04657',
  },
  successButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  primaryButtonText: {
    color: '#0A0A0A',
  },
  secondaryButtonText: {
    color: '#B072BB',
  },
  destructiveButtonText: {
    color: '#FFFFFF',
  },
  successButtonText: {
    color: '#FFFFFF',
  },
});

export default React.memo(Button, (prevProps, nextProps) => {
  return (
    prevProps.onPress === nextProps.onPress &&
    prevProps.title === nextProps.title &&
    prevProps.variant === nextProps.variant &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.fullWidth === nextProps.fullWidth &&
    prevProps.accessibilityLabel === nextProps.accessibilityLabel &&
    prevProps.accessibilityHint === nextProps.accessibilityHint
  );
});
