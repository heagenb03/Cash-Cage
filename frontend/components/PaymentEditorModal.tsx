import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Player, PreferredPayment, PaymentMethod } from '@/types/game';
import { PAYMENT_METHODS, getPaymentMethodMeta } from '@/constants/PaymentMethods';
import { normalizeHandle } from '@/utils/paymentLinks';
import ModalButton from '@/components/ModalButton';
import { modalLayoutStyles } from '@/styles/modal';

interface PaymentEditorModalProps {
  visible: boolean;
  player: Player | null;
  onSave: (pref: PreferredPayment) => void;
  onClose: () => void;
}

interface PaymentEditorContentProps {
  player: Player | null;
  onSave: (pref: PreferredPayment) => void;
  onClose: () => void;
  /**
   * Whether the editor is being presented. Drives the re-seed effect.
   * Defaults to true for callers (e.g. the in-place overlay inside another
   * modal) that mount this component only while it is shown.
   */
  visible?: boolean;
}

/**
 * The editor's UI without a `<Modal>` wrapper. Rendered as an absolute-fill
 * overlay so it can be presented either inside `PaymentEditorModal`'s own
 * native modal OR directly inside another already-open modal (iOS can only
 * present one native modal at a time, so a second `<Modal>` would be silently
 * dropped — see the Add-players flow in saved-players.tsx).
 *
 * A GestureHandlerRootView ancestor must be provided by the caller (the modal
 * wrapper or the host modal) so the gesture-based ModalButtons work.
 */
export const PaymentEditorContent: React.FC<PaymentEditorContentProps> = ({
  player,
  onSave,
  onClose,
  visible = true,
}) => {
  const initialMethod = player?.preferredPayment?.method ?? 'cash';
  const [method, setMethod] = useState<PaymentMethod>(initialMethod);
  const [handle, setHandle] = useState(() =>
    normalizeHandle(initialMethod, player?.preferredPayment?.handle ?? ''),
  );

  // Re-seed local state from the player's saved preference each time the editor
  // opens. normalizeHandle strips any legacy affix so the field shows the bare
  // handle. (useState initializers above cover the mount-fresh-each-open case.)
  useEffect(() => {
    if (!visible) return;
    const seedMethod = player?.preferredPayment?.method ?? 'cash';
    setMethod(seedMethod);
    setHandle(normalizeHandle(seedMethod, player?.preferredPayment?.handle ?? ''));
  }, [visible, player]);

  const meta = getPaymentMethodMeta(method);

  const handleSave = () => {
    const pref: PreferredPayment = {
      method,
      handle: meta.takesHandle ? (normalizeHandle(method, handle) || undefined) : undefined,
    };
    onSave(pref);
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.content}>
        <Text style={styles.title}>Preferred payment</Text>

        <View style={styles.grid}>
          {PAYMENT_METHODS.map((m) => {
            const selected = method === m.key;
            const fullWidth = m.key === 'other';
            return (
              <TouchableOpacity
                key={m.key}
                onPress={() => setMethod(m.key)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[
                  styles.tile,
                  fullWidth ? styles.tileFull : styles.tileHalf,
                  selected && styles.tileSelected,
                ]}
              >
                <Text style={[styles.tileText, selected && styles.tileTextSelected]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {meta.takesHandle && (
          <View style={styles.handleRow}>
            {meta.affix ? (
              <View style={styles.affixBox}>
                <Text style={styles.affixText}>{meta.affix}</Text>
              </View>
            ) : null}
            <TextInput
              value={handle}
              onChangeText={setHandle}
              placeholder={meta.handlePlaceholder}
              placeholderTextColor="rgba(255,255,255,0.3)"
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, meta.affix ? styles.inputWithAffix : styles.inputPlain]}
            />
          </View>
        )}

        <View style={[modalLayoutStyles.modalButtons, styles.buttons]}>
          <ModalButton variant="cancel" title="Cancel" onPress={onClose} />
          <ModalButton variant="confirm" title="Save" onPress={handleSave} />
        </View>
      </View>
    </View>
  );
};

const PaymentEditorModal: React.FC<PaymentEditorModalProps> = ({ visible, player, onSave, onClose }) => {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <PaymentEditorContent visible={visible} player={player} onSave={onSave} onClose={onClose} />
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  content: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 10,
  },
  tile: {
    minHeight: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#0A0A0A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  tileHalf: {
    width: '48%',
  },
  tileFull: {
    width: '100%',
  },
  tileSelected: {
    backgroundColor: '#49264F',
    borderColor: '#B072BB',
  },
  tileText: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
  },
  tileTextSelected: {
    color: '#FFFFFF',
  },
  handleRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: 16,
  },
  affixBox: {
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderRightWidth: 0,
    borderColor: '#2A2A2A',
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
  },
  affixText: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.6)',
  },
  input: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    padding: 16,
    fontSize: 18,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  inputPlain: {
    borderRadius: 6,
  },
  inputWithAffix: {
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  buttons: {
    marginTop: 24,
  },
});

export default PaymentEditorModal;
