
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';
import { cmToFeetInches, kgToLbs, getLossRateDisplayText } from '@/utils/calculations';
import { useSubscription } from '@/hooks/useSubscription';

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [user, setUser] = useState<any>(null);
  const [goal, setGoal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const { subscription, isSubscribed, planType, openCustomerPortal, refreshSubscription } = useSubscription();

  useFocusEffect(
    useCallback(() => {
      console.log('[Profile] Screen focused, loading data');
      loadUserData();
    }, [])
  );

  const loadUserData = async () => {
    try {
      setLoading(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        console.log('[Profile] No authenticated user found');
        setLoading(false);
        return;
      }

      console.log('[Profile] Loading profile for user:', authUser.id);

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (userError) {
        console.error('[Profile] Error loading user data:', userError);
      } else if (userData) {
        console.log('[Profile] User data loaded:', userData);
        setUser({ ...authUser, ...userData });
      } else {
        console.log('[Profile] No user data found in database');
        setUser(authUser);
      }

      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('is_active', true)
        .maybeSingle();

      if (goalError) {
        console.error('[Profile] Error loading goal:', goalError);
      } else if (goalData) {
        console.log('[Profile] Goal data loaded:', goalData);
        setGoal(goalData);
      } else {
        console.log('[Profile] No active goal found for user');
        setGoal(null);
      }
    } catch (error) {
      console.error('[Profile] Error in loadUserData:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadUserData(), refreshSubscription()]);
  };

  const handleManageSubscription = async () => {
    if (!isSubscribed) {
      // Navigate to paywall if not subscribed
      router.push('/paywall');
      return;
    }

    try {
      setPortalLoading(true);
      await openCustomerPortal();
    } catch (error: any) {
      console.error('[Profile] Error opening customer portal:', error);
      Alert.alert('Error', error.message || 'Failed to open subscription management. Please try again.');
    } finally {
      setPortalLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/auth/welcome');
          },
        },
      ]
    );
  };

  const handleEditGoals = () => {
    if (!user?.onboarding_completed) {
      // If onboarding not completed, go to onboarding
      router.push('/onboarding/complete');
    } else {
      // Otherwise, go to edit goals screen
      router.push('/edit-goals');
    }
  };

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

  const formatHeight = (heightCm: number, units: string) => {
    if (units === 'imperial') {
      const { feet, inches } = cmToFeetInches(heightCm);
      return `${feet}' ${inches}"`;
    }
    return `${Math.round(heightCm)} cm`;
  };

  const formatWeight = (weightKg: number, units: string) => {
    if (units === 'imperial') {
      return `${Math.round(kgToLbs(weightKg))} lbs`;
    }
    return `${Math.round(weightKg)} kg`;
  };

  const formatGoalType = (goalType: string, lossRate?: number) => {
    if (goalType === 'lose') {
      if (lossRate) {
        return `Lose Weight at ${lossRate} lb/week`;
      }
      return 'Lose Weight';
    } else if (goalType === 'gain') {
      return 'Gain Weight';
    }
    return 'Maintain Weight';
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: isDark ? colors.textDark : colors.text }]}>
            Loading profile...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: isDark ? colors.textDark : colors.text }]}>
            No user data available
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() => router.replace('/auth/welcome')}
          >
            <Text style={styles.buttonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const units = user.preferred_units || 'metric';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDark ? colors.textDark : colors.text }]}>
          Profile
        </Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={[styles.profileCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {user.email?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          
          <Text style={[styles.email, { color: isDark ? colors.textDark : colors.text }]}>
            {user.email || 'Guest User'}
          </Text>
          
          <View style={[styles.badge, { backgroundColor: user.user_type === 'premium' ? colors.accent : colors.primary }]}>
            <Text style={styles.badgeText}>
              {user.user_type === 'premium' ? '⭐ Premium' : user.user_type === 'free' ? 'Free' : 'Guest'}
            </Text>
          </View>
        </View>

        {/* Subscription Card */}
        <View style={[styles.subscriptionCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
          <View style={styles.subscriptionHeader}>
            <View style={styles.subscriptionTitleContainer}>
              <IconSymbol
                ios_icon_name={isSubscribed ? 'checkmark.seal.fill' : 'lock.fill'}
                android_material_icon_name={isSubscribed ? 'verified' : 'lock'}
                size={24}
                color={isSubscribed ? colors.primary : (isDark ? colors.textSecondaryDark : colors.textSecondary)}
              />
              <Text style={[styles.sectionTitle, { color: isDark ? colors.textDark : colors.text, marginBottom: 0 }]}>
                Subscription
              </Text>
            </View>
            {isSubscribed && (
              <View style={[styles.activeBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            )}
          </View>

          {isSubscribed ? (
            <React.Fragment>
              <View style={styles.subscriptionInfo}>
                <Text style={[styles.subscriptionPlan, { color: isDark ? colors.textDark : colors.text }]}>
                  {planType === 'monthly' ? 'Monthly Plan' : planType === 'yearly' ? 'Yearly Plan' : 'Active Plan'}
                </Text>
                {subscription?.current_period_end && (
                  <Text style={[styles.subscriptionRenewal, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                    {subscription.cancel_at_period_end ? 'Expires' : 'Renews'} on{' '}
                    {new Date(subscription.current_period_end).toLocaleDateString()}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={[styles.manageButton, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}
                onPress={handleManageSubscription}
                disabled={portalLoading}
                activeOpacity={0.7}
              >
                {portalLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <React.Fragment>
                    <Text style={[styles.manageButtonText, { color: colors.primary }]}>
                      Manage Subscription
                    </Text>
                    <IconSymbol
                      ios_icon_name="arrow.up.right"
                      android_material_icon_name="open_in_new"
                      size={16}
                      color={colors.primary}
                    />
                  </React.Fragment>
                )}
              </TouchableOpacity>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <Text style={[styles.subscriptionDescription, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Unlock AI-powered meal estimation and future AI features
              </Text>
              <TouchableOpacity
                style={[styles.upgradeButton, { backgroundColor: colors.primary }]}
                onPress={handleManageSubscription}
                activeOpacity={0.7}
              >
                <IconSymbol
                  ios_icon_name="sparkles"
                  android_material_icon_name="auto_awesome"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
              </TouchableOpacity>
            </React.Fragment>
          )}
        </View>

        {(user.height || user.current_weight) && (
          <View style={[styles.statsCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
            <Text style={[styles.sectionTitle, { color: isDark ? colors.textDark : colors.text }]}>
              Your Stats
            </Text>
            
            <View style={styles.statsGrid}>
              {user.height && (
                <StatItem 
                  label="Height" 
                  value={formatHeight(user.height, units)} 
                  isDark={isDark} 
                />
              )}
              {user.current_weight && (
                <StatItem 
                  label="Weight" 
                  value={formatWeight(user.current_weight, units)} 
                  isDark={isDark} 
                />
              )}
              {user.date_of_birth && (
                <StatItem label="Age" value={`${calculateAge(user.date_of_birth)} years`} isDark={isDark} />
              )}
              {user.sex && (
                <StatItem 
                  label="Sex" 
                  value={user.sex === 'male' ? 'Male' : user.sex === 'female' ? 'Female' : 'Other'} 
                  isDark={isDark} 
                />
              )}
              {user.preferred_units && (
                <StatItem 
                  label="Units" 
                  value={user.preferred_units === 'imperial' ? 'Imperial' : 'Metric'} 
                  isDark={isDark} 
                />
              )}
              {user.activity_level && (
                <StatItem 
                  label="Activity" 
                  value={user.activity_level.charAt(0).toUpperCase() + user.activity_level.slice(1).replace('_', ' ')} 
                  isDark={isDark} 
                />
              )}
            </View>
          </View>
        )}

        {goal ? (
          <View style={[styles.goalsCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
            <Text style={[styles.sectionTitle, { color: isDark ? colors.textDark : colors.text }]}>
              Current Goals
            </Text>
            
            <View style={styles.goalItem}>
              <Text style={[styles.goalLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Goal Type
              </Text>
              <Text style={[styles.goalValue, { color: isDark ? colors.textDark : colors.text }]}>
                {formatGoalType(goal.goal_type, goal.loss_rate_lbs_per_week)}
              </Text>
            </View>
            
            {goal.goal_type === 'lose' && goal.loss_rate_lbs_per_week && (
              <View style={styles.goalItem}>
                <Text style={[styles.goalLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  Weight Loss Rate
                </Text>
                <Text style={[styles.goalValue, { color: isDark ? colors.textDark : colors.text }]}>
                  {getLossRateDisplayText(goal.loss_rate_lbs_per_week)}
                </Text>
              </View>
            )}
            
            <View style={styles.goalItem}>
              <Text style={[styles.goalLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Daily Calories
              </Text>
              <Text style={[styles.goalValue, { color: isDark ? colors.textDark : colors.text }]}>
                {goal.daily_calories} kcal
              </Text>
            </View>
            
            <View style={styles.goalItem}>
              <Text style={[styles.goalLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Macros
              </Text>
              <Text style={[styles.goalValue, { color: isDark ? colors.textDark : colors.text }]}>
                P: {goal.protein_g}g • C: {goal.carbs_g}g • F: {goal.fats_g}g
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: colors.primary }]}
              onPress={handleEditGoals}
            >
              <Text style={styles.editButtonText}>Edit Goals</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.goalsCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
            <Text style={[styles.sectionTitle, { color: isDark ? colors.textDark : colors.text }]}>
              No Goals Set
            </Text>
            <Text style={[styles.noGoalText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Complete onboarding to set your nutrition goals
            </Text>
            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: colors.primary }]}
              onPress={handleEditGoals}
            >
              <Text style={styles.editButtonText}>Set Up Goals</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: isDark ? colors.cardDark : colors.card, borderColor: colors.error }]}
          onPress={handleLogout}
        >
          <Text style={[styles.logoutText, { color: colors.error }]}>
            Log Out
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({ label, value, isDark }: any) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statItemLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.statItemValue, { color: isDark ? colors.textDark : colors.text }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
  },
  button: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'android' ? spacing.lg : 0,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.h2,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 120,
  },
  profileCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },
  email: {
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  statsCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statItem: {
    width: '48%',
  },
  statItemLabel: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  statItemValue: {
    ...typography.bodyBold,
  },
  goalsCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  goalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  goalLabel: {
    ...typography.body,
  },
  goalValue: {
    ...typography.bodyBold,
    flex: 1,
    textAlign: 'right',
  },
  noGoalText: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  editButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  logoutButton: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: spacing.md,
  },
  logoutText: {
    fontWeight: '600',
    fontSize: 16,
  },
  subscriptionCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  subscriptionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  activeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  activeBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  subscriptionInfo: {
    marginBottom: spacing.md,
  },
  subscriptionPlan: {
    ...typography.bodyBold,
    fontSize: 16,
    marginBottom: spacing.xs,
  },
  subscriptionRenewal: {
    ...typography.caption,
    fontSize: 13,
  },
  subscriptionDescription: {
    ...typography.body,
    fontSize: 14,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  manageButtonText: {
    fontWeight: '600',
    fontSize: 15,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
