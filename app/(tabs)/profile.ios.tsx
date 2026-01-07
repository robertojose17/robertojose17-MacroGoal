
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert, RefreshControl, ActivityIndicator, Modal, TextInput } from 'react-native';
import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/app/integrations/supabase/client';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useRouter, useFocusEffect } from 'expo-router';
import { Sex, ActivityLevel, GoalType } from '@/types';
import { IconSymbol } from '@/components/IconSymbol';
import { cmToFeetInches, kgToLbs, getLossRateDisplayText, feetInchesToCm, lbsToKg, calculateBMR, calculateTDEE, calculateTargetCalories, calculateMacrosWithPreset } from '@/utils/calculations';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { logSubscriptionStatus } from '@/utils/subscriptionDebug';
import { useSubscription } from '@/hooks/useSubscription';

type EditField = 'sex' | 'dob' | 'height' | 'weight' | 'activity' | 'goalType' | 'lossRate' | 'startDate' | 'goalWeight';

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
  header: {
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  section: {
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
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
    fontSize: 16,
  },
  settingValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingValueHighlight: {
    fontWeight: '600',
  },
  button: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    marginTop: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    fontSize: 20,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: 16,
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
    fontSize: 16,
    fontWeight: '600',
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
    fontSize: 16,
    textAlign: 'center',
  },
  heightInputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  heightInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    fontSize: 16,
  },
  datePickerButton: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  datePickerButtonText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const { 
    isSubscribed,
    subscriptionStatus,
    subscriptionLoading,
    refreshSubscriptionStatus,
  } = useSubscription();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [goal, setGoal] = useState<any>(null);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editField, setEditField] = useState<EditField | null>(null);
  const [editValue, setEditValue] = useState('');
  const [editValueFeet, setEditValueFeet] = useState('');
  const [editValueInches, setEditValueInches] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  const [goalWeightPromptVisible, setGoalWeightPromptVisible] = useState(false);
  const [goalWeightInput, setGoalWeightInput] = useState('');

  const loadUserData = useCallback(async () => {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        Alert.alert('Error', 'Not authenticated');
        router.replace('/');
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (userError) throw userError;
      setUser(userData);

      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('is_active', true)
        .single();

      if (goalError && goalError.code !== 'PGRST116') throw goalError;
      setGoal(goalData || null);

    } catch (error: any) {
      console.error('Error loading profile:', error);
      Alert.alert('Error', error.message || 'Failed to load profile');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
      refreshSubscriptionStatus();
    }, [loadUserData, refreshSubscriptionStatus])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadUserData();
    refreshSubscriptionStatus();
  }, [loadUserData, refreshSubscriptionStatus]);

  const handleManageSubscription = useCallback(() => {
    if (isSubscribed) {
      Alert.alert(
        'Manage Subscription',
        'To manage your subscription, please visit your account settings on the web or contact support.',
        [{ text: 'OK' }]
      );
    } else {
      router.push('/paywall');
    }
  }, [isSubscribed, router]);

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
            await supabase.auth.signOut();
            router.replace('/');
          },
        },
      ]
    );
  }, [router]);

  const handleEditGoals = useCallback(() => {
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
    if (goalType === 'maintain') return 'Maintain Weight';
    if (goalType === 'gain') return 'Gain Weight';
    return goalType;
  };

  const openEditModal = (field: EditField) => {
    if (!user) return;
    setEditField(field);

    if (field === 'sex') {
      setEditValue(user.sex || 'male');
    } else if (field === 'dob') {
      setTempDate(user.dob ? new Date(user.dob) : new Date());
      setShowDatePicker(true);
      return;
    } else if (field === 'height') {
      if (user.units === 'imperial') {
        const { feet, inches } = cmToFeetInches(user.height_cm);
        setEditValueFeet(feet.toString());
        setEditValueInches(inches.toString());
      } else {
        setEditValue(user.height_cm.toString());
      }
    } else if (field === 'weight') {
      if (user.units === 'imperial') {
        setEditValue(kgToLbs(user.weight_kg).toFixed(1));
      } else {
        setEditValue(user.weight_kg.toFixed(1));
      }
    } else if (field === 'activity') {
      setEditValue(user.activity_level || 'moderate');
    } else if (field === 'goalType') {
      setEditValue(goal?.goal_type || 'lose');
    } else if (field === 'lossRate') {
      setEditValue(goal?.weekly_loss_rate?.toString() || '0.5');
    } else if (field === 'startDate') {
      setTempDate(user.start_date ? new Date(user.start_date) : new Date());
      setShowDatePicker(true);
      return;
    } else if (field === 'goalWeight') {
      if (user.units === 'imperial') {
        setEditValue(user.goal_weight_kg ? kgToLbs(user.goal_weight_kg).toFixed(1) : '');
      } else {
        setEditValue(user.goal_weight_kg?.toFixed(1) || '');
      }
    }

    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setEditField(null);
    setEditValue('');
    setEditValueFeet('');
    setEditValueInches('');
  };

  const recalculateGoals = async (updatedUser: any, updatedGoal: any) => {
    const age = calculateAge(updatedUser.dob);
    const bmr = calculateBMR(updatedUser.weight_kg, updatedUser.height_cm, age, updatedUser.sex);
    const tdee = calculateTDEE(bmr, updatedUser.activity_level);
    const targetCalories = calculateTargetCalories(tdee, updatedGoal.goal_type, updatedGoal.weekly_loss_rate || 0.5);
    const macros = calculateMacrosWithPreset(targetCalories, updatedUser.weight_kg, 'balanced');

    const { error: goalError } = await supabase
      .from('goals')
      .update({
        daily_calories: Math.round(targetCalories),
        protein_g: Math.round(macros.protein),
        carbs_g: Math.round(macros.carbs),
        fats_g: Math.round(macros.fats),
        fiber_g: Math.round(macros.fiber),
      })
      .eq('id', updatedGoal.id);

    if (goalError) throw goalError;
  };

  const saveEditedField = async () => {
    if (!user || !editField) return;

    try {
      let updateData: any = {};

      if (editField === 'sex') {
        updateData.sex = editValue;
      } else if (editField === 'height') {
        if (user.units === 'imperial') {
          const feet = parseInt(editValueFeet) || 0;
          const inches = parseInt(editValueInches) || 0;
          updateData.height_cm = feetInchesToCm(feet, inches);
        } else {
          updateData.height_cm = parseFloat(editValue);
        }
      } else if (editField === 'weight') {
        if (user.units === 'imperial') {
          updateData.weight_kg = lbsToKg(parseFloat(editValue));
        } else {
          updateData.weight_kg = parseFloat(editValue);
        }
      } else if (editField === 'activity') {
        updateData.activity_level = editValue;
      } else if (editField === 'goalType') {
        if (goal) {
          const { error: goalError } = await supabase
            .from('goals')
            .update({ goal_type: editValue })
            .eq('id', goal.id);
          if (goalError) throw goalError;
          const updatedGoal = { ...goal, goal_type: editValue };
          await recalculateGoals(user, updatedGoal);
          setGoal(updatedGoal);
        }
        closeEditModal();
        await loadUserData();
        return;
      } else if (editField === 'lossRate') {
        if (goal) {
          const { error: goalError } = await supabase
            .from('goals')
            .update({ weekly_loss_rate: parseFloat(editValue) })
            .eq('id', goal.id);
          if (goalError) throw goalError;
          const updatedGoal = { ...goal, weekly_loss_rate: parseFloat(editValue) };
          await recalculateGoals(user, updatedGoal);
          setGoal(updatedGoal);
        }
        closeEditModal();
        await loadUserData();
        return;
      } else if (editField === 'goalWeight') {
        if (user.units === 'imperial') {
          updateData.goal_weight_kg = lbsToKg(parseFloat(editValue));
        } else {
          updateData.goal_weight_kg = parseFloat(editValue);
        }
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      const updatedUser = { ...user, ...updateData };
      setUser(updatedUser);

      if (goal && (editField === 'sex' || editField === 'height' || editField === 'weight' || editField === 'activity')) {
        await recalculateGoals(updatedUser, goal);
      }

      closeEditModal();
      await loadUserData();
    } catch (error: any) {
      console.error('Error saving field:', error);
      Alert.alert('Error', error.message || 'Failed to save changes');
    }
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setTempDate(selectedDate);
      saveStartDate(selectedDate);
    }
  };

  const saveStartDate = async (date: Date) => {
    if (!user) return;
    try {
      const dateString = date.toISOString().split('T')[0];
      const { error } = await supabase
        .from('users')
        .update({ start_date: dateString })
        .eq('id', user.id);

      if (error) throw error;

      setUser({ ...user, start_date: dateString });
      setShowDatePicker(false);

      if (!user.goal_weight_kg) {
        setGoalWeightPromptVisible(true);
      } else {
        await loadUserData();
      }
    } catch (error: any) {
      console.error('Error saving start date:', error);
      Alert.alert('Error', error.message || 'Failed to save start date');
    }
  };

  const openStartDatePicker = () => {
    if (!user) return;
    setTempDate(user.start_date ? new Date(user.start_date) : new Date());
    setShowDatePicker(true);
  };

  const handleGoalWeightPromptSave = async () => {
    if (!user || !goalWeightInput) return;
    try {
      let goalWeightKg: number;
      if (user.units === 'imperial') {
        goalWeightKg = lbsToKg(parseFloat(goalWeightInput));
      } else {
        goalWeightKg = parseFloat(goalWeightInput);
      }

      const { error } = await supabase
        .from('users')
        .update({ goal_weight_kg: goalWeightKg })
        .eq('id', user.id);

      if (error) throw error;

      setUser({ ...user, goal_weight_kg: goalWeightKg });
      setGoalWeightPromptVisible(false);
      setGoalWeightInput('');
      await loadUserData();
    } catch (error: any) {
      console.error('Error saving goal weight:', error);
      Alert.alert('Error', error.message || 'Failed to save goal weight');
    }
  };

  const handleGoalWeightPromptSkip = () => {
    setGoalWeightPromptVisible(false);
    setGoalWeightInput('');
    loadUserData();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.dark.background : colors.light.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? colors.dark.primary : colors.light.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? colors.dark.background : colors.light.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: isDark ? colors.dark.text : colors.light.text }}>No user data</Text>
        </View>
      </SafeAreaView>
    );
  }

  const EditableSettingItem = ({ label, value, onPress, isDark, highlight = false }: any) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <Text style={[styles.settingLabel, { color: isDark ? colors.dark.text : colors.light.text }]}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={[
          styles.settingValue,
          highlight && styles.settingValueHighlight,
          { color: isDark ? colors.dark.text : colors.light.text }
        ]}>
          {value}
        </Text>
        <IconSymbol
          ios_icon_name="chevron.right"
          android_material_icon_name="chevron_right"
          size={16}
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
          <Text style={[styles.headerTitle, { color: isDark ? colors.dark.text : colors.light.text }]}>Profile</Text>
          <Text style={[styles.headerSubtitle, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
            {user.email}
          </Text>
        </View>

        <View style={[styles.section, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? colors.dark.text : colors.light.text }]}>Personal Info</Text>
          <EditableSettingItem label="Sex" value={user.sex === 'male' ? 'Male' : 'Female'} onPress={() => openEditModal('sex')} isDark={isDark} />
          <EditableSettingItem label="Age" value={`${calculateAge(user.dob)} years`} onPress={() => openEditModal('dob')} isDark={isDark} />
          <EditableSettingItem label="Height" value={formatHeight(user.height_cm, user.units)} onPress={() => openEditModal('height')} isDark={isDark} />
          <EditableSettingItem label="Weight" value={formatWeight(user.weight_kg, user.units)} onPress={() => openEditModal('weight')} isDark={isDark} />
          <EditableSettingItem label="Activity Level" value={user.activity_level} onPress={() => openEditModal('activity')} isDark={isDark} />
        </View>

        {goal && (
          <View style={[styles.section, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}>
            <Text style={[styles.sectionTitle, { color: isDark ? colors.dark.text : colors.light.text }]}>Goals</Text>
            <EditableSettingItem label="Goal Type" value={formatGoalType(goal.goal_type)} onPress={() => openEditModal('goalType')} isDark={isDark} />
            {goal.goal_type === 'lose' && (
              <EditableSettingItem
                label="Loss Rate"
                value={getLossRateDisplayText(goal.weekly_loss_rate || 0.5, user.units)}
                onPress={() => openEditModal('lossRate')}
                isDark={isDark}
              />
            )}
            <EditableSettingItem label="Daily Calories" value={`${goal.daily_calories} kcal`} onPress={handleEditGoals} isDark={isDark} highlight />
            <EditableSettingItem label="Protein" value={`${goal.protein_g}g`} onPress={handleEditGoals} isDark={isDark} highlight />
            <EditableSettingItem label="Carbs" value={`${goal.carbs_g}g`} onPress={handleEditGoals} isDark={isDark} highlight />
            <EditableSettingItem label="Fats" value={`${goal.fats_g}g`} onPress={handleEditGoals} isDark={isDark} highlight />
          </View>
        )}

        <View style={[styles.section, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? colors.dark.text : colors.light.text }]}>Journey</Text>
          <EditableSettingItem
            label="Start Date"
            value={user.start_date ? new Date(user.start_date).toLocaleDateString() : 'Not set'}
            onPress={openStartDatePicker}
            isDark={isDark}
          />
          <EditableSettingItem
            label="Goal Weight"
            value={user.goal_weight_kg ? formatWeight(user.goal_weight_kg, user.units) : 'Not set'}
            onPress={() => openEditModal('goalWeight')}
            isDark={isDark}
          />
        </View>

        <View style={[styles.section, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? colors.dark.text : colors.light.text }]}>Subscription</Text>
          <View style={styles.settingItem}>
            <Text style={[styles.settingLabel, { color: isDark ? colors.dark.text : colors.light.text }]}>Status</Text>
            <Text style={[styles.settingValue, { color: isDark ? colors.dark.text : colors.light.text }]}>
              {subscriptionLoading ? 'Loading...' : isSubscribed ? 'Premium' : 'Free'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: isDark ? colors.dark.primary : colors.light.primary }]}
            onPress={handleManageSubscription}
          >
            <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>
              {isSubscribed ? 'Manage Subscription' : 'Upgrade to Premium'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.logoutButton, { backgroundColor: isDark ? colors.dark.error : colors.light.error }]}
          onPress={handleLogout}
        >
          <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={editModalVisible} transparent animationType="fade" onRequestClose={closeEditModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}>
            <Text style={[styles.modalTitle, { color: isDark ? colors.dark.text : colors.light.text }]}>
              Edit {editField === 'sex' ? 'Sex' : editField === 'height' ? 'Height' : editField === 'weight' ? 'Weight' : editField === 'activity' ? 'Activity Level' : editField === 'goalType' ? 'Goal Type' : editField === 'lossRate' ? 'Loss Rate' : editField === 'goalWeight' ? 'Goal Weight' : ''}
            </Text>

            {editField === 'sex' && (
              <React.Fragment>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    editValue === 'male' && styles.optionButtonSelected,
                    {
                      borderColor: editValue === 'male' ? (isDark ? colors.dark.primary : colors.light.primary) : (isDark ? colors.dark.border : colors.light.border),
                      backgroundColor: editValue === 'male' ? (isDark ? 'rgba(0,122,255,0.1)' : 'rgba(0,122,255,0.1)') : 'transparent',
                    },
                  ]}
                  onPress={() => setEditValue('male')}
                >
                  <Text style={[styles.optionButtonText, { color: isDark ? colors.dark.text : colors.light.text }]}>Male</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    editValue === 'female' && styles.optionButtonSelected,
                    {
                      borderColor: editValue === 'female' ? (isDark ? colors.dark.primary : colors.light.primary) : (isDark ? colors.dark.border : colors.light.border),
                      backgroundColor: editValue === 'female' ? (isDark ? 'rgba(0,122,255,0.1)' : 'rgba(0,122,255,0.1)') : 'transparent',
                    },
                  ]}
                  onPress={() => setEditValue('female')}
                >
                  <Text style={[styles.optionButtonText, { color: isDark ? colors.dark.text : colors.light.text }]}>Female</Text>
                </TouchableOpacity>
              </React.Fragment>
            )}

            {editField === 'height' && user.units === 'imperial' && (
              <View style={styles.heightInputRow}>
                <TextInput
                  style={[styles.heightInput, { borderColor: isDark ? colors.dark.border : colors.light.border, color: isDark ? colors.dark.text : colors.light.text }]}
                  value={editValueFeet}
                  onChangeText={setEditValueFeet}
                  keyboardType="numeric"
                  placeholder="Feet"
                  placeholderTextColor={isDark ? colors.dark.textSecondary : colors.light.textSecondary}
                />
                <TextInput
                  style={[styles.heightInput, { borderColor: isDark ? colors.dark.border : colors.light.border, color: isDark ? colors.dark.text : colors.light.text }]}
                  value={editValueInches}
                  onChangeText={setEditValueInches}
                  keyboardType="numeric"
                  placeholder="Inches"
                  placeholderTextColor={isDark ? colors.dark.textSecondary : colors.light.textSecondary}
                />
              </View>
            )}

            {editField === 'height' && user.units === 'metric' && (
              <TextInput
                style={[styles.modalInput, { borderColor: isDark ? colors.dark.border : colors.light.border, color: isDark ? colors.dark.text : colors.light.text }]}
                value={editValue}
                onChangeText={setEditValue}
                keyboardType="numeric"
                placeholder="Height (cm)"
                placeholderTextColor={isDark ? colors.dark.textSecondary : colors.light.textSecondary}
              />
            )}

            {(editField === 'weight' || editField === 'goalWeight') && (
              <TextInput
                style={[styles.modalInput, { borderColor: isDark ? colors.dark.border : colors.light.border, color: isDark ? colors.dark.text : colors.light.text }]}
                value={editValue}
                onChangeText={setEditValue}
                keyboardType="numeric"
                placeholder={user.units === 'imperial' ? 'Weight (lbs)' : 'Weight (kg)'}
                placeholderTextColor={isDark ? colors.dark.textSecondary : colors.light.textSecondary}
              />
            )}

            {editField === 'activity' && (
              <React.Fragment>
                {['sedentary', 'light', 'moderate', 'active', 'very_active'].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.optionButton,
                      editValue === level && styles.optionButtonSelected,
                      {
                        borderColor: editValue === level ? (isDark ? colors.dark.primary : colors.light.primary) : (isDark ? colors.dark.border : colors.light.border),
                        backgroundColor: editValue === level ? (isDark ? 'rgba(0,122,255,0.1)' : 'rgba(0,122,255,0.1)') : 'transparent',
                      },
                    ]}
                    onPress={() => setEditValue(level)}
                  >
                    <Text style={[styles.optionButtonText, { color: isDark ? colors.dark.text : colors.light.text }]}>
                      {level.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Text>
                  </TouchableOpacity>
                ))}
              </React.Fragment>
            )}

            {editField === 'goalType' && (
              <React.Fragment>
                {['lose', 'maintain', 'gain'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.optionButton,
                      editValue === type && styles.optionButtonSelected,
                      {
                        borderColor: editValue === type ? (isDark ? colors.dark.primary : colors.light.primary) : (isDark ? colors.dark.border : colors.light.border),
                        backgroundColor: editValue === type ? (isDark ? 'rgba(0,122,255,0.1)' : 'rgba(0,122,255,0.1)') : 'transparent',
                      },
                    ]}
                    onPress={() => setEditValue(type)}
                  >
                    <Text style={[styles.optionButtonText, { color: isDark ? colors.dark.text : colors.light.text }]}>
                      {formatGoalType(type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </React.Fragment>
            )}

            {editField === 'lossRate' && (
              <React.Fragment>
                {['0.25', '0.5', '0.75', '1.0'].map((rate) => (
                  <TouchableOpacity
                    key={rate}
                    style={[
                      styles.optionButton,
                      editValue === rate && styles.optionButtonSelected,
                      {
                        borderColor: editValue === rate ? (isDark ? colors.dark.primary : colors.light.primary) : (isDark ? colors.dark.border : colors.light.border),
                        backgroundColor: editValue === rate ? (isDark ? 'rgba(0,122,255,0.1)' : 'rgba(0,122,255,0.1)') : 'transparent',
                      },
                    ]}
                    onPress={() => setEditValue(rate)}
                  >
                    <Text style={[styles.optionButtonText, { color: isDark ? colors.dark.text : colors.light.text }]}>
                      {getLossRateDisplayText(parseFloat(rate), user.units)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </React.Fragment>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: isDark ? colors.dark.border : colors.light.border }]}
                onPress={closeEditModal}
              >
                <Text style={[styles.modalButtonText, { color: isDark ? colors.dark.text : colors.light.text }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: isDark ? colors.dark.primary : colors.light.primary }]}
                onPress={saveEditedField}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {showDatePicker && (
        <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}>
              <Text style={[styles.modalTitle, { color: isDark ? colors.dark.text : colors.light.text }]}>
                {editField === 'dob' ? 'Select Date of Birth' : 'Select Start Date'}
              </Text>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleStartDateChange}
                maximumDate={new Date()}
                textColor={isDark ? colors.dark.text : colors.light.text}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: isDark ? colors.dark.border : colors.light.border }]}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={[styles.modalButtonText, { color: isDark ? colors.dark.text : colors.light.text }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: isDark ? colors.dark.primary : colors.light.primary }]}
                  onPress={() => saveStartDate(tempDate)}
                >
                  <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      <Modal visible={goalWeightPromptVisible} transparent animationType="fade" onRequestClose={handleGoalWeightPromptSkip}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}>
            <Text style={[styles.modalTitle, { color: isDark ? colors.dark.text : colors.light.text }]}>Set Goal Weight</Text>
            <Text style={[{ color: isDark ? colors.dark.textSecondary : colors.light.textSecondary, marginBottom: spacing.md }]}>
              Would you like to set a goal weight for your journey?
            </Text>
            <TextInput
              style={[styles.modalInput, { borderColor: isDark ? colors.dark.border : colors.light.border, color: isDark ? colors.dark.text : colors.light.text }]}
              value={goalWeightInput}
              onChangeText={setGoalWeightInput}
              keyboardType="numeric"
              placeholder={user.units === 'imperial' ? 'Goal Weight (lbs)' : 'Goal Weight (kg)'}
              placeholderTextColor={isDark ? colors.dark.textSecondary : colors.light.textSecondary}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: isDark ? colors.dark.border : colors.light.border }]}
                onPress={handleGoalWeightPromptSkip}
              >
                <Text style={[styles.modalButtonText, { color: isDark ? colors.dark.text : colors.light.text }]}>Skip</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: isDark ? colors.dark.primary : colors.light.primary }]}
                onPress={handleGoalWeightPromptSave}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
