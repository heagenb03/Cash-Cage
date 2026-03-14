import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';

import { signInWithEmail, signInWithGoogleCredential, signInWithAppleCredential } from '@/services/firebaseService';

// expo-web-browser and expo-auth-session both require the ExpoWebBrowser native
// module, which is unavailable in Expo Go (requires a development build).
// Using dynamic require() instead of static imports lets us catch the native
// module error at module load time, so the component can still export and
// email/password sign-in works in Expo Go. OAuth requires a dev build.
type GoogleAuthHook = (config: { clientId?: string }) => [
  unknown,
  { type: string; params: { id_token?: string } } | null,
  () => Promise<void>,
];

let useGoogleAuth: GoogleAuthHook = (_config) => [null, null, async () => {}];

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('expo-web-browser').maybeCompleteAuthSession();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  useGoogleAuth = require('expo-auth-session/providers/google').useIdTokenAuthRequest;
} catch {
  // ExpoWebBrowser native module not available (Expo Go) — OAuth disabled,
  // email/password sign-in still works.
}

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  // Google Sign-In via expo-auth-session (unavailable in Expo Go — requires dev build)
  const [request, response, promptAsync] = useGoogleAuth({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        setGoogleLoading(true);
        signInWithGoogleCredential(id_token)
          .then(() => router.replace('/(tabs)' as any))
          .catch((err) => {
            console.error('Google sign-in error:', err);
            Alert.alert('Sign-in failed', 'Google sign-in could not be completed. Please try again.');
          })
          .finally(() => setGoogleLoading(false));
      }
    } else if (response?.type === 'error') {
      Alert.alert('Sign-in failed', 'Google sign-in was cancelled or failed.');
    }
  }, [response]);

  const handleEmailSignIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signInWithEmail(email.trim().toLowerCase(), password);
      router.replace('/(tabs)' as any);
    } catch (err: any) {
      const message = friendlyAuthError(err.code);
      Alert.alert('Sign-in failed', message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      await promptAsync();
    } finally {
      // Loading cleared in the useEffect above after response arrives
      // Set false here as safety valve if promptAsync rejects before response
      setGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert('Not available', 'Apple Sign-In is only available on iOS.');
      return;
    }
    setAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        throw new Error('Apple did not return an identity token.');
      }
      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(' ') || null;

      await signInWithAppleCredential(credential.identityToken, fullName);
      router.replace('/(tabs)' as any);
    } catch (err: any) {
      if (err.code !== 'ERR_REQUEST_CANCELED') {
        console.error('Apple sign-in error:', err);
        Alert.alert('Sign-in failed', 'Apple sign-in could not be completed. Please try again.');
      }
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo / branding */}
        <View style={styles.header}>
          <Text style={styles.logo}>CASH CAGE</Text>
          <View style={styles.logoDivider} />
          <Text style={styles.tagline}>Your poker night, sorted.</Text>
        </View>

        {/* Email / Password form */}
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
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#555"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                textContentType="password"
                onSubmitEditing={handleEmailSignIn}
                returnKeyType="go"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword((v) => !v)}
                activeOpacity={0.6}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color="#666"
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={() => router.push('/(auth)/forgot-password' as any)}
            activeOpacity={0.6}
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleEmailSignIn}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#0A0A0A" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social sign-in */}
        <View style={styles.socialButtons}>
          <TouchableOpacity
            style={[styles.socialButton, (googleLoading || !request) && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading || !request}
            activeOpacity={0.8}
          >
            {googleLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#FFFFFF" />
                <Text style={styles.socialButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.socialButton, appleLoading && styles.buttonDisabled]}
              onPress={handleAppleSignIn}
              disabled={appleLoading}
              activeOpacity={0.8}
            >
              {appleLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
                  <Text style={styles.socialButtonText}>Continue with Apple</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Sign-up link */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity
            onPress={() => router.push('/(auth)/signup' as any)}
            activeOpacity={0.6}
          >
            <Text style={styles.footerLink}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function friendlyAuthError(code: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address is not valid.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed':
      return 'No network connection. Please check your internet and try again.';
    default:
      return 'Sign-in failed. Please try again.';
  }
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
  header: {
    alignItems: 'center',
    marginTop: 48,
    marginBottom: 40,
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: 6,
    color: '#FFFFFF',
  },
  logoDivider: {
    width: 40,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#B072BB',
    marginTop: 8,
    marginBottom: 12,
    shadowColor: '#B072BB',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
    shadowOpacity: 0.7,
  },
  tagline: {
    fontSize: 14,
    color: '#888',
    letterSpacing: 0.5,
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
  passwordRow: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeButton: {
    position: 'absolute',
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -4,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: '#B072BB',
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 28,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2A2A2A',
  },
  dividerText: {
    fontSize: 13,
    color: '#555',
  },
  socialButtons: {
    gap: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingVertical: 14,
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 36,
  },
  footerText: {
    fontSize: 14,
    color: '#888',
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B072BB',
  },
});
