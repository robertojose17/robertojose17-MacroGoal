
// This screen is never actually rendered — _layout.tsx handles all auth-based
// routing before isReady is true (returning null). Once isReady is true the
// navigation effect in _layout.tsx redirects to the correct screen.
// We export a blank component so Expo Router doesn't complain about a missing default export.
import { View } from 'react-native';
export default function Index() {
  return <View />;
}
