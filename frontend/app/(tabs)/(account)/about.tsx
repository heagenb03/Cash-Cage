import { StyleSheet, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, View } from '@/components/Themed';
import HudSectionHeader from '@/components/HudSectionHeader';

export default function AboutScreen() {
  const handleEmailPress = () => {
    const email = 'dealrpokerapp@gmail.com';
    const mailto = `mailto:${email}`;
    Linking.openURL(mailto).catch(err => {
      console.error('Failed to open email client:', err);
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Overview Section */}
        <View style={styles.section}>
          <HudSectionHeader label="Overview" centered={true} />

          <View style={styles.contentCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Team</Text>
              <Text style={styles.infoValue}>Heagen Bell</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Started</Text>
              <Text style={styles.infoValue}>October 2025</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Contact</Text>
              <Text style={styles.infoValueLink} onPress={handleEmailPress}>
                dealrpokerapp@gmail.com
              </Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Platforms</Text>
              <View style={styles.platformIcons}>
                <Ionicons name="logo-apple" size={20} color="#FFFFFF" style={styles.platformIcon} />
                <Ionicons name="logo-android" size={20} color="#FFFFFF" style={styles.platformIcon} />
              </View>
            </View>
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <HudSectionHeader label="About" centered={true} />

          <View style={styles.contentCard}>
            <Text style={styles.bodyText}>
              Dealr is a poker buyin and cashout tracking application designed to simplify
              game management for casual poker nights and serious tournaments alike.
            </Text>
            <Text style={styles.bodyText}>
              Track player transactions, calculate optimal settlements, and maintain
              complete transparency with minimal effort.
            </Text>
            <Text style={styles.bodyText}>
              Built with a focus on speed, accuracy, and a clean user experience that
              stays out of your way.
            </Text>
          </View>
        </View>

        {/* History Section */}
        <View style={styles.section}>
          <HudSectionHeader label="History" centered={true} />

          <View style={styles.contentCard}>
            <Text style={styles.bodyText}>
              The idea for Dealr was born out of the frustration of managing cash games with pen, paper, and mental math. 
              After a particularly chaotic poker night in early 2025, Heagen decided there had to be a better way.
            </Text>
            <Text style={styles.bodyText}>
              Development began in mid-2025 with a focus on creating a tool that was both powerful and intuitive. 
              Early versions were tested with local poker groups, leading to continuous improvements based on real user feedback.
            </Text>
            <Text style={styles.bodyText}>
              Dealr officially launched in October 2025 and has been steadily growing its user base among poker enthusiasts who value precision and ease of use.
            </Text>
          </View>
        </View>

        {/* App Info Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Dealr v1.0.0</Text>
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
    marginBottom: 32,
    backgroundColor: 'transparent',
  },
  contentCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(176,114,187,0.2)',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    backgroundColor: 'transparent',
  },
  infoLabel: {
    fontSize: 15,
    color: '#FFFFFF',
    opacity: 0.5,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  infoValueLink: {
    fontSize: 15,
    color: '#B072BB',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  platformIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  platformIcon: {
    marginLeft: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(176,114,187,0.1)',
    marginVertical: 12,
  },
  bodyText: {
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 24,
    opacity: 0.85,
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 28,
    backgroundColor: 'transparent',
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#B072BB',
    marginTop: 4,
    marginRight: 16,
    borderWidth: 2,
    borderColor: 'rgba(176,114,187,0.3)',
  },
  timelineContent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  timelineDate: {
    fontSize: 12,
    color: '#B072BB',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  timelineTitle: {
    fontSize: 17,
    color: '#FFFFFF',
    fontWeight: '600',
    marginBottom: 6,
  },
  timelineDescription: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.7,
    lineHeight: 22,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: 'transparent',
  },
  footerText: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.4,
    fontWeight: '600',
    marginBottom: 4,
  },
  footerTextSecondary: {
    fontSize: 12,
    color: '#B072BB',
    opacity: 0.6,
    fontWeight: '500',
  },
});
