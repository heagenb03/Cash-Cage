import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

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
    <TouchableOpacity
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
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.buttonText, getTextStyle()]}>
        {title}
      </Text>
    </TouchableOpacity>
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
