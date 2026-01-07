
import { useSubscription } from '@/hooks/useSubscription';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useRouter, useFocusEffect } from 'expo-router';
import { logSubscriptionStatus } from '@/utils/subscriptionDebug';
import React, { useEffect, useState, useCallback } from 'react';
import { Sex, ActivityLevel, GoalType } from '@/types';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert, RefreshControl, ActivityIndicator, Modal, TextInput } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { cmToFeetInches, kgToLbs, getLossRateDisplayText, feetInchesToCm, lbsToKg, calculateBMR, calculateTDEE, calculateTargetCalories, calculateMacrosWithPreset } from '@/utils/calculations';
import { supabase } from '@/app/integrations/supabase/client';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';

type EditField = 'sex' | 'dob' | 'height' | 'weight' | 'activity_level' | 'goal_type' | 'loss_rate' | 'units';

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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorText: {
    fontSize: typography.sizes.md,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  retryButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
  },
  header: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.sizes.sm,
  },
  section: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
  },
  settingLabel: {
    fontSize: typography.sizes.md,
  },
  settingValue: {
    fontSize: typography.sizes.md,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '85%',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: 'bold',
    marginBottom: spacing.lg,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.sizes.md,
    marginBottom: spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  modalButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  modalButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: '600',
  },
});

