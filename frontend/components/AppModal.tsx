import React from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { backdropPressAction } from '@/utils/modalBackdrop';

export interface AppModalCardProps {
  /** Called when the modal should close (backdrop tap, Android back). */
  onClose: () => void;
  /**
   * Optional standard title rendered above the body. Icon-led modals omit
   * this and render their own <Ionicons/> + <Text style={appModalStyles.title}>
   * as children instead.
   */
  title?: string;
  /** Tap on the dim backdrop closes the modal. Set false on destructive confirms. */
  dismissOnBackdrop?: boolean;
  /** Merged onto the card (e.g. tighter padding). */
  cardStyle?: StyleProp<ViewStyle>;
  /** Merged onto the ScrollView contentContainerStyle (e.g. appModalStyles.centeredContent). */
  contentStyle?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export interface AppModalProps extends AppModalCardProps {
  visible: boolean;
  /**
   * In-place overlays (AppModalCard / PaymentEditorContent) rendered as
   * siblings ABOVE the card inside the same native modal — NEVER nest a
   * second <Modal> (iOS presents one at a time and silently drops the rest).
   */
  overlay?: React.ReactNode;
}

/**
 * The card + backdrop WITHOUT a native <Modal> wrapper, absolute-fill so it
 * can render either inside AppModal or in place inside an already-open modal.
 * A GestureHandlerRootView ancestor must exist (AppModal or the host modal
 * provides it) so gesture-based ModalButtons work.
 */
export const AppModalCard: React.FC<AppModalCardProps> = ({
  onClose,
  title,
  dismissOnBackdrop = true,
  cardStyle,
  contentStyle,
  children,
}) => {
  const handleBackdropPress = () => {
    const action = backdropPressAction(Keyboard.isVisible(), dismissOnBackdrop);
    if (action === 'dismiss-keyboard') {
      Keyboard.dismiss();
    } else if (action === 'close') {
      onClose();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.kav}
    >
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handleBackdropPress}
          accessibilityLabel="Dismiss"
        />
        <View style={[styles.card, cardStyle]}>
          {title ? <Text style={appModalStyles.title}>{title}</Text> : null}
          <ScrollView
            style={styles.body}
            contentContainerStyle={[styles.bodyContent, contentStyle]}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const AppModal: React.FC<AppModalProps> = ({ visible, overlay, ...card }) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    statusBarTranslucent
    onRequestClose={card.onClose}
  >
    <GestureHandlerRootView style={styles.root}>
      <AppModalCard {...card} />
      {overlay}
    </GestureHandlerRootView>
  </Modal>
);

/** Shared styles for modals that render their own header/body as children. */
export const appModalStyles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  centeredContent: {
    alignItems: 'center',
  },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  // Absolute fill (not flex:1) so AppModalCard also covers the screen when
  // rendered in place inside an already-open modal.
  kav: { ...StyleSheet.absoluteFillObject },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '100%',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 24,
  },
  body: {
    flexGrow: 0,
  },
  bodyContent: {},
});

export default AppModal;
