import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import ModalButton from '@/components/ModalButton';
import PaymentEditorModal, { PaymentEditorContent } from '@/components/PaymentEditorModal';
import PaywallModal from '@/components/PaywallModal';
import SavedPlayerCard from '@/components/SavedPlayerCard';
import { useAuth } from '@/contexts/AuthContext';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import {
  savePlayer,
  deleteSavedPlayer,
  deleteSavedPlayers,
  addSavedPlayers,
  loadSavedPlayers,
  renameSavedPlayer,
  savedCapFor,
  canAddMoreSavedPlayers,
  FREE_SAVED_CAP,
  PRO_SAVED_CAP,
  SavedPlayer,
} from '@/services/savedPlayersService';
import { PreferredPayment, Player } from '@/types/game';
import { getPaymentMethodMeta } from '@/constants/PaymentMethods';
import { formatHandleForDisplay } from '@/utils/paymentLinks';

type AddRow = { name: string; preferredPayment?: PreferredPayment };
type PaymentTarget =
  | { kind: 'edit'; player: SavedPlayer }
  | { kind: 'row'; index: number }
  | null;

function badgeText(p: SavedPlayer): string | null {
  if (!p.preferredPayment) return null;
  const { method, handle } = p.preferredPayment;
  const label = getPaymentMethodMeta(method).label;
  return handle ? `${label} · ${formatHandleForDisplay(method, handle)}` : label;
}

const BULK_PAYWALL_MESSAGE = 'Upgrade to Pro to bulk-manage your saved players.';
const CAP_PAYWALL_MESSAGE = `You've saved ${FREE_SAVED_CAP} players — the free limit. Upgrade to Pro to save up to ${PRO_SAVED_CAP}.`;

