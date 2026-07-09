import React, { useState } from 'react';
import { Modal, TouchableOpacity, StyleSheet, Pressable, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text, View } from '@/components/Themed';
import { Player } from '@/types/game';

interface Props {
  visible: boolean;
  players: Player[];
  mode: 'optimal' | 'banker';
  bankerPlayerId?: string;
  onSelectOptimal: () => void;
  onSelectBanker: (playerId: string) => void;
  onAddBanker: (name: string) => void;
  onClose: () => void;
}

export default function SettlementModePicker({
  visible,
  players,
  mode,
  bankerPlayerId,
  onSelectOptimal,
  onSelectBanker,
  onAddBanker,
  onClose,
}: Props) {
  const [newBanker, setNewBanker] = useState('');

  const handleAdd = () => {
    const name = newBanker.trim();
    if (!name) return;
    onAddBanker(name);
    setNewBanker('');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Pressable style={styles.overlay} onPress={onClose}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.title}>Settlement</Text>

            <ScrollView keyboardShouldPersistTaps="handled">
              {/* Optimal */}
              <TouchableOpacity
                style={styles.row}
                onPress={() => { onSelectOptimal(); onClose(); }}
                activeOpacity={0.7}
              >
                <View style={styles.rowText}>
                  <Text style={styles.label}>Optimal</Text>
                  <Text style={styles.subLabel}>Fewest transfers between players</Text>
                </View>
                {mode === 'optimal' && <Ionicons name="checkmark" size={20} color="#B072BB" />}
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* Banker heading */}
              <Text style={styles.sectionLabel}>BANKER — everyone settles with one player</Text>

              {players.map(p => {
                const active = mode === 'banker' && bankerPlayerId === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.row}
                    onPress={() => { onSelectBanker(p.id); onClose(); }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.rowText}>
                      <Text style={styles.label}>{p.name}</Text>
                    </View>
                    {active && <Ionicons name="checkmark" size={20} color="#B072BB" />}
                  </TouchableOpacity>
                );
              })}

              {/* Add-as-banker (covers a non-playing dealer) */}
              <View style={styles.addRow}>
                <TextInput
                  style={styles.addInput}
                  value={newBanker}
                  onChangeText={setNewBanker}
                  placeholder="+ Add someone as banker"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  returnKeyType="done"
                  onSubmitEditing={handleAdd}
                />
                {newBanker.trim().length > 0 && (
                  <TouchableOpacity style={styles.addButton} onPress={handleAdd} activeOpacity={0.7}>
                    <Ionicons name="add-circle" size={22} color="#B072BB" />
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end', padding: 16 },
  sheet: {
    backgroundColor: '#1A1A1A', borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(176,114,187,0.2)', paddingTop: 20, paddingBottom: 8, maxHeight: '80%',
  },
  title: {
    fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.5)', textAlign: 'center',
    marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase',
  },
  sectionLabel: {
    fontSize: 11, color: 'rgba(176,114,187,0.65)', textTransform: 'uppercase', letterSpacing: 1.5,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 20, backgroundColor: 'transparent',
  },
  rowText: { backgroundColor: 'transparent' },
  label: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  subLabel: { fontSize: 12, fontWeight: '400', color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  divider: { height: 1, backgroundColor: 'rgba(176,114,187,0.1)', marginHorizontal: 20 },
  addRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  addInput: { flex: 1, fontSize: 15, color: '#FFFFFF', paddingVertical: 6 },
  addButton: { paddingLeft: 8 },
  cancelButton: {
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
  },
  cancelText: { fontSize: 16, color: 'rgba(255,255,255,0.5)', fontWeight: '500' },
});
