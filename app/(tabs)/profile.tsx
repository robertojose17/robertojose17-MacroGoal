
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { supabase } from '@/app/integrations/supabase/client';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const loadUserData = async () => {
    try {
      console.log('Loading user data...');
      const { data: { user } } = await supabase.auth.getUser();
      console.log('User:', user);
      
      if (!user) {
        setError('No user found');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const { data, error: dbError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      console.log('User data from DB:', data);
      console.log('DB Error:', dbError);

      if (dbError) throw dbError;
      setUserData(data);
      setError(null);
    } catch (err: any) {
      console.error('Error loading user data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadUserData();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.dark.background : colors.light.background }]} edges={['top']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={isDark ? colors.dark.primary : colors.light.primary} />
          <Text style={[styles.loadingText, { color: isDark ? colors.dark.text : colors.light.text }]}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.dark.background : colors.light.background }]} edges={['top']}>
        <View style={styles.centerContainer}>
          <IconSymbol 
            ios_icon_name="exclamationmark.triangle.fill" 
            android_material_icon_name="error" 
            size={48} 
            color={isDark ? colors.dark.text : colors.light.text} 
          />
          <Text style={[styles.errorText, { color: isDark ? colors.dark.text : colors.light.text }]}>{error}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: isDark ? colors.dark.primary : colors.light.primary }]} onPress={loadUserData}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.dark.background : colors.light.background }]} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={[styles.profileHeader, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}>
          <IconSymbol 
            ios_icon_name="person.circle.fill" 
            android_material_icon_name="account-circle" 
            size={80} 
            color={isDark ? colors.dark.primary : colors.light.primary} 
          />
          <Text style={[styles.name, { color: isDark ? colors.dark.text : colors.light.text }]}>
            {userData?.full_name || 'User'}
          </Text>
          <Text style={[styles.email, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
            {userData?.email || 'No email'}
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? colors.dark.text : colors.light.text }]}>Personal Info</Text>
          
          <View style={styles.infoRow}>
            <IconSymbol 
              ios_icon_name="scalemass.fill" 
              android_material_icon_name="monitor-weight" 
              size={20} 
              color={isDark ? colors.dark.textSecondary : colors.light.textSecondary} 
            />
            <Text style={[styles.infoText, { color: isDark ? colors.dark.text : colors.light.text }]}>
              Weight: {userData?.weight || 'Not set'} {userData?.weight_unit || 'lbs'}
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
              Height: {userData?.height || 'Not set'} {userData?.height_unit || 'in'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <IconSymbol 
              ios_icon_name="calendar" 
              android_material_icon_name="calendar-today" 
              size={20} 
              color={isDark ? colors.dark.textSecondary : colors.light.textSecondary} 
            />
            <Text style={[styles.infoText, { color: isDark ? colors.dark.text : colors.light.text }]}>
              Age: {userData?.date_of_birth ? new Date().getFullYear() - new Date(userData.date_of_birth).getFullYear() : 'Not set'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: isDark ? colors.dark.primary : colors.light.primary }]}
          onPress={() => router.push('/edit-profile')}
        >
          <Text style={styles.buttonText}>Edit Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: isDark ? colors.dark.primary : colors.light.primary }]}
          onPress={() => router.push('/edit-goals')}
        >
          <Text style={styles.buttonText}>Edit Goals</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: isDark ? '#FF3B30' : '#FF3B30' }]}
          onPress={async () => {
            Alert.alert('Logout', 'Are you sure you want to logout?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Logout',
                style: 'destructive',
                onPress: async () => {
                  await supabase.auth.signOut();
                  router.replace('/');
                },
              },
            ]);
          }}
        >
          <Text style={styles.buttonText}>Logout</Text>
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
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    fontSize: 16,
    marginTop: spacing.md,
  },
  profileHeader: {
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  infoText: {
    fontSize: 16,
  },
  button: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  retryButton: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
