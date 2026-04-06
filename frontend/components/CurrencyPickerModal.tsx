import React from 'react';
import { Modal, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Text, View } from '@/components/Themed';
import { CurrencyCode, CurrencyMeta, SUPPORTED_CURRENCIES } from '@/constants/Currencies';

interface CurrencyPickerModalProps {
  visible: boolean;
  currentCode: CurrencyCode;
  onSelect: (code: CurrencyCode) => void;
  onClose: () => void;
}

const CURRENCIES = Object.values(SUPPORTED_CURRENCIES);

export default function CurrencyPickerModal({
  visible,
  currentCode,
  onSelect,
  onClose,
}: CurrencyPickerModalProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <Text style={styles.title}>Currency</Text>
            <FlatList
              data={CURRENCIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }: { item: CurrencyMeta }) => (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => {
                    onSelect(item.code);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowLeft}>
                    <Text style={styles.symbol}>{item.symbol}</Text>
                    <View style={styles.rowLabels}>
                      <Text style={styles.code}>{item.code}</Text>
                      <Text style={styles.name}>{item.name}</Text>
                    </View>
                  </View>
                  {item.code === currentCode && (
                    <Ionicons name="checkmark" size={20} color="#B072BB" />
                  )}
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.divider} />}
            />
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  sheet: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(176,114,187,0.2)',
    paddingTop: 20,
    paddingBottom: 8,
    maxHeight: '80%',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'transparent',
  },
  symbol: {
    fontSize: 18,
    color: '#FFFFFF',
    width: 28,
    textAlign: 'center',
  },
  rowLabels: {
    backgroundColor: 'transparent',
  },
  code: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(176,114,187,0.1)',
    marginHorizontal: 20,
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  cancelText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
});
