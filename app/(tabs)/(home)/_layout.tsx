
import { Platform } from 'react-native';
import { Stack } from 'expo-router';

export default function HomeLayout() {
  console.log('[Home Layout] Rendering home layout for platform:', Platform.OS);
  
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          title: 'Home'
        }}
      />
    </Stack>
  );
}