export default function SavedPlayersScreen() {
  const { user, isPro, trialExpired } = useAuth();
  const uid = user?.uid ?? null;
  const cap = savedCapFor(isPro);
  const reduceMotion = useReduceMotion();

  const [players, setPlayers] = useState<SavedPlayer[]>([]);
  const reload = useCallback(() => {
    if (!uid) return;
    loadSavedPlayers(uid, setPlayers)
      .then(setPlayers)
      .catch(() => Alert.alert('Error', 'Could not load saved players.'));
  }, [uid]);
  useEffect(() => {
    reload();
  }, [reload]);

  const sorted = [...players].sort((a, b) =>
    a.name.toLowerCase().localeCompare(b.name.toLowerCase()),
  );

  const [paymentTarget, setPaymentTarget] = useState<PaymentTarget>(null);
  const [renameTarget, setRenameTarget] = useState<SavedPlayer | null>(null);
  const [renameName, setRenameName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<SavedPlayer | null>(null);

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [showAdd, setShowAdd] = useState(false);
  const [addRows, setAddRows] = useState<AddRow[]>([{ name: '' }]);
  const [adding, setAdding] = useState(false);

  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallMessage, setPaywallMessage] = useState(BULK_PAYWALL_MESSAGE);
  const requirePro = useCallback(
    (action: () => void) => {
      if (isPro) action();
      else {
        setPaywallMessage(BULK_PAYWALL_MESSAGE);
        setShowPaywall(true);
      }
    },
    [isPro],
  );

  const toggleSelected = useCallback((name: string) => {
    const lower = name.toLowerCase();
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(lower)) next.delete(lower);
      else next.add(lower);
      return next;
    });
  }, []);
  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelected(new Set());
  }, []);
  const handleBulkDelete = useCallback(() => {
    if (!uid) return;
    const names = players.filter(p => selected.has(p.name.toLowerCase())).map(p => p.name);
    if (names.length === 0) {
      exitSelectMode();
      return;
    }
    deleteSavedPlayers(uid, names)
      .then(() => {
        exitSelectMode();
        reload();
      })
      .catch(() => {
        exitSelectMode();
        Alert.alert('Error', 'Could not delete the selected players.');
      });
  }, [uid, players, selected, exitSelectMode, reload]);

  const openRename = useCallback((p: SavedPlayer) => {
    setRenameTarget(p);
    setRenameName(p.name);
  }, []);

  const handleRename = useCallback(async () => {
    if (!uid || !renameTarget) return;
    const trimmed = renameName.trim();
    if (!trimmed) {
      Alert.alert('Error', 'Player name cannot be empty.');
      return;
    }
    if (trimmed === renameTarget.name) {
      setRenameTarget(null);
      return;
    }
    const res = await renameSavedPlayer(uid, renameTarget.name, trimmed);
    if (!res.ok) {
      if (res.reason === 'conflict') {
        Alert.alert('Name Taken', `A saved player named "${trimmed}" already exists.`);
      } else {
        Alert.alert('Error', 'Could not rename this player.');
      }
      return;
    }
    setRenameTarget(null);
    reload();
  }, [uid, renameTarget, renameName, reload]);

  const handleConfirmDelete = useCallback(() => {
    if (!uid || !deleteTarget) return;
    const name = deleteTarget.name;
    setDeleteTarget(null);
    deleteSavedPlayer(uid, name)
      .then(reload)
      .catch(() => Alert.alert('Error', 'Could not delete this player.'));
  }, [uid, deleteTarget, reload]);

  const openAdd = useCallback(() => {
    setAddRows([{ name: '' }]);
    setShowAdd(true);
  }, []);
  const handleAddPress = useCallback(() => {
    if (canAddMoreSavedPlayers(players.length, isPro)) {
      openAdd();
    } else if (isPro) {
      Alert.alert(
        'Saved Players Full',
        `You've reached the ${PRO_SAVED_CAP}-player limit. Delete some players to add more.`,
      );
    } else {
      setPaywallMessage(CAP_PAYWALL_MESSAGE);
      setShowPaywall(true);
    }
  }, [players.length, isPro, openAdd]);
  const updateRowName = (i: number, name: string) =>
    setAddRows(rows => rows.map((r, idx) => (idx === i ? { ...r, name } : r)));
  const addAnotherRow = () => setAddRows(rows => [...rows, { name: '' }]);
  const handleAddAll = useCallback(async () => {
    if (adding) return;
    const entries = addRows
      .map(r => ({ name: r.name.trim(), preferredPayment: r.preferredPayment }))
      .filter(r => r.name.length > 0);
    if (entries.length === 0) {
      setShowAdd(false);
      return;
    }
    setAdding(true);
    try {
      if (!uid) return;
      const { added, updated, skippedFull } = await addSavedPlayers(uid, entries, { limit: cap });
      setShowAdd(false);
      reload();
      const parts: string[] = [];
      if (added) parts.push(`${added} added`);
      if (updated) parts.push(`${updated} updated`);
      if (skippedFull) parts.push(`${skippedFull} skipped (list full)`);
      Alert.alert('Saved Players', parts.join(' · ') || 'No changes.', [
        {
          text: 'OK',
          onPress: () => {
            if (skippedFull > 0 && !isPro) {
              setPaywallMessage(CAP_PAYWALL_MESSAGE);
              setShowPaywall(true);
            }
          },
        },
      ]);
    } catch {
      setShowAdd(false);
      Alert.alert('Error', 'Could not add players. Please try again.');
    } finally {
      setAdding(false);
    }
  }, [uid, adding, addRows, cap, reload, isPro]);

  // Shared PaymentEditorModal target → synthetic Player (its player prop is init-only).
  // useMemo keyed on paymentTarget gives a STABLE reference: PaymentEditorModal re-seeds
  // its fields on [visible, player], so a fresh object each render (e.g. from AuthContext's
  // trial-timer re-render) would wipe what the user is typing. The snapshot is captured at
  // open time, which is exactly what a re-seed-on-open editor wants.
  const paymentPlayer: Player | null = useMemo(() => {
    if (!paymentTarget) return null;
    if (paymentTarget.kind === 'edit') {
      const p = paymentTarget.player;
      return { id: p.name, name: p.name, preferredPayment: p.preferredPayment };
    }
    const row = addRows[paymentTarget.index];
    return {
      id: `row-${paymentTarget.index}`,
      name: row?.name || 'Player',
      preferredPayment: row?.preferredPayment,
    };
    // addRows intentionally omitted: capture the row snapshot at open time only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentTarget]);
  const handlePaymentSave = useCallback(
    (pref: PreferredPayment) => {
      if (!paymentTarget) return;
      if (paymentTarget.kind === 'edit') {
        if (uid) savePlayer(uid, paymentTarget.player.name, pref, cap).then(() => {
          setPaymentTarget(null);
          reload();
        });
      } else {
        const i = paymentTarget.index;
        setAddRows(rows => rows.map((r, idx) => (idx === i ? { ...r, preferredPayment: pref } : r)));
        setPaymentTarget(null);
      }
    },
    [uid, paymentTarget, cap, reload],
  );

  const renderRow = (p: SavedPlayer) => {
    const badge = badgeText(p);
    const textBlock = (
      <View style={styles.rowTextWrap}>
        <Text style={styles.rowName}>{p.name}</Text>
        {badge ? (
          <Text style={styles.rowBadge} numberOfLines={1}>{badge}</Text>
        ) : (
          <Text style={styles.rowBadgeMuted}>No payment set</Text>
        )}
      </View>
    );

    if (selectMode) {
      const isSel = selected.has(p.name.toLowerCase());
      return (
        <TouchableOpacity key={p.name} style={styles.row} onPress={() => toggleSelected(p.name)} activeOpacity={0.7}>
          <Ionicons
            name={isSel ? 'checkbox' : 'square-outline'}
            size={22}
            color={isSel ? '#B072BB' : '#666'}
            style={styles.checkbox}
          />
          {textBlock}
        </TouchableOpacity>
      );
    }

    return (
      <SavedPlayerCard
        key={p.name}
        player={p}
        onRename={openRename}
        onEditPayment={pl => setPaymentTarget({ kind: 'edit', player: pl })}
        onDelete={pl => setDeleteTarget(pl)}
        reduceMotion={reduceMotion}
      />
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.topSide}>
          {selectMode ? (
            <TouchableOpacity onPress={exitSelectMode}>
              <Text style={styles.topAction}>Cancel</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={() => requirePro(() => setSelectMode(true))}>
              <Text style={styles.topAction}>Select</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.title}>Saved Players</Text>
        <View style={[styles.topSide, styles.topSideRight]}>
          {!selectMode && (
            <TouchableOpacity
              onPress={handleAddPress}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="add" size={26} color="#B072BB" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!isPro && !canAddMoreSavedPlayers(players.length, isPro) ? (
        <TouchableOpacity
          onPress={() => {
            setPaywallMessage(CAP_PAYWALL_MESSAGE);
            setShowPaywall(true);
          }}
        >
          <Text style={[styles.capCounter, styles.capCounterFull]}>
            {players.length} / {cap} · Upgrade for {PRO_SAVED_CAP}
          </Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.capCounter}>
          {players.length} / {cap} saved
        </Text>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {sorted.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={40} color="#3A3A3A" />
            <Text style={styles.emptyText}>No saved players yet</Text>
            <Text style={styles.emptySub}>Players you add to games are saved here for quick reuse.</Text>
          </View>
        ) : (
          sorted.map(renderRow)
        )}
      </ScrollView>

      {selectMode && (
        <View style={styles.bulkBar}>
          <ModalButton
            variant="destructive"
            title={`Delete (${selected.size})`}
            onPress={handleBulkDelete}
            disabled={selected.size === 0}
            fullWidth
          />
        </View>
      )}

      <Modal visible={showAdd} animationType="fade" transparent onRequestClose={() => setShowAdd(false)}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Add players</Text>
                <ScrollView style={styles.addRowsScroll} keyboardShouldPersistTaps="handled">
                  {addRows.map((row, i) => (
                    <View key={i} style={styles.addRow}>
                      <TextInput
                        style={styles.addRowInput}
                        value={row.name}
                        onChangeText={t => updateRowName(i, t)}
                        placeholder="Name"
                        placeholderTextColor="rgba(255,255,255,0.3)"
                        autoCapitalize="words"
                        autoCorrect={false}
                      />
                      <TouchableOpacity
                        style={styles.rowPayBtn}
                        onPress={() => setPaymentTarget({ kind: 'row', index: i })}
                      >
                        <Text style={styles.rowPayText} numberOfLines={1}>
                          {row.preferredPayment ? getPaymentMethodMeta(row.preferredPayment.method).label : '+ Payment'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
                <TouchableOpacity onPress={addAnotherRow} style={styles.addAnother}>
                  <Ionicons name="add-circle-outline" size={18} color="#B072BB" />
                  <Text style={styles.addAnotherText}>Add another</Text>
                </TouchableOpacity>
                <View style={styles.modalButtons}>
                  <ModalButton variant="cancel" title="Cancel" onPress={() => setShowAdd(false)} />
                  <ModalButton variant="confirm" title="Add" onPress={handleAddAll} disabled={adding} />
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
          {/* Payment editor for a row is rendered IN PLACE here (not as its own
              <Modal>) because iOS can only present one native modal at a time — a
              second <Modal> opened over this one is silently dropped. */}
          {paymentTarget?.kind === 'row' && (
            <PaymentEditorContent
              player={paymentPlayer}
              onSave={handlePaymentSave}
              onClose={() => setPaymentTarget(null)}
            />
          )}
        </GestureHandlerRootView>
      </Modal>

      {/* Edit path (tapping a saved player) has no other modal open, so it uses
          its own native modal. The 'row' path is handled in-place above. */}
      <PaymentEditorModal
        visible={paymentTarget?.kind === 'edit'}
        player={paymentPlayer}
        onSave={handlePaymentSave}
        onClose={() => setPaymentTarget(null)}
      />

      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        triggerMessage={paywallMessage}
        trialExpired={trialExpired}
      />

      <Modal
        visible={renameTarget !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setRenameTarget(null)}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Rename Player</Text>
                <TextInput
                  style={styles.renameInput}
                  value={renameName}
                  onChangeText={setRenameName}
                  placeholder="New name"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleRename}
                />
                <View style={styles.modalButtons}>
                  <ModalButton variant="cancel" title="Cancel" onPress={() => setRenameTarget(null)} />
                  <ModalButton variant="confirm" title="Save" onPress={handleRename} />
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </GestureHandlerRootView>
      </Modal>

      <Modal
        visible={deleteTarget !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setDeleteTarget(null)}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Ionicons name="warning" size={48} color="#C04657" style={styles.warningIcon} />
              <Text style={styles.modalTitle}>Delete Player?</Text>
              <Text style={styles.deleteWarningText}>
                This will remove {deleteTarget?.name} from your saved players.
                {'\n\n'}This action cannot be undone.
              </Text>
              <View style={styles.modalButtons}>
                <ModalButton variant="cancel" title="Cancel" onPress={() => setDeleteTarget(null)} />
                <ModalButton variant="destructive" title="Delete" onPress={handleConfirmDelete} />
              </View>
            </View>
          </View>
        </GestureHandlerRootView>
      </Modal>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  topSide: { width: 70, alignItems: 'flex-start' },
  topSideRight: { alignItems: 'flex-end' },
  topAction: { fontSize: 15, color: '#B072BB', fontWeight: '600' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', letterSpacing: 1 },
  capCounter: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
    fontFamily: 'SpaceMono',
    letterSpacing: 1,
    paddingBottom: 4,
  },
  capCounterFull: { color: '#B072BB' },
  scrollContent: { padding: 20, paddingTop: 8, paddingBottom: 40, gap: 10 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161616',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#242424',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  checkbox: { marginRight: 2 },
  rowTextWrap: { flex: 1, gap: 3 },
  rowName: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' },
  rowBadge: { fontSize: 12, color: 'rgba(176,114,187,0.9)', fontFamily: 'SpaceMono' },
  rowBadgeMuted: { fontSize: 12, color: 'rgba(255,255,255,0.35)' },
  deleteAction: {
    backgroundColor: '#1A1414',
    justifyContent: 'center',
    alignItems: 'center',
    width: 72,
    marginLeft: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(192,70,87,0.25)',
  },
  empty: { alignItems: 'center', paddingVertical: 64, gap: 10 },
  emptyText: { fontSize: 16, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  emptySub: { fontSize: 13, color: 'rgba(255,255,255,0.35)', textAlign: 'center', paddingHorizontal: 24 },
  bulkBar: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
    backgroundColor: '#0A0A0A',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(176,114,187,0.2)',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', marginBottom: 16 },
  addRowsScroll: { maxHeight: 260 },
  addRow: { flexDirection: 'row', gap: 8, marginBottom: 10, alignItems: 'stretch' },
  addRowInput: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(176,114,187,0.3)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#FFFFFF',
  },
  rowPayBtn: {
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(176,114,187,0.3)',
    borderRadius: 10,
    minWidth: 96,
    alignItems: 'center',
  },
  rowPayText: { fontSize: 12, color: 'rgba(176,114,187,0.9)' },
  addAnother: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: 4, marginBottom: 16 },
  addAnotherText: { fontSize: 14, color: '#B072BB', fontWeight: '600' },
  modalButtons: { flexDirection: 'row', gap: 10 },
  renameInput: {
    width: '100%',
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: 'rgba(176,114,187,0.3)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 16,
  },
  warningIcon: { alignSelf: 'center', marginBottom: 12 },
  deleteWarningText: {
    fontSize: 15,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
    opacity: 0.8,
  },
});
