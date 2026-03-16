
import { View } from 'react-native';

// Intentionally blank — _layout.tsx handles all navigation redirects
// based on auth/session state. Rendering a <Redirect> here races with
// the layout's own navigation logic and can cause a blank screen loop.
export default function Index() {
  return <View style={{ flex: 1 }} />;
}
