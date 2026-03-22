import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { resetPassword } from '@/services/firebaseService';

type ScreenState = 'input' | 'sent';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<ScreenState>('input');

  const handleSubmit = async () => {
    if (!email.trim()) return;

    setLoading(true);
    try {
      // Always call reset — Firebase will handle invalid email silently on our end.
      // We always show success to prevent email enumeration.
      await resetPassword(email.trim().toLowerCase());
    } catch {
      // Intentionally swallowed — always show the success state
    } finally {
      setLoading(false);
      setState('sent');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <View style={styles.navRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.6}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={24} color="#B072BB" />
          </TouchableOpacity>
        </View>

        {state === 'input' ? (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter your email address and we'll send you a link to reset your password.
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor="#555"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  onSubmitEditing={handleSubmit}
                  returnKeyType="send"
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, (loading || !email.trim()) && styles.buttonDisabled]}
                onPress={handleSubmit}
                disabled={loading || !email.trim()}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#0A0A0A" />
                ) : (
                  <Text style={styles.primaryButtonText}>Send Reset Link</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Ionicons name="mail-outline" size={48} color="#B072BB" />
            </View>
            <Text style={styles.successTitle}>Check your email</Text>
            <Text style={styles.successMessage}>
              If an account exists for <Text style={styles.emailHighlight}>{email.trim()}</Text>,
              you'll receive a password reset link shortly.
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, styles.successButton]}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  navRow: {
    height: 48,
    justifyContent: 'center',
    marginTop: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginTop: 16,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
    lineHeight: 22,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#AAAAAA',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#FFFFFF',
  },
  primaryButton: {
    backgroundColor: '#B072BB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0A0A0A',
    letterSpacing: 0.5,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 48,
    gap: 20,
  },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: 'rgba(176,114,187,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  successMessage: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  emailHighlight: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  successButton: {
    alignSelf: 'stretch',
    marginTop: 8,
  },
});
