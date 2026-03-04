
import { View, ActivityIndicator } from 'react-native';
import { colors } from '@/styles/commonStyles';

export default function Index() {
  // Root index - just show a loading indicator
  // The _layout.tsx will handle all navigation based on auth state
  console.log('[Index] Root index rendered, waiting for _layout navigation...');
  
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
