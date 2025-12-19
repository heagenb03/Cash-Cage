import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { GameProvider } from '@/contexts/GameContext';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  // Custom dark theme with black and gold
  const CustomDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: '#B072BB',
      background: '#0A0A0A',
      card: '#1A1A1A',
      text: '#FFFFFF',
      border: '#2A2A2A',
      notification: '#B072BB',
    },
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GameProvider>
        <ThemeProvider value={CustomDarkTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
            <Stack.Screen
              name="game/new"
              options={{
                presentation: 'modal',
                title: 'New Game'
              }}
            />
            <Stack.Screen
              name="game/active"
              options={{
                title: 'Active Game'
              }}
            />
            <Stack.Screen
              name="game/summary"
              options={{
                title: 'Game Summary'
              }}
            />
          </Stack>
        </ThemeProvider>
      </GameProvider>
    </GestureHandlerRootView>
  );
}
