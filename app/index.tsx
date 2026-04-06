
import { Redirect } from 'expo-router';

// Immediately redirect to the signup screen.
// _layout.tsx will override this with the correct destination once the
// session is resolved (authenticated users go to tabs, unauthenticated
// users stay on signup).
export default function Index() {
  return <Redirect href="/auth/signup" />;
}
