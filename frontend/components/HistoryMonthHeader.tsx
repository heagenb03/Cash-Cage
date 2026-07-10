import { StyleSheet } from 'react-native';
import { Text, View } from '@/components/Themed';

export default function HistoryMonthHeader({ label }: { label: string }) {
  return (
    <View style={styles.container}>
      <View style={styles.tick} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 12,
  },
  tick: {
    width: 3,
    height: 12,
    borderRadius: 1.5,
    backgroundColor: 'rgba(176,114,187,0.5)',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(176,114,187,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
});
