import React from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  LayoutChangeEvent,
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
import Animated, {
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { backdropPressAction } from '@/utils/modalBackdrop';
import { computeCardLift } from '@/utils/keyboardLift';

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

/** Backdrop tap: dismiss the keyboard first, then close (per backdropPressAction). */
const handleBackdropPress = (dismissOnBackdrop: boolean, onClose: () => void) => {
  const action = backdropPressAction(Keyboard.isVisible(), dismissOnBackdrop);
  if (action === 'dismiss-keyboard') {
    Keyboard.dismiss();
  } else if (action === 'close') {
    onClose();
  }
};

/** Dim, tap-to-dismiss backdrop shared by both platform cards. */
const Backdrop: React.FC<{ dismissOnBackdrop: boolean; onPress: () => void }> = ({
  dismissOnBackdrop,
  onPress,
}) => (
  <Pressable
    style={StyleSheet.absoluteFill}
    onPress={onPress}
    accessibilityLabel="Dismiss"
    accessibilityRole="button"
    accessibilityElementsHidden={!dismissOnBackdrop}
    importantForAccessibility={dismissOnBackdrop ? 'auto' : 'no-hide-descendants'}
  />
);

/** Optional title + scrolling body shared by both platform cards. */
const CardBody: React.FC<
  Pick<AppModalCardProps, 'title' | 'contentStyle' | 'children'>
> = ({ title, contentStyle, children }) => (
  <>
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
  </>
);

/**
 * iOS card: a plain centered overlay (NO KeyboardAvoidingView) plus a Reanimated
 * translate that lifts the card only as far as it needs to clear the keyboard.
 * `useAnimatedKeyboard` is iOS-reliable and tracks the system keyboard curve, so
 * the card slides in sync. Lives in its own component so the keyboard hook only
 * ever mounts on iOS.
 */
const IOSKeyboardCard: React.FC<AppModalCardProps> = ({
  onClose,
  title,
  dismissOnBackdrop = true,
  cardStyle,
  contentStyle,
  children,
}) => {
  const keyboard = useAnimatedKeyboard();
  const overlayHeight = useSharedValue(0);
  const cardHeight = useSharedValue(0);

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: -computeCardLift(
          keyboard.height.value,
          overlayHeight.value,
          cardHeight.value,
        ),
      },
    ],
  }));

  return (
    <View style={styles.kav}>
      <View
        style={styles.overlay}
        onLayout={(e: LayoutChangeEvent) => {
          overlayHeight.value = e.nativeEvent.layout.height;
        }}
      >
        <Backdrop
          dismissOnBackdrop={dismissOnBackdrop}
          onPress={() => handleBackdropPress(dismissOnBackdrop, onClose)}
        />
        <Animated.View
          style={[styles.card, cardStyle, animatedCardStyle]}
          onLayout={(e: LayoutChangeEvent) => {
            cardHeight.value = e.nativeEvent.layout.height;
          }}
        >
          <CardBody title={title} contentStyle={contentStyle}>
            {children}
          </CardBody>
        </Animated.View>
      </View>
    </View>
  );
};

/**
 * Android card: unchanged from the original — KeyboardAvoidingView with
 * behavior="height". Left untouched because the too-high issue was observed only
 * on iOS, and Android <Modal> keyboard insets are a separate, unverified concern.
 */
const AndroidKavCard: React.FC<AppModalCardProps> = ({
  onClose,
  title,
  dismissOnBackdrop = true,
  cardStyle,
  contentStyle,
  children,
}) => (
  <KeyboardAvoidingView behavior="height" style={styles.kav}>
    <View style={styles.overlay}>
      <Backdrop
        dismissOnBackdrop={dismissOnBackdrop}
        onPress={() => handleBackdropPress(dismissOnBackdrop, onClose)}
      />
      <View style={[styles.card, cardStyle]}>
        <CardBody title={title} contentStyle={contentStyle}>
          {children}
        </CardBody>
      </View>
    </View>
  </KeyboardAvoidingView>
);

/**
 * The card + backdrop WITHOUT a native <Modal> wrapper, absolute-fill so it can
 * render either inside AppModal or in place inside an already-open modal. A
 * GestureHandlerRootView ancestor must exist (AppModal or the host modal provides
 * it) so gesture-based ModalButtons work. Platform-split: iOS lifts the card only
 * as needed for the keyboard; Android keeps the KeyboardAvoidingView path.
 */
export const AppModalCard: React.FC<AppModalCardProps> = (props) =>
  Platform.OS === 'ios' ? (
    <IOSKeyboardCard {...props} />
  ) : (
    <AndroidKavCard {...props} />
  );

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
    flexShrink: 1,
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
