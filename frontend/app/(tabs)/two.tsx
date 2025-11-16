import { StyleSheet, ScrollView } from 'react-native';
import { Text, View } from '@/components/Themed';

export default function HistoryScreen() {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>History</Text>
          <Text style={styles.subtitle}>
            View past games and statistics
          </Text>
        </View>
        
        <View style={styles.comingSoon}>
          <Text style={styles.comingSoonTitle}>📊 Coming Soon</Text>
          <Text style={styles.comingSoonText}>
            • Player statistics{'\n'}
            • Win/loss tracking{'\n'}
            • Historical analytics{'\n'}
            • Game trends{'\n'}
            • Export reports
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  comingSoon: {
    backgroundColor: '#2c2c2e',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3a3a3c',
    alignItems: 'center',
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  comingSoonText: {
    fontSize: 16,
    opacity: 0.7,
    lineHeight: 28,
  },
});