export default function ProfileScreen() {
  const { isSubscribed, subscriptionStatus, subscriptionLoading, refreshSubscriptionStatus } = useSubscription();
  const [user, setUser] = useState<any>(null);
  const [goal, setGoal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editField, setEditField] = useState<EditField | null>(null);
  const [editValue, setEditValue] = useState('');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const loadUserData = useCallback(async () => {
    try {
      setError(null);
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        throw new Error('Not authenticated');
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (userError) throw userError;

      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('is_active', true)
        .single();

      if (goalError && goalError.code !== 'PGRST116') {
        console.warn('Goal fetch error:', goalError);
      }

      setUser(userData);
      setGoal(goalData || null);
      
      await refreshSubscriptionStatus();
    } catch (err: any) {
      console.error('Error loading profile:', err);
      setError(err.message || 'Failed to load profile data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [refreshSubscriptionStatus]);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [loadUserData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadUserData();
  }, [loadUserData]);

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatHeight = (heightCm: number, units: string) => {
    if (units === 'imperial') {
      const { feet, inches } = cmToFeetInches(heightCm);
      return `${feet}'${inches}"`;
    }
    return `${heightCm} cm`;
  };

  const formatWeight = (weightKg: number, units: string) => {
    if (units === 'imperial') {
      return `${kgToLbs(weightKg).toFixed(1)} lbs`;
    }
    return `${weightKg.toFixed(1)} kg`;
  };

  const formatGoalType = (goalType: string) => {
    const map: Record<string, string> = {
      lose: 'Lose Weight',
      maintain: 'Maintain Weight',
      gain: 'Gain Weight',
    };
    return map[goalType] || goalType;
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.dark.background : colors.light.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? colors.dark.primary : colors.light.primary} />
          <Text style={{ color: isDark ? colors.dark.text : colors.light.text, marginTop: spacing.md }}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.dark.background : colors.light.background }]}>
        <View style={styles.errorContainer}>
          <IconSymbol 
            ios_icon_name="exclamationmark.triangle.fill" 
            android_material_icon_name="error" 
            size={48} 
            color={isDark ? colors.dark.error : colors.light.error} 
          />
          <Text style={[styles.errorText, { color: isDark ? colors.dark.text : colors.light.text }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: isDark ? colors.dark.primary : colors.light.primary }]}
            onPress={() => {
              setLoading(true);
              loadUserData();
            }}
          >
            <Text style={[styles.retryButtonText, { color: '#FFFFFF' }]}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.dark.background : colors.light.background }]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: isDark ? colors.dark.text : colors.light.text }]}>
            No user data found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.dark.background : colors.light.background }]} edges={['top']}>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? colors.dark.primary : colors.light.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: isDark ? colors.dark.text : colors.light.text }]}>
            Profile
          </Text>
          <Text style={[styles.headerSubtitle, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
            {user.email}
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: isDark ? colors.dark.text : colors.light.text }]}>
          Personal Information
        </Text>
        <View style={[styles.section, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}>
          <View style={[styles.settingRow, { borderBottomColor: isDark ? colors.dark.border : colors.light.border }]}>
            <Text style={[styles.settingLabel, { color: isDark ? colors.dark.text : colors.light.text }]}>Age</Text>
            <Text style={[styles.settingValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
              {user.dob ? calculateAge(user.dob) : 'Not set'}
            </Text>
          </View>
          <View style={[styles.settingRow, { borderBottomColor: isDark ? colors.dark.border : colors.light.border }]}>
            <Text style={[styles.settingLabel, { color: isDark ? colors.dark.text : colors.light.text }]}>Sex</Text>
            <Text style={[styles.settingValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
              {user.sex === 'male' ? 'Male' : user.sex === 'female' ? 'Female' : 'Not set'}
            </Text>
          </View>
          <View style={[styles.settingRow, { borderBottomColor: isDark ? colors.dark.border : colors.light.border }]}>
            <Text style={[styles.settingLabel, { color: isDark ? colors.dark.text : colors.light.text }]}>Height</Text>
            <Text style={[styles.settingValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
              {user.height ? formatHeight(user.height, user.units || 'metric') : 'Not set'}
            </Text>
          </View>
          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.settingLabel, { color: isDark ? colors.dark.text : colors.light.text }]}>Weight</Text>
            <Text style={[styles.settingValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
              {user.weight ? formatWeight(user.weight, user.units || 'metric') : 'Not set'}
            </Text>
          </View>
        </View>

        {goal && (
          <>
            <Text style={[styles.sectionTitle, { color: isDark ? colors.dark.text : colors.light.text }]}>
              Goals
            </Text>
            <View style={[styles.section, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}>
              <View style={[styles.settingRow, { borderBottomColor: isDark ? colors.dark.border : colors.light.border }]}>
                <Text style={[styles.settingLabel, { color: isDark ? colors.dark.text : colors.light.text }]}>Goal Type</Text>
                <Text style={[styles.settingValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
                  {formatGoalType(goal.goal_type)}
                </Text>
              </View>
              <View style={[styles.settingRow, { borderBottomColor: isDark ? colors.dark.border : colors.light.border }]}>
                <Text style={[styles.settingLabel, { color: isDark ? colors.dark.text : colors.light.text }]}>Daily Calories</Text>
                <Text style={[styles.settingValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
                  {goal.daily_calories} kcal
                </Text>
              </View>
              <View style={[styles.settingRow, { borderBottomColor: isDark ? colors.dark.border : colors.light.border }]}>
                <Text style={[styles.settingLabel, { color: isDark ? colors.dark.text : colors.light.text }]}>Protein</Text>
                <Text style={[styles.settingValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
                  {goal.protein_g}g
                </Text>
              </View>
              <View style={[styles.settingRow, { borderBottomColor: isDark ? colors.dark.border : colors.light.border }]}>
                <Text style={[styles.settingLabel, { color: isDark ? colors.dark.text : colors.light.text }]}>Carbs</Text>
                <Text style={[styles.settingValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
                  {goal.carbs_g}g
                </Text>
              </View>
              <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
                <Text style={[styles.settingLabel, { color: isDark ? colors.dark.text : colors.light.text }]}>Fats</Text>
                <Text style={[styles.settingValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
                  {goal.fats_g}g
                </Text>
              </View>
            </View>
          </>
        )}

        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: isDark ? colors.dark.primary : colors.light.primary, marginHorizontal: spacing.lg }]}
          onPress={() => router.push('/edit-goals')}
        >
          <Text style={[styles.retryButtonText, { color: '#FFFFFF', textAlign: 'center' }]}>
            Edit Goals
          </Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
