
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/app/integrations/supabase/client';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';

interface UserProfile {
  email: string;
  sex: string;
  date_of_birth: string;
  height: number;
  current_weight: number;
  activity_level: string;
  weight_unit: string;
}

interface Goal {
  goal_type: string;
  daily_calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  fiber_g: number;
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      console.log('Loading profile data...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found');
        setError('Not authenticated');
        return;
      }

      console.log('User ID:', user.id);

      // Load profile with correct column names
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('email, sex, date_of_birth, height, current_weight, activity_level, weight_unit')
        .eq('id', user.id)
        .single();

      console.log('Profile data:', profileData);
      console.log('Profile error:', profileError);

      if (profileError) throw profileError;
      setProfile(profileData);

      // Load active goal
      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .select('goal_type, daily_calories, protein_g, carbs_g, fats_g, fiber_g')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      console.log('Goal data:', goalData);
      console.log('Goal error:', goalError);

      if (goalError && goalError.code !== 'PGRST116') throw goalError;
      setGoal(goalData);

      setError(null);
    } catch (err: any) {
      console.error('Error loading profile:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const calculateAge = (dob: string) => {
    if (!dob) return 'N/A';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getActivityLabel = (level: string) => {
    const labels: Record<string, string> = {
      sedentary: 'Sedentary',
      light: 'Lightly Active',
      lightly_active: 'Lightly Active',
      moderate: 'Moderately Active',
      moderately_active: 'Moderately Active',
      active: 'Very Active',
      very_active: 'Very Active',
      extra_active: 'Extra Active',
    };
    return labels[level] || level;
  };

  const getGoalLabel = (type: string) => {
    const labels: Record<string, string> = {
      lose: 'Lose Weight',
      maintain: 'Maintain Weight',
      gain: 'Gain Weight',
    };
    return labels[type] || type;
  };

  const formatWeight = (weight: number, unit: string) => {
    if (!weight) return 'N/A';
    return `${Math.round(weight)} ${unit}`;
  };

  const formatHeight = (height: number) => {
    if (!height) return 'N/A';
    return `${Math.round(height)} cm`;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.dark.background : colors.light.background }]} edges={['top']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={isDark ? colors.dark.primary : colors.light.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.dark.background : colors.light.background }]} edges={['top']}>
        <View style={styles.centerContainer}>
          <IconSymbol ios_icon_name="exclamationmark.triangle" android_material_icon_name="error" size={48} color={isDark ? colors.dark.textSecondary : colors.light.textSecondary} />
          <Text style={[styles.errorText, { color: isDark ? colors.dark.text : colors.light.text }]}>
            {error || 'Failed to load profile'}
          </Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: isDark ? colors.dark.primary : colors.light.primary }]} onPress={loadData}>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? colors.dark.primary : colors.light.primary} />}
      >
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}>
          <IconSymbol ios_icon_name="person.circle.fill" android_material_icon_name="account-circle" size={80} color={isDark ? colors.dark.primary : colors.light.primary} />
          <Text style={[styles.name, { color: isDark ? colors.dark.text : colors.light.text }]}>
            {profile.email ? profile.email.split('@')[0] : 'User'}
          </Text>
          <Text style={[styles.email, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
            {profile.email || 'No email'}
          </Text>
        </View>

        {/* Personal Info */}
        <View style={[styles.section, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? colors.dark.text : colors.light.text }]}>Personal Info</Text>
          
          {profile.date_of_birth && (
            <View style={styles.infoRow}>
              <IconSymbol ios_icon_name="calendar" android_material_icon_name="calendar-today" size={20} color={isDark ? colors.dark.textSecondary : colors.light.textSecondary} />
              <Text style={[styles.infoLabel, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>Age</Text>
              <Text style={[styles.infoValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
                {calculateAge(profile.date_of_birth)} years
              </Text>
            </View>
          )}

          {profile.sex && (
            <View style={styles.infoRow}>
              <IconSymbol ios_icon_name="person" android_material_icon_name="person" size={20} color={isDark ? colors.dark.textSecondary : colors.light.textSecondary} />
              <Text style={[styles.infoLabel, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>Sex</Text>
              <Text style={[styles.infoValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
                {profile.sex === 'male' ? 'Male' : profile.sex === 'female' ? 'Female' : 'Other'}
              </Text>
            </View>
          )}

          {profile.height && (
            <View style={styles.infoRow}>
              <IconSymbol ios_icon_name="arrow.up.and.down" android_material_icon_name="height" size={20} color={isDark ? colors.dark.textSecondary : colors.light.textSecondary} />
              <Text style={[styles.infoLabel, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>Height</Text>
              <Text style={[styles.infoValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
                {formatHeight(profile.height)}
              </Text>
            </View>
          )}

          {profile.current_weight && (
            <View style={styles.infoRow}>
              <IconSymbol ios_icon_name="scalemass" android_material_icon_name="monitor-weight" size={20} color={isDark ? colors.dark.textSecondary : colors.light.textSecondary} />
              <Text style={[styles.infoLabel, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>Weight</Text>
              <Text style={[styles.infoValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
                {formatWeight(profile.current_weight, profile.weight_unit || 'kg')}
              </Text>
            </View>
          )}

          {profile.activity_level && (
            <View style={styles.infoRow}>
              <IconSymbol ios_icon_name="figure.walk" android_material_icon_name="directions-walk" size={20} color={isDark ? colors.dark.textSecondary : colors.light.textSecondary} />
              <Text style={[styles.infoLabel, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>Activity</Text>
              <Text style={[styles.infoValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
                {getActivityLabel(profile.activity_level)}
              </Text>
            </View>
          )}
        </View>

        {/* Goals */}
        {goal && (
          <View style={[styles.section, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: isDark ? colors.dark.text : colors.light.text }]}>Current Goals</Text>
              <TouchableOpacity onPress={() => router.push('/edit-goals')}>
                <Text style={[styles.editButton, { color: isDark ? colors.dark.primary : colors.light.primary }]}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoRow}>
              <IconSymbol ios_icon_name="target" android_material_icon_name="flag" size={20} color={isDark ? colors.dark.textSecondary : colors.light.textSecondary} />
              <Text style={[styles.infoLabel, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>Goal Type</Text>
              <Text style={[styles.infoValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
                {getGoalLabel(goal.goal_type)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <IconSymbol ios_icon_name="flame" android_material_icon_name="local-fire-department" size={20} color={isDark ? colors.dark.textSecondary : colors.light.textSecondary} />
              <Text style={[styles.infoLabel, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>Calories</Text>
              <Text style={[styles.infoValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
                {Math.round(goal.daily_calories)} kcal
              </Text>
            </View>

            <View style={styles.infoRow}>
              <IconSymbol ios_icon_name="p.circle" android_material_icon_name="fitness-center" size={20} color={isDark ? colors.dark.textSecondary : colors.light.textSecondary} />
              <Text style={[styles.infoLabel, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>Protein</Text>
              <Text style={[styles.infoValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
                {Math.round(goal.protein_g)}g
              </Text>
            </View>

            <View style={styles.infoRow}>
              <IconSymbol ios_icon_name="c.circle" android_material_icon_name="grain" size={20} color={isDark ? colors.dark.textSecondary : colors.light.textSecondary} />
              <Text style={[styles.infoLabel, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>Carbs</Text>
              <Text style={[styles.infoValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
                {Math.round(goal.carbs_g)}g
              </Text>
            </View>

            <View style={styles.infoRow}>
              <IconSymbol ios_icon_name="f.circle" android_material_icon_name="opacity" size={20} color={isDark ? colors.dark.textSecondary : colors.light.textSecondary} />
              <Text style={[styles.infoLabel, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>Fats</Text>
              <Text style={[styles.infoValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
                {Math.round(goal.fats_g)}g
              </Text>
            </View>
          </View>
        )}
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
    padding: spacing.md,
    paddingBottom: 100,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  profileHeader: {
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: spacing.sm,
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  editButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    fontSize: 16,
    marginLeft: spacing.sm,
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
