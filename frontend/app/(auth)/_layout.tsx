import { Stack } from 'expo-router';

/**
 * Auth stack — rendered when the user is not signed in.
 * No tab bar, no DEALR header. Clean white-on-black layout.
 */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
