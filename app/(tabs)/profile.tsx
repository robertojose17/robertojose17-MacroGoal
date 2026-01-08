
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/app/integrations/supabase/client';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  async function loadUserData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      setUserData({ ...user, ...profile });
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.dark.background : colors.light.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.dark.background : colors.light.background }]} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={[styles.profileHeader, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}>
          <IconSymbol 
            ios_icon_name="person.circle.fill" 
            android_material_icon_name="person" 
            size={80} 
            color={colors.primary} 
          />
          <Text style={[styles.name, { color: isDark ? colors.dark.text : colors.light.text }]}>
            {userData?.email?.split('@')[0] || 'User'}
          </Text>
          <Text style={[styles.email, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
            {userData?.email || 'No email'}
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}>
          <View style={styles.infoRow}>
            <IconSymbol 
              ios_icon_name="scalemass.fill" 
              android_material_icon_name="monitor-weight" 
              size={20} 
              color={isDark ? colors.dark.textSecondary : colors.light.textSecondary} 
            />
            <Text style={[styles.infoText, { color: isDark ? colors.dark.text : colors.light.text }]}>
              Weight: {userData?.weight || 'Not set'} lbs
            </Text>
          </View>
          <View style={styles.infoRow}>
            <IconSymbol 
              ios_icon_name="ruler.fill" 
              android_material_icon_name="straighten" 
              size={20} 
              color={isDark ? colors.dark.textSecondary : colors.light.textSecondary} 
            />
            <Text style={[styles.infoText, { color: isDark ? colors.dark.text : colors.light.text }]}>
              Height: {userData?.height || 'Not set'} cm
            </Text>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/edit-goals')}
        >
          <Text style={styles.buttonText}>Edit Goals</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  profileHeader: {
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.xl * 2,
    marginBottom: spacing.md,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: spacing.md,
  },
  email: {
    fontSize: 16,
    marginTop: spacing.xs,
  },
  section: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoText: {
    fontSize: 16,
    marginLeft: spacing.md,
  },
  button: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
