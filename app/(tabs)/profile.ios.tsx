
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert, RefreshControl, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useSubscription } from '@/hooks/useSubscription';
import { Sex, ActivityLevel, GoalType } from '@/types';
import DateTimePicker from '@react-native-community/datetimepicker';
import { logSubscriptionStatus } from '@/utils/subscriptionDebug';
import { IconSymbol } from '@/components/IconSymbol';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useRouter, useFocusEffect } from 'expo-router';
import { cmToFeetInches, kgToLbs, getLossRateDisplayText, feetInchesToCm, lbsToKg, calculateBMR, calculateTDEE, calculateTargetCalories, calculateMacrosWithPreset } from '@/utils/calculations';
import { supabase } from '@/app/integrations/supabase/client';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import React, { useEffect, useState, useCallback } from 'react';

type EditField = 'sex' | 'height' | 'current_weight' | 'goal_weight' | 'date_of_birth' | 'activity_level' | 'goal_type' | 'weekly_loss_rate';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.md,
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.sizes.md,
    opacity: 0.7,
  },
  section: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold as any,
    marginBottom: spacing.md,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  settingItemLast: {
    borderBottomWidth: 0,
  },
  settingLabel: {
    fontSize: typography.sizes.md,
    flex: 1,
  },
  settingValue: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium as any,
    marginRight: spacing.xs,
  },
  settingValueHighlight: {
    fontWeight: typography.weights.bold as any,
  },
  button: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  buttonText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold as any,
  },
  logoutButton: {
    borderWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.md,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: typography.sizes.md,
    marginBottom: spacing.md,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold as any,
  },
  optionButton: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  optionButtonSelected: {
    borderWidth: 2,
  },
  optionButtonText: {
    fontSize: typography.sizes.md,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  subscriptionBadgeText: {
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
  },
  startDatePromptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  startDatePromptContent: {
    width: '85%',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  startDatePromptTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    marginBottom: spacing.sm,
  },
  startDatePromptMessage: {
    fontSize: typography.sizes.md,
    marginBottom: spacing.md,
    opacity: 0.8,
  },
  startDatePromptButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  startDatePromptButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  startDatePromptButtonText: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold as any,
  },
});

