import { StyleSheet, ScrollView } from 'react-native';
import { Text, View } from '@/components/Themed';

export default function AccountScreen() {
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Account</Text>
          <Text style={styles.subtitle}>
            View account
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#B072BB',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.6,
    color: '#FFFFFF',
  },
  comingSoon: {
    backgroundColor: '#1A1A1A',
    padding: 28,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#B072BB',
    alignItems: 'center',
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#B072BB',
  },
  comingSoonText: {
    fontSize: 16,
    opacity: 0.6,
    lineHeight: 28,
    color: '#FFFFFF',
  },
});
