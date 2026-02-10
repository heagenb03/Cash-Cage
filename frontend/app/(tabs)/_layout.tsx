import React, { useState, useCallback, useEffect, useRef } from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, usePathname, useRouter } from 'expo-router';
import { Text, View, TouchableOpacity, Animated, AccessibilityInfo } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

export const unstable_settings = {
  initialRouteName: '(home)',
};

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

function DynamicDealrHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let subscription: any;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (isMounted) {
        setReduceMotion(enabled);
      }
    });

    subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setReduceMotion(enabled);
    });

    return () => {
      isMounted = false;
      subscription?.remove();
    };
  }, []);

  const animateScaleDown = useCallback((scaleValue: number = 0.9) => {
    if (!reduceMotion) {
      Animated.spring(scaleAnim, {
        toValue: scaleValue,
        tension: 300,
        friction: 20,
        useNativeDriver: true
      }).start();
    }
  }, [reduceMotion, scaleAnim]);

  const animateScaleUp = useCallback((velocity: number = 0) => {
    if (!reduceMotion) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 200,
        friction: 15,
        velocity,
        useNativeDriver: true
      }).start();
    }
  }, [reduceMotion, scaleAnim]);

  const isGameScreen = pathname?.includes('/game/');
  const isSettingsScreen = pathname?.includes('/settings');
  const isAboutScreen = pathname?.includes('/about');

  return (
    <View style={{
      backgroundColor: '#0A0A0A',
      paddingTop: insets.top,
    }}>
      <View style={{
        flexDirection: 'row',
        height: 48,
        width: '100%',
        alignItems: 'center',
      }}>
        {/* Left column: Back button (76px fixed width) */}
        <View style={{
          width: 76,
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingLeft: 16,
        }}>
          {(isGameScreen || isSettingsScreen || isAboutScreen) && (
            <TouchableOpacity
              onPress={() => {
                if (isGameScreen) {
                  router.push('/');
                } else {
                  router.back();
                }
              }}
              style={{
                width: 44,
                height: 44,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              activeOpacity={0.6}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <FontAwesome name="arrow-left" size={22} color="#B072BB" />
            </TouchableOpacity>
          )}
        </View>

        {/* Center column: DEALR logo (flex) */}
        <View style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: 'bold',
              letterSpacing: 3,
              color: '#FFFFFF',
            }}
          >
            DEALR
          </Text>
          <View
            style={{
              marginTop: 4,
              width: 40,
              height: 2,
              borderRadius: 1,
              backgroundColor: '#B072BB',
              shadowColor: '#B072BB',
              shadowOffset: { width: 0, height: 0 },
              shadowRadius: 6,
              shadowOpacity: 0.7,
              elevation: 4,
            }}
          />
        </View>

        {/* Right column: Empty spacer (76px fixed width) */}
        <View style={{
          width: 76,
          alignItems: 'flex-end',
          justifyContent: 'center',
          paddingRight: 16,
        }} />
      </View>
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      initialRouteName="(home)"
      screenOptions={{
        tabBarActiveTintColor: Colors.dark.tint,
        tabBarInactiveTintColor: Colors.dark.tabIconDefault,
        tabBarStyle: {
          backgroundColor: '#0A0A0A',
          borderTopColor: '#2A2A2A',
        },
        headerStyle: {
          backgroundColor: '#0A0A0A',
        },
        header: () => <DynamicDealrHeader />,
      }}>
      <Tabs.Screen
        name="(home)"
        options={{
          tabBarLabel: 'Games',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="(profile)"
        options={{
          tabBarLabel: 'Account',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