export default function ProfileScreen() {
  const router = useRouter();
  const { isSubscribed, subscriptionStatus, subscriptionLoading, refreshSubscriptionStatus } = useSubscription();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [goal, setGoal] = useState<any>(null);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editField, setEditField] = useState<EditField | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(new Date());

  const [showGoalWeightPrompt, setShowGoalWeightPrompt] = useState(false);
  const [goalWeightInput, setGoalWeightInput] = useState('');

  const loadUserData = useCallback(async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        console.log('ProfileScreen (iOS): No authenticated user');
        Alert.alert('Error', 'Not authenticated');
        return;
      }

      console.log('ProfileScreen (iOS): Loading user data for:', authUser.id);

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (userError) {
        console.error('ProfileScreen (iOS): Error loading user data:', userError);
        throw userError;
      }

      console.log('ProfileScreen (iOS): User data loaded:', userData);

      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('is_active', true)
        .single();

      if (goalError && goalError.code !== 'PGRST116') {
        console.error('ProfileScreen (iOS): Error loading goal data:', goalError);
        throw goalError;
      }

      console.log('ProfileScreen (iOS): Goal data loaded:', goalData);

      setUser(userData);
      setGoal(goalData || null);

      logSubscriptionStatus('ProfileScreen (iOS)', {
        isSubscribed,
        subscriptionStatus,
        subscriptionLoading,
      });
    } catch (error: any) {
      console.error('ProfileScreen (iOS): Error in loadUserData:', error);
      Alert.alert('Error', error.message || 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }, [isSubscribed, subscriptionStatus, subscriptionLoading]);

  useFocusEffect(
    useCallback(() => {
      console.log('ProfileScreen (iOS): Screen focused, loading data');
      loadUserData();
      refreshSubscriptionStatus();
    }, [loadUserData, refreshSubscriptionStatus])
  );

  const onRefresh = useCallback(async () => {
    console.log('ProfileScreen (iOS): Refreshing data');
    setRefreshing(true);
    await loadUserData();
    await refreshSubscriptionStatus();
    setRefreshing(false);
  }, [loadUserData, refreshSubscriptionStatus]);

  const handleManageSubscription = useCallback(() => {
    console.log('ProfileScreen (iOS): Navigating to subscription management');
    router.push('/subscription-management');
  }, [router]);

  const handleLogout = useCallback(async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            console.log('ProfileScreen (iOS): Logging out');
            await supabase.auth.signOut();
            router.replace('/');
          },
        },
      ]
    );
  }, [router]);

  const handleEditGoals = useCallback(() => {
    console.log('ProfileScreen (iOS): Navigating to edit goals');
    router.push('/edit-goals');
  }, [router]);

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
    if (goalType === 'lose') return 'Lose Weight';
    if (goalType === 'gain') return 'Gain Weight';
    return 'Maintain Weight';
  };

  const openEditModal = (field: EditField) => {
    setEditField(field);
    if (field === 'sex') {
      setEditValue(user?.sex || 'male');
    } else if (field === 'height') {
      setEditValue(user?.height?.toString() || '');
    } else if (field === 'current_weight') {
      setEditValue(user?.current_weight?.toString() || '');
    } else if (field === 'goal_weight') {
      setEditValue(user?.goal_weight?.toString() || '');
    } else if (field === 'date_of_birth') {
      setEditValue(user?.date_of_birth || '');
    } else if (field === 'activity_level') {
      setEditValue(user?.activity_level || 'moderate');
    } else if (field === 'goal_type') {
      setEditValue(goal?.goal_type || 'lose');
    } else if (field === 'weekly_loss_rate') {
      setEditValue(goal?.weekly_loss_rate?.toString() || '0.5');
    }
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditField(null);
    setEditValue('');
  };

  const recalculateGoals = async (updatedUser: any, updatedGoal: any) => {
    const age = calculateAge(updatedUser.date_of_birth);
    const bmr = calculateBMR(
      updatedUser.current_weight,
      updatedUser.height,
      age,
      updatedUser.sex
    );
    const tdee = calculateTDEE(bmr, updatedUser.activity_level);
    const targetCalories = calculateTargetCalories(
      tdee,
      updatedGoal.goal_type,
      updatedGoal.weekly_loss_rate
    );
    const macros = calculateMacrosWithPreset(
      targetCalories,
      updatedUser.current_weight,
      'balanced'
    );

    const { error: goalUpdateError } = await supabase
      .from('goals')
      .update({
        daily_calories: Math.round(targetCalories),
        protein_g: Math.round(macros.protein),
        carbs_g: Math.round(macros.carbs),
        fats_g: Math.round(macros.fats),
        fiber_g: Math.round(macros.fiber),
      })
      .eq('id', updatedGoal.id);

    if (goalUpdateError) throw goalUpdateError;
  };

  const saveEditedField = async () => {
    if (!editField || !user) return;

    setSaving(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      let updateData: any = {};

      if (editField === 'sex') {
        updateData.sex = editValue;
      } else if (editField === 'height') {
        updateData.height = parseFloat(editValue);
      } else if (editField === 'current_weight') {
        updateData.current_weight = parseFloat(editValue);
      } else if (editField === 'goal_weight') {
        updateData.goal_weight = parseFloat(editValue);
      } else if (editField === 'date_of_birth') {
        updateData.date_of_birth = editValue;
      } else if (editField === 'activity_level') {
        updateData.activity_level = editValue;
      }

      if (Object.keys(updateData).length > 0) {
        const { error: userError } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', authUser.id);

        if (userError) throw userError;

        const updatedUser = { ...user, ...updateData };
        setUser(updatedUser);

        if (goal && (editField === 'current_weight' || editField === 'height' || editField === 'date_of_birth' || editField === 'sex' || editField === 'activity_level')) {
          await recalculateGoals(updatedUser, goal);
        }
      }

      if (editField === 'goal_type' || editField === 'weekly_loss_rate') {
        if (!goal) throw new Error('No active goal found');

        let goalUpdateData: any = {};
        if (editField === 'goal_type') {
          goalUpdateData.goal_type = editValue;
        } else if (editField === 'weekly_loss_rate') {
          goalUpdateData.weekly_loss_rate = parseFloat(editValue);
        }

        const { error: goalError } = await supabase
          .from('goals')
          .update(goalUpdateData)
          .eq('id', goal.id);

        if (goalError) throw goalError;

        const updatedGoal = { ...goal, ...goalUpdateData };
        setGoal(updatedGoal);

        await recalculateGoals(user, updatedGoal);
      }

      await loadUserData();
      closeEditModal();
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      console.error('Error saving field:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
    }
    if (selectedDate) {
      setTempStartDate(selectedDate);
      if (Platform.OS === 'android') {
        saveStartDate(selectedDate);
      }
    }
  };

  const saveStartDate = async (date: Date) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      const dateString = date.toISOString().split('T')[0];

      const { error } = await supabase
        .from('users')
        .update({ start_date: dateString })
        .eq('id', authUser.id);

      if (error) throw error;

      await loadUserData();
      setShowStartDatePicker(false);

      if (!user?.goal_weight) {
        setShowGoalWeightPrompt(true);
      } else {
        Alert.alert('Success', 'Start date updated successfully');
      }
    } catch (error: any) {
      console.error('Error saving start date:', error);
      Alert.alert('Error', error.message || 'Failed to update start date');
    }
  };

  const openStartDatePicker = () => {
    if (user?.start_date) {
      setTempStartDate(new Date(user.start_date));
    } else {
      setTempStartDate(new Date());
    }
    setShowStartDatePicker(true);
  };

  const handleGoalWeightPromptSave = async () => {
    const goalWeight = parseFloat(goalWeightInput);
    if (isNaN(goalWeight) || goalWeight <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid goal weight');
      return;
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('users')
        .update({ goal_weight: goalWeight })
        .eq('id', authUser.id);

      if (error) throw error;

      await loadUserData();
      setShowGoalWeightPrompt(false);
      setGoalWeightInput('');
      Alert.alert('Success', 'Goal weight set successfully');
    } catch (error: any) {
      console.error('Error saving goal weight:', error);
      Alert.alert('Error', error.message || 'Failed to set goal weight');
    }
  };

  const handleGoalWeightPromptSkip = () => {
    setShowGoalWeightPrompt(false);
    setGoalWeightInput('');
  };

  console.log('ProfileScreen (iOS): Rendering, loading:', loading, 'user:', !!user);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.dark.background : colors.light.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? colors.dark.primary : colors.light.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.dark.background : colors.light.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: isDark ? colors.dark.text : colors.light.text }}>No user data available</Text>
        </View>
      </SafeAreaView>
    );
  }

  const EditableSettingItem = ({ label, value, onPress, isDark, highlight = false }: any) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.settingLabel, { color: isDark ? colors.dark.text : colors.light.text }]}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[
          styles.settingValue,
          highlight && styles.settingValueHighlight,
          { color: isDark ? colors.dark.text : colors.light.text }
        ]}>
          {value}
        </Text>
        <IconSymbol
          ios_icon_name="chevron.right"
          android_material_icon_name="arrow-forward"
          size={20}
          color={isDark ? colors.dark.textSecondary : colors.light.textSecondary}
        />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.dark.background : colors.light.background }]} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
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
          {!subscriptionLoading && (
            <View style={[
              styles.subscriptionBadge,
              { backgroundColor: isSubscribed ? colors.premium : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') }
            ]}>
              <IconSymbol
                ios_icon_name={isSubscribed ? "crown.fill" : "crown"}
                android_material_icon_name="star"
                size={16}
                color={isSubscribed ? '#FFF' : (isDark ? colors.dark.textSecondary : colors.light.textSecondary)}
              />
              <Text style={[
                styles.subscriptionBadgeText,
                { color: isSubscribed ? '#FFF' : (isDark ? colors.dark.textSecondary : colors.light.textSecondary) }
              ]}>
                {isSubscribed ? 'Premium' : 'Free'}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? colors.dark.text : colors.light.text }]}>
            Personal Information
          </Text>
          <EditableSettingItem
            label="Sex"
            value={user.sex === 'male' ? 'Male' : 'Female'}
            onPress={() => openEditModal('sex')}
            isDark={isDark}
          />
          <EditableSettingItem
            label="Age"
            value={`${calculateAge(user.date_of_birth)} years`}
            onPress={() => openEditModal('date_of_birth')}
            isDark={isDark}
          />
          <EditableSettingItem
            label="Height"
            value={formatHeight(user.height, user.preferred_units)}
            onPress={() => openEditModal('height')}
            isDark={isDark}
          />
          <EditableSettingItem
            label="Current Weight"
            value={formatWeight(user.current_weight, user.preferred_units)}
            onPress={() => openEditModal('current_weight')}
            isDark={isDark}
            highlight
          />
          <EditableSettingItem
            label="Goal Weight"
            value={user.goal_weight ? formatWeight(user.goal_weight, user.preferred_units) : 'Not set'}
            onPress={() => openEditModal('goal_weight')}
            isDark={isDark}
          />
          <EditableSettingItem
            label="Activity Level"
            value={user.activity_level?.charAt(0).toUpperCase() + user.activity_level?.slice(1)}
            onPress={() => openEditModal('activity_level')}
            isDark={isDark}
          />
          <TouchableOpacity
            style={[styles.settingItem, styles.settingItemLast]}
            onPress={openStartDatePicker}
            activeOpacity={0.7}
          >
            <Text style={[styles.settingLabel, { color: isDark ? colors.dark.text : colors.light.text }]}>
              Start Date
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.settingValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
                {user.start_date ? new Date(user.start_date).toLocaleDateString() : 'Not set'}
              </Text>
              <IconSymbol
                ios_icon_name="chevron.right"
                android_material_icon_name="arrow-forward"
                size={20}
                color={isDark ? colors.dark.textSecondary : colors.light.textSecondary}
              />
            </View>
          </TouchableOpacity>
        </View>

        {goal && (
          <View style={[styles.section, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}>
            <Text style={[styles.sectionTitle, { color: isDark ? colors.dark.text : colors.light.text }]}>
              Goals
            </Text>
            <EditableSettingItem
              label="Goal Type"
              value={formatGoalType(goal.goal_type)}
              onPress={() => openEditModal('goal_type')}
              isDark={isDark}
            />
            {goal.goal_type !== 'maintain' && (
              <EditableSettingItem
                label="Weekly Rate"
                value={getLossRateDisplayText(goal.weekly_loss_rate)}
                onPress={() => openEditModal('weekly_loss_rate')}
                isDark={isDark}
              />
            )}
            <View style={[styles.settingItem, styles.settingItemLast]}>
              <Text style={[styles.settingLabel, { color: isDark ? colors.dark.text : colors.light.text }]}>
                Daily Calories
              </Text>
              <Text style={[styles.settingValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
                {goal.daily_calories} kcal
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: isDark ? colors.dark.primary : colors.light.primary }]}
          onPress={handleEditGoals}
          activeOpacity={0.8}
        >
          <Text style={[styles.buttonText, { color: '#FFF' }]}>
            Edit Goals & Macros
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: isDark ? colors.dark.primary : colors.light.primary }]}
          onPress={handleManageSubscription}
          activeOpacity={0.8}
        >
          <Text style={[styles.buttonText, { color: '#FFF' }]}>
            {isSubscribed ? 'Manage Subscription' : 'Upgrade to Premium'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.logoutButton,
            {
              borderColor: isDark ? colors.dark.error : colors.light.error,
              backgroundColor: 'transparent',
            }
          ]}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Text style={[styles.buttonText, { color: isDark ? colors.dark.error : colors.light.error }]}>
            Logout
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}>
            <Text style={[styles.modalTitle, { color: isDark ? colors.dark.text : colors.light.text }]}>
              Edit {editField?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Text>

            {editField === 'sex' && (
              <>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    editValue === 'male' && styles.optionButtonSelected,
                    {
                      borderColor: editValue === 'male' ? (isDark ? colors.dark.primary : colors.light.primary) : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'),
                    }
                  ]}
                  onPress={() => setEditValue('male')}
                >
                  <Text style={[styles.optionButtonText, { color: isDark ? colors.dark.text : colors.light.text }]}>
                    Male
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    editValue === 'female' && styles.optionButtonSelected,
                    {
                      borderColor: editValue === 'female' ? (isDark ? colors.dark.primary : colors.light.primary) : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'),
                    }
                  ]}
                  onPress={() => setEditValue('female')}
                >
                  <Text style={[styles.optionButtonText, { color: isDark ? colors.dark.text : colors.light.text }]}>
                    Female
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {editField === 'activity_level' && (
              <>
                {['sedentary', 'light', 'moderate', 'active', 'very_active'].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.optionButton,
                      editValue === level && styles.optionButtonSelected,
                      {
                        borderColor: editValue === level ? (isDark ? colors.dark.primary : colors.light.primary) : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'),
                      }
                    ]}
                    onPress={() => setEditValue(level)}
                  >
                    <Text style={[styles.optionButtonText, { color: isDark ? colors.dark.text : colors.light.text }]}>
                      {level.charAt(0).toUpperCase() + level.slice(1).replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {editField === 'goal_type' && (
              <>
                {['lose', 'maintain', 'gain'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.optionButton,
                      editValue === type && styles.optionButtonSelected,
                      {
                        borderColor: editValue === type ? (isDark ? colors.dark.primary : colors.light.primary) : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'),
                      }
                    ]}
                    onPress={() => setEditValue(type)}
                  >
                    <Text style={[styles.optionButtonText, { color: isDark ? colors.dark.text : colors.light.text }]}>
                      {formatGoalType(type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {editField === 'weekly_loss_rate' && (
              <>
                {['0.25', '0.5', '0.75', '1.0'].map((rate) => (
                  <TouchableOpacity
                    key={rate}
                    style={[
                      styles.optionButton,
                      editValue === rate && styles.optionButtonSelected,
                      {
                        borderColor: editValue === rate ? (isDark ? colors.dark.primary : colors.light.primary) : (isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'),
                      }
                    ]}
                    onPress={() => setEditValue(rate)}
                  >
                    <Text style={[styles.optionButtonText, { color: isDark ? colors.dark.text : colors.light.text }]}>
                      {getLossRateDisplayText(parseFloat(rate))}
                    </Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {(editField === 'height' || editField === 'current_weight' || editField === 'goal_weight') && (
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                    color: isDark ? colors.dark.text : colors.light.text,
                  }
                ]}
                value={editValue}
                onChangeText={setEditValue}
                keyboardType="numeric"
                placeholder={`Enter ${editField.replace(/_/g, ' ')}`}
                placeholderTextColor={isDark ? colors.dark.textSecondary : colors.light.textSecondary}
              />
            )}

            {editField === 'date_of_birth' && (
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                    color: isDark ? colors.dark.text : colors.light.text,
                  }
                ]}
                value={editValue}
                onChangeText={setEditValue}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={isDark ? colors.dark.textSecondary : colors.light.textSecondary}
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                ]}
                onPress={closeEditModal}
              >
                <Text style={[styles.modalButtonText, { color: isDark ? colors.dark.text : colors.light.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: isDark ? colors.dark.primary : colors.light.primary }
                ]}
                onPress={saveEditedField}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={[styles.modalButtonText, { color: '#FFF' }]}>
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {showStartDatePicker && (
        <Modal
          visible={showStartDatePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowStartDatePicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}>
              <Text style={[styles.modalTitle, { color: isDark ? colors.dark.text : colors.light.text }]}>
                Select Start Date
              </Text>
              <DateTimePicker
                value={tempStartDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleStartDateChange}
                maximumDate={new Date()}
                textColor={isDark ? colors.dark.text : colors.light.text}
              />
              {Platform.OS === 'ios' && (
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                    ]}
                    onPress={() => setShowStartDatePicker(false)}
                  >
                    <Text style={[styles.modalButtonText, { color: isDark ? colors.dark.text : colors.light.text }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.modalButton,
                      { backgroundColor: isDark ? colors.dark.primary : colors.light.primary }
                    ]}
                    onPress={() => saveStartDate(tempStartDate)}
                  >
                    <Text style={[styles.modalButtonText, { color: '#FFF' }]}>
                      Save
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}

      {showGoalWeightPrompt && (
        <Modal
          visible={showGoalWeightPrompt}
          transparent
          animationType="fade"
          onRequestClose={handleGoalWeightPromptSkip}
        >
          <View style={styles.startDatePromptOverlay}>
            <View style={[styles.startDatePromptContent, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}>
              <Text style={[styles.startDatePromptTitle, { color: isDark ? colors.dark.text : colors.light.text }]}>
                Set Goal Weight
              </Text>
              <Text style={[styles.startDatePromptMessage, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
                Would you like to set your goal weight now?
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                    color: isDark ? colors.dark.text : colors.light.text,
                  }
                ]}
                value={goalWeightInput}
                onChangeText={setGoalWeightInput}
                keyboardType="numeric"
                placeholder={`Goal weight (${user.preferred_units === 'imperial' ? 'lbs' : 'kg'})`}
                placeholderTextColor={isDark ? colors.dark.textSecondary : colors.light.textSecondary}
              />
              <View style={styles.startDatePromptButtons}>
                <TouchableOpacity
                  style={[
                    styles.startDatePromptButton,
                    { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
                  ]}
                  onPress={handleGoalWeightPromptSkip}
                >
                  <Text style={[styles.startDatePromptButtonText, { color: isDark ? colors.dark.text : colors.light.text }]}>
                    Skip
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.startDatePromptButton,
                    { backgroundColor: isDark ? colors.dark.primary : colors.light.primary }
                  ]}
                  onPress={handleGoalWeightPromptSave}
                >
                  <Text style={[styles.startDatePromptButtonText, { color: '#FFF' }]}>
                    Save
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}
