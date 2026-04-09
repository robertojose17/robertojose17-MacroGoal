import React from 'react';
import { View, ActivityIndicator } from 'react-native';

// This screen is shown briefly while _layout.tsx initializes auth and navigates away.
// It must be minimal — no timers, no state, no effects that could block navigation.
export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#5B9AA8" />
    </View>
  );
}
