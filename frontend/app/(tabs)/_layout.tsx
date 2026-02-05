import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

function DealrHeader() {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 2 }}>
      <Text
        style={{
          fontSize: 22,
          fontWeight: 'bold',
          letterSpacing: 6,
          color: '#FFFFFF',
          textShadowColor: '#B072BB',
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 12,
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
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
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
        headerTitle: () => <DealrHeader />,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: 'Games',
          tabBarIcon: ({ color }) => <TabBarIcon name="home" color={color} />,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          tabBarLabel: 'Account',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
