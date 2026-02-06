import React, { useRef, useCallback } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { AccessibilityInfo } from 'react-native';

interface ModalButtonProps {
  onPress: () => void;
  title: string;
  variant: 'cancel' | 'confirm' | 'destructive';
  fullWidth?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const ModalButton: React.FC<ModalButtonProps> = ({
  onPress,
  title,
  variant,
  fullWidth = false,
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = React.useState(false);

  React.useEffect(() => {
    const checkReduceMotion = async () => {
      const isReduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
      setReduceMotion(isReduceMotionEnabled);
    };
    checkReduceMotion();

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion
    );

    return () => {
      subscription.remove();
    };
  }, []);

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

  const tapGesture = Gesture.Tap()
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
    });

  const getButtonStyle = () => {
    switch (variant) {
      case 'cancel':
        return styles.cancelButton;
      case 'confirm':
        return styles.confirmButton;
      case 'destructive':
        return styles.destructiveButton;
      default:
        return styles.cancelButton;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'cancel':
        return styles.cancelButtonText;
      case 'confirm':
        return styles.confirmButtonText;
      case 'destructive':
        return styles.destructiveButtonText;
      default:
        return styles.cancelButtonText;
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
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    flex: 0,
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#666',
  },
  confirmButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#B072BB',
  },
  destructiveButton: {
    backgroundColor: '#C04657',
    borderWidth: 0,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#FFFFFF',
  },
  confirmButtonText: {
    color: '#B072BB',
  },
  destructiveButtonText: {
    color: '#FFFFFF',
  },
});

export default React.memo(ModalButton, (prevProps, nextProps) => {
  return (
    prevProps.onPress === nextProps.onPress &&
    prevProps.title === nextProps.title &&
    prevProps.variant === nextProps.variant &&
    prevProps.fullWidth === nextProps.fullWidth &&
    prevProps.disabled === nextProps.disabled &&
    prevProps.accessibilityLabel === nextProps.accessibilityLabel &&
    prevProps.accessibilityHint === nextProps.accessibilityHint
  );
});
