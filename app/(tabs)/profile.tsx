
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/app/integrations/supabase/client';
import { IconSymbol } from '@/components/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';

interface UserData {
  email: string;
  sex: string | null;
  dob: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  units: string;
}

interface GoalData {
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
  const [userData, setUserData] = useState<UserData | null>(null);
  const [goalData, setGoalData] = useState<GoalData | null>(null);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user found');
        setLoading(false);
        return;
      }

      // Load user data
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('email, sex, dob, height_cm, weight_kg, units')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Profile error:', profileError);
        throw profileError;
      }
      setUserData(profile);

      // Load goal data
      const { data: goal, error: goalError } = await supabase
        .from('goals')
        .select('goal_type, daily_calories, protein_g, carbs_g, fats_g, fiber_g')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (goalError && goalError.code !== 'PGRST116') {
        console.error('Goal error:', goalError);
        throw goalError;
      }
      setGoalData(goal);
    } catch (error: any) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', 'Failed to load profile data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadProfileData();
  };

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.primary + '20' }]}>
            <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.email, { color: isDark ? colors.textDark : colors.text }]}>
            {userData?.email || 'No email'}
          </Text>
        </View>

        {/* Goals Section */}
        {goalData && (
          <View style={[styles.section, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
            <Text style={[styles.sectionTitle, { color: isDark ? colors.textDark : colors.text }]}>
              Daily Goals
            </Text>
            <View style={styles.goalRow}>
              <Text style={[styles.goalLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Calories
              </Text>
              <Text style={[styles.goalValue, { color: isDark ? colors.textDark : colors.text }]}>
                {goalData.daily_calories} kcal
              </Text>
            </View>
            <View style={styles.goalRow}>
              <Text style={[styles.goalLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Protein
              </Text>
              <Text style={[styles.goalValue, { color: isDark ? colors.textDark : colors.text }]}>
                {goalData.protein_g}g
              </Text>
            </View>
            <View style={styles.goalRow}>
              <Text style={[styles.goalLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Carbs
              </Text>
              <Text style={[styles.goalValue, { color: isDark ? colors.textDark : colors.text }]}>
                {goalData.carbs_g}g
              </Text>
            </View>
            <View style={styles.goalRow}>
              <Text style={[styles.goalLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Fats
              </Text>
              <Text style={[styles.goalValue, { color: isDark ? colors.textDark : colors.text }]}>
                {goalData.fats_g}g
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/edit-goals')}
            >
              <Text style={styles.editButtonText}>Edit Goals</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[styles.signOutButton, { backgroundColor: isDark ? colors.cardDark : colors.card }]}
          onPress={handleSignOut}
        >
          <IconSymbol ios_icon_name="arrow.right.square" android_material_icon_name="logout" size={20} color="#FF3B30" />
          <Text style={[styles.signOutText, { color: '#FF3B30' }]}>Sign Out</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
  },
  avatarCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  email: {
    fontSize: typography.h3.fontSize,
    fontWeight: '600',
  },
  section: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  goalLabel: {
    fontSize: typography.body.fontSize,
  },
  goalValue: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  editButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  signOutText: {
    fontSize: typography.body.fontSize,
    fontWeight: '600',
  },
});
