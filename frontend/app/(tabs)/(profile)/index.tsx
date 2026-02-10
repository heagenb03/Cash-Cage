import { StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, View } from '@/components/Themed';
import HudSectionHeader from '@/components/HudSectionHeader';

export default function AccountScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <HudSectionHeader
            label="Account"
            centered={true}
            showSettingsIcon={true}
            onSettingsPress={() => router.push('/(tabs)/(profile)/settings' as any)}
          />

          <View style={styles.placeholderCard}>
            <View style={styles.placeholderIconRing}>
              <Ionicons name="person-circle-outline" size={64} color="#B072BB" />
            </View>
            <Text style={styles.placeholderTitle}>
              Account Features Coming Soon
            </Text>
            <Text style={styles.placeholderMessage}>
              Sign in, track stats, and sync your games across devices in a future update.
            </Text>
          </View>
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
  section: {
    marginBottom: 28,
    backgroundColor: 'transparent',
  },
  placeholderCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(176,114,187,0.2)',
  },
  placeholderIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(176,114,187,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  placeholderMessage: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.6,
    textAlign: 'center',
    lineHeight: 22,
  },
});
