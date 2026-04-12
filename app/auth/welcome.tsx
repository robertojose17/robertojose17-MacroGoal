import { Redirect } from 'expo-router';

export default function AuthWelcomeScreen() {
  return <Redirect href="/auth/signup" />;
}
