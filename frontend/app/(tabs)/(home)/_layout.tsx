import { Stack } from 'expo-router';

export default function HomeLayout() {

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0A0A0A',
        },
        headerTintColor: '#B072BB',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false, // Use the DEALR header from parent tabs layout
        }}
      />
      <Stack.Screen
        name="game/active"
        options={{
          headerShown: false, // Use the DEALR header from parent tabs layout
        }}
      />
      <Stack.Screen
        name="game/summary"
        options={{
          headerShown: false, // Use the DEALR header from parent tabs layout
        }}
      />
    </Stack>
  );
}
