import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { COLORS } from '@/constants/Colors';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.replace('/(tabs)');
    } else {
      router.replace('/auth-screen');
    }
  }, [user, loading, router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background }}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}
