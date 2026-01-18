
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert, RefreshControl, ActivityIndicator, Modal, TextInput, Linking } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Sex, ActivityLevel, GoalType } from '@/types';
import { useSubscription } from '@/hooks/useSubscription.ios';
import { supabase } from '@/app/integrations/supabase/client';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { logSubscriptionStatus } from '@/utils/subscriptionDebug';
import { cmToFeetInches, kgToLbs, getLossRateDisplayText, feetInchesToCm, lbsToKg, calculateBMR, calculateTDEE, calculateTargetCalories, calculateMacrosWithPreset } from '@/utils/calculations';

type EditField = 'sex' | 'dob' | 'height' | 'weight' | 'activity' | 'goal_type' | 'loss_rate' | 'units' | 'goal_weight';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    fontSize: 18,
    marginBottom: spacing.md,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  settingItemLast: {
    borderBottomWidth: 0,
  },
  settingLabel: {
    ...typography.body,
    fontSize: 16,
  },
  settingValue: {
    ...typography.bodyBold,
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
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  subscriptionTitle: {
    ...typography.h3,
    fontSize: 18,
  },
  subscriptionStatus: {
    ...typography.body,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  subscriptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  subscriptionButtonText: {
    ...typography.bodyBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  manageSubscriptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  manageSubscriptionButtonText: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  logoutButtonText: {
    ...typography.bodyBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  footerLink: {
    ...typography.caption,
    fontSize: 13,
    paddingHorizontal: spacing.xs,
  },
  footerSeparator: {
    ...typography.caption,
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxWidth: 400,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  modalTitle: {
    ...typography.h3,
    fontSize: 20,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalButtonText: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  pickerOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  pickerOptionText: {
    ...typography.body,
    fontSize: 16,
    textAlign: 'center',
  },
  datePickerButton: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  datePickerButtonText: {
    ...typography.body,
    fontSize: 16,
  },
  goalWeightPromptCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
  },
  goalWeightPromptTitle: {
    ...typography.h3,
    fontSize: 18,
    marginBottom: spacing.sm,
  },
  goalWeightPromptText: {
    ...typography.body,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  goalWeightPromptButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  goalWeightPromptButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  goalWeightPromptButtonText: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  iapInfoText: {
    ...typography.caption,
    fontSize: 12,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});

function ProfileScreen() {
  const [user, setUser] = useState<any>(null);
  const [goal, setGoal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editField, setEditField] = useState<EditField | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [showGoalWeightPrompt, setShowGoalWeightPrompt] = useState(false);

  const router = useRouter();
  const { subscription, loading: subscriptionLoading, isSubscribed, refreshSubscription } = useSubscription();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useFocusEffect(
    useCallback(() => {
      console.log('[Profile iOS] Screen focused, loading user data');
      loadUserData();
      refreshSubscription();
    }, [])
  );

  async function loadUserData() {
    try {
      console.log('[Profile iOS] Loading user data...');
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        console.log('[Profile iOS] No authenticated user');
        return;
      }

      console.log('[Profile iOS] Fetching user profile for:', authUser.id);
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (userError) {
        console.error('[Profile iOS] Error fetching user:', userError);
        return;
      }

      console.log('[Profile iOS] User data loaded:', {
        user_type: userData.user_type,
        units: userData.units,
      });

      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('is_active', true)
        .maybeSingle();

      if (goalError) {
        console.error('[Profile iOS] Error fetching goal:', goalError);
      } else {
        console.log('[Profile iOS] Goal data loaded:', {
          goal_type: goalData?.goal_type,
          daily_calories: goalData?.daily_calories,
        });
      }

      setUser(userData);
      setGoal(goalData);

      // Check if we should show goal weight prompt
      if (userData.goal_weight === null && goalData?.goal_type !== 'maintain') {
        console.log('[Profile iOS] Goal weight not set, showing prompt');
        setShowGoalWeightPrompt(true);
      }
    } catch (error) {
      console.error('[Profile iOS] Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    console.log('[Profile iOS] Refreshing profile data');
    setRefreshing(true);
    await loadUserData();
    await refreshSubscription();
    setRefreshing(false);
  }

  async function handleManageSubscription() {
    console.log('[Profile iOS] 🍎 Opening Apple ID subscription management');
    
    Alert.alert(
      'Manage Subscription',
      'To manage your subscription, you need to go to your Apple ID settings.\n\nWould you like to open Settings now?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Open Settings',
          onPress: async () => {
            try {
              // Try to open the App Store subscriptions page
              const url = 'https://apps.apple.com/account/subscriptions';
              const canOpen = await Linking.canOpenURL(url);
              
              if (canOpen) {
                await Linking.openURL(url);
              } else {
                // Fallback to iOS settings
                await Linking.openURL('app-settings:');
              }
            } catch (error) {
              console.error('[Profile iOS] Error opening settings:', error);
              Alert.alert(
                'Unable to Open Settings',
                'Please open Settings > [Your Name] > Subscriptions to manage your subscription.'
              );
            }
          },
        },
      ]
    );
  }

  async function handleLogout() {
    console.log('[Profile iOS] User tapped logout button');
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            console.log('[Profile iOS] Logging out user');
            await supabase.auth.signOut();
            router.replace('/auth/welcome');
          },
        },
      ]
    );
  }

  function handleEditGoals() {
    console.log('[Profile iOS] User tapped edit goals button');
    router.push('/edit-goals');
  }

  function calculateAge(dob: string): number {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  function formatHeight(heightCm: number, units: string): string {
    if (units === 'imperial') {
      const { feet, inches } = cmToFeetInches(heightCm);
      return `${feet}'${inches}"`;
    }
    return `${heightCm} cm`;
  }

  function formatWeight(weightKg: number, units: string): string {
    if (units === 'imperial') {
      return `${kgToLbs(weightKg)} lbs`;
    }
    return `${weightKg} kg`;
  }

  function formatGoalType(goalType: string): string {
    const map: Record<string, string> = {
      lose: 'Lose Weight',
      maintain: 'Maintain Weight',
      gain: 'Gain Weight',
    };
    return map[goalType] || goalType;
  }

  function openEditModal(field: EditField) {
    console.log('[Profile iOS] Opening edit modal for field:', field);
    setEditField(field);
    
    if (field === 'dob') {
      setTempDate(user.dob ? new Date(user.dob) : new Date());
      setShowDatePicker(true);
      return;
    }

    let initialValue = '';
    switch (field) {
      case 'sex':
        initialValue = user.sex;
        break;
      case 'height':
        initialValue = user.units === 'imperial' 
          ? cmToFeetInches(user.height_cm).feet.toString()
          : user.height_cm.toString();
        break;
      case 'weight':
        initialValue = user.units === 'imperial'
          ? kgToLbs(user.weight_kg).toString()
          : user.weight_kg.toString();
        break;
      case 'goal_weight':
        initialValue = user.goal_weight 
          ? (user.units === 'imperial' ? kgToLbs(user.goal_weight).toString() : user.goal_weight.toString())
          : '';
        break;
      case 'activity':
        initialValue = user.activity_level;
        break;
      case 'goal_type':
        initialValue = goal?.goal_type || 'maintain';
        break;
      case 'loss_rate':
        initialValue = goal?.loss_rate?.toString() || '0.5';
        break;
      case 'units':
        initialValue = user.units;
        break;
    }
    
    setEditValue(initialValue);
    setEditModalVisible(true);
  }

  function closeEditModal() {
    console.log('[Profile iOS] Closing edit modal');
    setEditModalVisible(false);
    setEditField(null);
    setEditValue('');
  }

  function recalculateGoals(updatedUser: any, updatedGoal: any) {
    console.log('[Profile iOS] Recalculating goals with updated data');
    
    const age = calculateAge(updatedUser.dob);
    const bmr = calculateBMR(
      updatedUser.sex,
      age,
      updatedUser.height_cm,
      updatedUser.weight_kg
    );
    const tdee = calculateTDEE(bmr, updatedUser.activity_level);
    const targetCalories = calculateTargetCalories(
      tdee,
      updatedGoal.goal_type,
      updatedGoal.loss_rate
    );
    const macros = calculateMacrosWithPreset(
      targetCalories,
      updatedUser.weight_kg,
      'balanced'
    );

    return {
      daily_calories: Math.round(targetCalories),
      protein_g: Math.round(macros.protein),
      carbs_g: Math.round(macros.carbs),
      fats_g: Math.round(macros.fats),
      fiber_g: Math.round(macros.fiber),
    };
  }

  async function saveEditedField() {
    if (!editField) return;

    console.log('[Profile iOS] Saving edited field:', editField, 'with value:', editValue);

    try {
      let updateData: any = {};
      let goalUpdateData: any = {};
      let needsGoalRecalculation = false;

      switch (editField) {
        case 'sex':
          updateData.sex = editValue as Sex;
          needsGoalRecalculation = true;
          break;
        case 'height':
          if (user.units === 'imperial') {
            const feet = parseInt(editValue);
            updateData.height_cm = feetInchesToCm(feet, 0);
          } else {
            updateData.height_cm = parseInt(editValue);
          }
          needsGoalRecalculation = true;
          break;
        case 'weight':
          if (user.units === 'imperial') {
            updateData.weight_kg = lbsToKg(parseFloat(editValue));
          } else {
            updateData.weight_kg = parseFloat(editValue);
          }
          needsGoalRecalculation = true;
          break;
        case 'goal_weight':
          if (editValue.trim() === '') {
            updateData.goal_weight = null;
          } else {
            if (user.units === 'imperial') {
              updateData.goal_weight = lbsToKg(parseFloat(editValue));
            } else {
              updateData.goal_weight = parseFloat(editValue);
            }
          }
          break;
        case 'activity':
          updateData.activity_level = editValue as ActivityLevel;
          needsGoalRecalculation = true;
          break;
        case 'goal_type':
          goalUpdateData.goal_type = editValue as GoalType;
          needsGoalRecalculation = true;
          break;
        case 'loss_rate':
          goalUpdateData.loss_rate = parseFloat(editValue);
          needsGoalRecalculation = true;
          break;
        case 'units':
          updateData.units = editValue;
          break;
      }

      const updatedUser = { ...user, ...updateData };
      const updatedGoal = { ...goal, ...goalUpdateData };

      if (needsGoalRecalculation && goal) {
        const recalculatedMacros = recalculateGoals(updatedUser, updatedGoal);
        goalUpdateData = { ...goalUpdateData, ...recalculatedMacros };
      }

      if (Object.keys(updateData).length > 0) {
        console.log('[Profile iOS] Updating user data:', updateData);
        const { error: userError } = await supabase
          .from('users')
          .update({ ...updateData, updated_at: new Date().toISOString() })
          .eq('id', user.id);

        if (userError) throw userError;
      }

      if (Object.keys(goalUpdateData).length > 0 && goal) {
        console.log('[Profile iOS] Updating goal data:', goalUpdateData);
        const { error: goalError } = await supabase
          .from('goals')
          .update({ ...goalUpdateData, updated_at: new Date().toISOString() })
          .eq('id', goal.id);

        if (goalError) throw goalError;
      }

      console.log('[Profile iOS] ✅ Successfully saved changes');
      await loadUserData();
      closeEditModal();
    } catch (error) {
      console.error('[Profile iOS] ❌ Error saving changes:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    }
  }

  function handleStartDateChange(event: any) {
    if (event.type === 'set') {
      setTempDate(new Date(event.nativeEvent.timestamp));
    }
  }

  async function saveStartDate(date: Date) {
    console.log('[Profile iOS] Saving journey start date:', date.toISOString());
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          journey_start_date: date.toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      console.log('[Profile iOS] ✅ Journey start date saved');
      await loadUserData();
      setShowDatePicker(false);
    } catch (error) {
      console.error('[Profile iOS] ❌ Error saving start date:', error);
      Alert.alert('Error', 'Failed to save start date. Please try again.');
    }
  }

  function openStartDatePicker() {
    console.log('[Profile iOS] Opening start date picker');
    setTempDate(user.journey_start_date ? new Date(user.journey_start_date) : new Date());
    setShowDatePicker(true);
    setEditField('dob');
  }

  async function handleGoalWeightPromptSave() {
    console.log('[Profile iOS] User chose to set goal weight');
    setShowGoalWeightPrompt(false);
    openEditModal('goal_weight');
  }

  async function handleGoalWeightPromptSkip() {
    console.log('[Profile iOS] User chose to skip goal weight');
    setShowGoalWeightPrompt(false);
  }

  function getSubscriptionStatusText(): string {
    if (subscriptionLoading) return 'Loading...';
    if (!subscription) return 'No active subscription';
    
    if (subscription.status === 'active') {
      return `Active - ${subscription.plan_type === 'monthly' ? 'Monthly' : 'Yearly'} Plan`;
    } else if (subscription.status === 'trialing') {
      return 'Free Trial Active';
    } else if (subscription.status === 'canceled') {
      if (subscription.current_period_end) {
        const endDate = new Date(subscription.current_period_end);
        const now = new Date();
        if (endDate > now) {
          return `Canceled - Access until ${endDate.toLocaleDateString()}`;
        }
      }
      return 'Canceled';
    }
    
    return subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1);
  }

  function getSubscriptionButtonText(): string {
    if (isSubscribed) {
      return 'Manage Subscription';
    }
    return 'Upgrade to Premium';
  }

  function formatJourneyStartDate(dateStr: string | null): string {
    if (!dateStr) return 'Not set';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: isDark ? colors.textDark : colors.text }}>No user data found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Goal Weight Prompt */}
        {showGoalWeightPrompt && (
          <View style={styles.section}>
            <View style={[styles.goalWeightPromptCard, { 
              backgroundColor: isDark ? colors.cardDark : colors.card,
              borderColor: colors.primary,
            }]}>
              <Text style={[styles.goalWeightPromptTitle, { color: isDark ? colors.textDark : colors.text }]}>
                Set Your Goal Weight
              </Text>
              <Text style={[styles.goalWeightPromptText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Setting a goal weight helps us track your progress and provide better insights.
              </Text>
              <View style={styles.goalWeightPromptButtons}>
                <TouchableOpacity
                  style={[styles.goalWeightPromptButton, { backgroundColor: isDark ? colors.borderDark : colors.border }]}
                  onPress={handleGoalWeightPromptSkip}
                >
                  <Text style={[styles.goalWeightPromptButtonText, { color: isDark ? colors.textDark : colors.text }]}>
                    Skip
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.goalWeightPromptButton, { backgroundColor: colors.primary }]}
                  onPress={handleGoalWeightPromptSave}
                >
                  <Text style={[styles.goalWeightPromptButtonText, { color: '#FFFFFF' }]}>
                    Set Goal Weight
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Subscription Section */}
        <View style={styles.section}>
          <View style={[styles.subscriptionCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
            <View style={styles.subscriptionHeader}>
              <IconSymbol
                ios_icon_name="sparkles"
                android_material_icon_name="auto_awesome"
                size={24}
                color={colors.primary}
              />
              <Text style={[styles.subscriptionTitle, { color: isDark ? colors.textDark : colors.text }]}>
                Premium Status
              </Text>
            </View>
            <Text style={[styles.subscriptionStatus, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              {getSubscriptionStatusText()}
            </Text>
            {isSubscribed ? (
              <>
                <TouchableOpacity
                  style={[styles.manageSubscriptionButton, { 
                    backgroundColor: isDark ? colors.backgroundDark : colors.background,
                    borderWidth: 1,
                    borderColor: colors.primary,
                  }]}
                  onPress={handleManageSubscription}
                >
                  <IconSymbol
                    ios_icon_name="gear"
                    android_material_icon_name="settings"
                    size={20}
                    color={colors.primary}
                  />
                  <Text style={[styles.manageSubscriptionButtonText, { color: colors.primary }]}>
                    Manage Subscription
                  </Text>
                </TouchableOpacity>
                <Text style={[styles.iapInfoText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  Manage your subscription through Apple ID settings
                </Text>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.subscriptionButton, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/paywall')}
              >
                <IconSymbol
                  ios_icon_name="sparkles"
                  android_material_icon_name="auto_awesome"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={styles.subscriptionButtonText}>
                  Upgrade to Premium
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Personal Info Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Personal Information
          </Text>
          <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
            <EditableSettingItem
              label="Sex"
              value={user.sex === 'male' ? 'Male' : 'Female'}
              onPress={() => openEditModal('sex')}
              isDark={isDark}
            />
            <EditableSettingItem
              label="Age"
              value={`${calculateAge(user.dob)} years`}
              onPress={() => openEditModal('dob')}
              isDark={isDark}
            />
            <EditableSettingItem
              label="Height"
              value={formatHeight(user.height_cm, user.units)}
              onPress={() => openEditModal('height')}
              isDark={isDark}
            />
            <EditableSettingItem
              label="Weight"
              value={formatWeight(user.weight_kg, user.units)}
              onPress={() => openEditModal('weight')}
              isDark={isDark}
            />
            <EditableSettingItem
              label="Goal Weight"
              value={user.goal_weight ? formatWeight(user.goal_weight, user.units) : 'Not set'}
              onPress={() => openEditModal('goal_weight')}
              isDark={isDark}
              highlight={!user.goal_weight}
            />
            <EditableSettingItem
              label="Activity Level"
              value={user.activity_level}
              onPress={() => openEditModal('activity')}
              isDark={isDark}
            />
            <EditableSettingItem
              label="Units"
              value={user.units === 'metric' ? 'Metric' : 'Imperial'}
              onPress={() => openEditModal('units')}
              isDark={isDark}
            />
            <View style={[styles.settingItem, styles.settingItemLast, { borderBottomColor: isDark ? colors.borderDark : colors.border }]}>
              <Text style={[styles.settingLabel, { color: isDark ? colors.textDark : colors.text }]}>
                Journey Start
              </Text>
              <TouchableOpacity onPress={openStartDatePicker}>
                <Text style={[styles.settingValue, { color: colors.primary }]}>
                  {formatJourneyStartDate(user.journey_start_date)}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Goals Section */}
        {goal && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: isDark ? colors.textDark : colors.text }]}>
              Goals
            </Text>
            <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
              <View style={[styles.settingItem, { borderBottomColor: isDark ? colors.borderDark : colors.border }]}>
                <Text style={[styles.settingLabel, { color: isDark ? colors.textDark : colors.text }]}>
                  Goal Type
                </Text>
                <Text style={[styles.settingValue, { color: isDark ? colors.textDark : colors.text }]}>
                  {formatGoalType(goal.goal_type)}
                </Text>
              </View>
              {goal.goal_type !== 'maintain' && (
                <View style={[styles.settingItem, { borderBottomColor: isDark ? colors.borderDark : colors.border }]}>
                  <Text style={[styles.settingLabel, { color: isDark ? colors.textDark : colors.text }]}>
                    Rate
                  </Text>
                  <Text style={[styles.settingValue, { color: isDark ? colors.textDark : colors.text }]}>
                    {getLossRateDisplayText(goal.loss_rate, user.units)}
                  </Text>
                </View>
              )}
              <View style={[styles.settingItem, { borderBottomColor: isDark ? colors.borderDark : colors.border }]}>
                <Text style={[styles.settingLabel, { color: isDark ? colors.textDark : colors.text }]}>
                  Daily Calories
                </Text>
                <Text style={[styles.settingValue, { color: isDark ? colors.textDark : colors.text }]}>
                  {goal.daily_calories} kcal
                </Text>
              </View>
              <View style={[styles.settingItem, { borderBottomColor: isDark ? colors.borderDark : colors.border }]}>
                <Text style={[styles.settingLabel, { color: isDark ? colors.textDark : colors.text }]}>
                  Protein
                </Text>
                <Text style={[styles.settingValue, { color: isDark ? colors.textDark : colors.text }]}>
                  {goal.protein_g}g
                </Text>
              </View>
              <View style={[styles.settingItem, { borderBottomColor: isDark ? colors.borderDark : colors.border }]}>
                <Text style={[styles.settingLabel, { color: isDark ? colors.textDark : colors.text }]}>
                  Carbs
                </Text>
                <Text style={[styles.settingValue, { color: isDark ? colors.textDark : colors.text }]}>
                  {goal.carbs_g}g
                </Text>
              </View>
              <View style={[styles.settingItem, styles.settingItemLast, { borderBottomColor: isDark ? colors.borderDark : colors.border }]}>
                <Text style={[styles.settingLabel, { color: isDark ? colors.textDark : colors.text }]}>
                  Fats
                </Text>
                <Text style={[styles.settingValue, { color: isDark ? colors.textDark : colors.text }]}>
                  {goal.fats_g}g
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.subscriptionButton, { backgroundColor: colors.primary, marginTop: spacing.md }]}
              onPress={handleEditGoals}
            >
              <IconSymbol
                ios_icon_name="pencil"
                android_material_icon_name="edit"
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.subscriptionButtonText}>
                Edit Goals
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Log Out Button */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.logoutButton, { backgroundColor: '#FF3B30' }]}
            onPress={handleLogout}
          >
            <IconSymbol
              ios_icon_name="rectangle.portrait.and.arrow.right"
              android_material_icon_name="logout"
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.logoutButtonText}>
              Log Out
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer Links */}
        <View style={styles.footer}>
          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => router.push('/privacy-policy')}>
              <Text style={[styles.footerLink, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Privacy Policy
              </Text>
            </TouchableOpacity>
            <Text style={[styles.footerSeparator, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              ·
            </Text>
            <TouchableOpacity onPress={() => router.push('/terms-of-service')}>
              <Text style={[styles.footerLink, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Terms of Service
              </Text>
            </TouchableOpacity>
            <Text style={[styles.footerSeparator, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              ·
            </Text>
            <TouchableOpacity onPress={() => router.push('/delete-account')}>
              <Text style={[styles.footerLink, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Delete Account
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
            <Text style={[styles.modalTitle, { color: isDark ? colors.textDark : colors.text }]}>
              Edit {editField?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Text>

            {editField === 'sex' && (
              <React.Fragment>
                <TouchableOpacity
                  style={[styles.pickerOption, { backgroundColor: editValue === 'male' ? colors.primary + '20' : 'transparent' }]}
                  onPress={() => setEditValue('male')}
                >
                  <Text style={[styles.pickerOptionText, { color: editValue === 'male' ? colors.primary : (isDark ? colors.textDark : colors.text) }]}>
                    Male
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pickerOption, { backgroundColor: editValue === 'female' ? colors.primary + '20' : 'transparent' }]}
                  onPress={() => setEditValue('female')}
                >
                  <Text style={[styles.pickerOptionText, { color: editValue === 'female' ? colors.primary : (isDark ? colors.textDark : colors.text) }]}>
                    Female
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            )}

            {editField === 'units' && (
              <React.Fragment>
                <TouchableOpacity
                  style={[styles.pickerOption, { backgroundColor: editValue === 'metric' ? colors.primary + '20' : 'transparent' }]}
                  onPress={() => setEditValue('metric')}
                >
                  <Text style={[styles.pickerOptionText, { color: editValue === 'metric' ? colors.primary : (isDark ? colors.textDark : colors.text) }]}>
                    Metric (kg, cm)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pickerOption, { backgroundColor: editValue === 'imperial' ? colors.primary + '20' : 'transparent' }]}
                  onPress={() => setEditValue('imperial')}
                >
                  <Text style={[styles.pickerOptionText, { color: editValue === 'imperial' ? colors.primary : (isDark ? colors.textDark : colors.text) }]}>
                    Imperial (lbs, ft)
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            )}

            {(editField === 'height' || editField === 'weight' || editField === 'goal_weight') && (
              <TextInput
                style={[styles.input, { 
                  borderColor: isDark ? colors.borderDark : colors.border,
                  color: isDark ? colors.textDark : colors.text,
                  backgroundColor: isDark ? colors.backgroundDark : colors.background,
                }]}
                value={editValue}
                onChangeText={setEditValue}
                keyboardType="numeric"
                placeholder={editField === 'height' ? (user.units === 'imperial' ? 'Feet' : 'Centimeters') : (user.units === 'imperial' ? 'Pounds' : 'Kilograms')}
                placeholderTextColor={isDark ? colors.textSecondaryDark : colors.textSecondary}
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: isDark ? colors.borderDark : colors.border }]}
                onPress={closeEditModal}
              >
                <Text style={[styles.modalButtonText, { color: isDark ? colors.textDark : colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={saveEditedField}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="spinner"
          onChange={handleStartDateChange}
          maximumDate={new Date()}
          textColor={isDark ? colors.textDark : colors.text}
        />
      )}
      {showDatePicker && (
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
            <Text style={[styles.modalTitle, { color: isDark ? colors.textDark : colors.text }]}>
              Select Date
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: isDark ? colors.borderDark : colors.border }]}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={[styles.modalButtonText, { color: isDark ? colors.textDark : colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={() => saveStartDate(tempDate)}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function EditableSettingItem({ label, value, onPress, isDark, highlight }: any) {
  return (
    <TouchableOpacity
      style={[styles.settingItem, { borderBottomColor: isDark ? colors.borderDark : colors.border }]}
      onPress={onPress}
    >
      <Text style={[styles.settingLabel, { color: isDark ? colors.textDark : colors.text }]}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <Text style={[styles.settingValue, { color: highlight ? colors.primary : (isDark ? colors.textDark : colors.text) }]}>
          {value}
        </Text>
        <IconSymbol
          ios_icon_name="chevron.right"
          android_material_icon_name="chevron_right"
          size={20}
          color={isDark ? colors.textSecondaryDark : colors.textSecondary}
        />
      </View>
    </TouchableOpacity>
  );
}

export default ProfileScreen;
