import { StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Text, View } from '@/components/Themed';
import HudSectionHeader from '@/components/HudSectionHeader';

export default function SettingsScreen() {
  const router = useRouter();

  const handleHelpPress = () => {
    // TODO: Replace with actual support email
    const email = 'support@dealr.app';
    const subject = 'Dealr Support Request';
    const mailto = `mailto:${email}?subject=${encodeURIComponent(subject)}`;

    Linking.openURL(mailto).catch(err => {
      console.error('Failed to open email client:', err);
    });
  };

  const handleAboutPress = () => {
    router.push('/(tabs)/(profile)/about' as any);
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <HudSectionHeader label="Settings" centered={true} />

          <View style={styles.placeholderCard}>
            <View style={styles.placeholderIconRing}>
              <Ionicons name="construct-outline" size={64} color="#B072BB" />
            </View>
            <Text style={styles.placeholderTitle}>
              Settings Coming Soon
            </Text>
            <Text style={styles.placeholderMessage}>
              Customize notifications, display preferences, and more in a future update.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <HudSectionHeader label="Other" centered={true} />

          <View style={styles.menuCard}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleHelpPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="help-circle-outline" size={24} color="#B072BB" />
                <Text style={styles.menuItemLabel}>Help</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>

            <View style={styles.menuDivider} />

            <TouchableOpacity
              style={styles.menuItem}
              onPress={handleAboutPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name="information-circle-outline" size={24} color="#B072BB" />
                <Text style={styles.menuItemLabel}>About</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
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
  menuCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(176,114,187,0.2)',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'transparent',
  },
  menuItemLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(176,114,187,0.1)',
    marginHorizontal: 20,
  },
});
