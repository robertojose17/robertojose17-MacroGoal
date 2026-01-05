
import { supabase } from '@/app/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { useColorScheme } from '@/hooks/useColorScheme';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import DateTimePicker from '@react-native-community/datetimepicker';
import { cmToFeetInches, kgToLbs, getLossRateDisplayText, feetInchesToCm, lbsToKg, calculateBMR, calculateTDEE, calculateTargetCalories, calculateMacrosWithPreset } from '@/utils/calculations';
import { Sex, ActivityLevel, GoalType } from '@/types';
import { IconSymbol } from '@/components/IconSymbol';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert, RefreshControl, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import React, { useEffect, useState, useCallback } from 'react';
import { logSubscriptionStatus } from '@/utils/subscriptionDebug';
import { SafeAreaView } from 'react-native-safe-area-context';

type EditField = 'sex' | 'dob' | 'height' | 'weight' | 'activity' | 'goal_type' | 'goal_weight';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  headerTitle: {
    ...typography.h1,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.body,
    opacity: 0.7,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  settingLabel: {
    ...typography.body,
  },
  settingValue: {
    ...typography.bodyBold,
  },
  button: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  buttonText: {
    ...typography.bodyBold,
    color: '#FFF',
  },
  logoutButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  logoutButtonText: {
    ...typography.bodyBold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    ...typography.h2,
    marginBottom: spacing.md,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...typography.body,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalButtonText: {
    ...typography.bodyBold,
  },
  optionButton: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  optionButtonSelected: {
    borderWidth: 2,
  },
  optionButtonText: {
    ...typography.body,
    textAlign: 'center',
  },
  subscriptionCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  subscriptionBadgeText: {
    ...typography.h3,
    color: '#FFD700',
  },
  subscriptionDetails: {
    ...typography.caption,
    opacity: 0.7,
    marginBottom: spacing.md,
  },
  subscriptionButton: {
    backgroundColor: '#FFD700',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  subscriptionButtonText: {
    ...typography.bodyBold,
    color: '#000',
  },
  upgradeCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  upgradeTitle: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  upgradeDescription: {
    ...typography.caption,
    opacity: 0.7,
    marginBottom: spacing.md,
  },
  upgradeButton: {
    backgroundColor: '#FFD700',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  upgradeButtonText: {
    ...typography.bodyBold,
    color: '#000',
  },
});

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { 
    isSubscribed, 
    status, 
    planType, 
    expiresAt, 
    cancelAtPeriodEnd,
    loading: subscriptionLoading, 
    openCustomerPortal,
    refresh: refreshSubscription 
  } = useSubscription();

  const [user, setUser] = useState<any>(null);
  const [goal, setGoal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editField, setEditField] = useState<EditField | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showGoalWeightPrompt, setShowGoalWeightPrompt] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
      refreshSubscription();
      
      // Debug subscription status
      logSubscriptionStatus();
    }, [])
  );

  async function loadUserData() {
    try {
      setLoading(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      const { data: goalData } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('is_active', true)
        .single();

      setUser(userData);
      setGoal(goalData);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadUserData();
    await refreshSubscription();
    setRefreshing(false);
  }

  async function handleManageSubscription() {
    if (isSubscribed) {
      // Open Stripe Customer Portal
      await openCustomerPortal();
    } else {
      // Navigate to paywall
      router.push('/paywall');
    }
  }

  async function handleLogout() {
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
            router.replace('/auth/welcome');
          },
        },
      ]
    );
  }

  function handleEditGoals() {
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
      return `${kgToLbs(weightKg).toFixed(1)} lbs`;
    }
    return `${weightKg.toFixed(1)} kg`;
  }

  function formatGoalType(goalType: string): string {
    const types: Record<string, string> = {
      lose: 'Lose Weight',
      maintain: 'Maintain Weight',
      gain: 'Gain Weight',
    };
    return types[goalType] || goalType;
  }

  function openEditModal(field: EditField) {
    setEditField(field);
    
    if (field === 'dob' && user?.date_of_birth) {
      setTempDate(new Date(user.date_of_birth));
      setShowDatePicker(true);
      return;
    }

    let initialValue = '';
    switch (field) {
      case 'sex':
        initialValue = user?.sex || '';
        break;
      case 'height':
        initialValue = user?.height?.toString() || '';
        break;
      case 'weight':
        initialValue = user?.current_weight?.toString() || '';
        break;
      case 'activity':
        initialValue = user?.activity_level || '';
        break;
      case 'goal_type':
        initialValue = goal?.goal_type || '';
        break;
      case 'goal_weight':
        initialValue = user?.goal_weight?.toString() || '';
        break;
    }
    
    setEditValue(initialValue);
    setEditModalVisible(true);
  }

  function closeEditModal() {
    setEditModalVisible(false);
    setEditField(null);
    setEditValue('');
  }

  async function recalculateGoals(updatedUser: any, updatedGoal: any) {
    if (!updatedUser || !updatedGoal) return;

    const age = calculateAge(updatedUser.date_of_birth);
    const bmr = calculateBMR(
      updatedUser.sex,
      age,
      updatedUser.height,
      updatedUser.current_weight
    );
    const tdee = calculateTDEE(bmr, updatedUser.activity_level);
    const targetCalories = calculateTargetCalories(
      tdee,
      updatedGoal.goal_type,
      updatedGoal.loss_rate_lbs_per_week || 1
    );
    const macros = calculateMacrosWithPreset(
      targetCalories,
      updatedUser.current_weight,
      'balanced'
    );

    await supabase
      .from('goals')
      .update({
        daily_calories: targetCalories,
        protein_g: macros.protein,
        carbs_g: macros.carbs,
        fats_g: macros.fats,
        fiber_g: macros.fiber,
        updated_at: new Date().toISOString(),
      })
      .eq('id', updatedGoal.id);

    await supabase
      .from('users')
      .update({
        maintenance_calories: Math.round(tdee),
        updated_at: new Date().toISOString(),
      })
      .eq('id', updatedUser.id);
  }

  async function saveEditedField() {
    if (!editField || !user) return;

    try {
      let updateData: any = {};
      
      switch (editField) {
        case 'sex':
          updateData.sex = editValue;
          break;
        case 'height':
          updateData.height = parseFloat(editValue);
          break;
        case 'weight':
          updateData.current_weight = parseFloat(editValue);
          break;
        case 'activity':
          updateData.activity_level = editValue;
          break;
        case 'goal_weight':
          updateData.goal_weight = parseFloat(editValue);
          break;
      }

      if (editField === 'goal_type') {
        await supabase
          .from('goals')
          .update({ goal_type: editValue, updated_at: new Date().toISOString() })
          .eq('id', goal.id);
      } else {
        await supabase
          .from('users')
          .update({ ...updateData, updated_at: new Date().toISOString() })
          .eq('id', user.id);
      }

      await loadUserData();
      
      if (['sex', 'height', 'weight', 'activity', 'goal_type'].includes(editField)) {
        const updatedUser = { ...user, ...updateData };
        const updatedGoal = editField === 'goal_type' ? { ...goal, goal_type: editValue } : goal;
        await recalculateGoals(updatedUser, updatedGoal);
        await loadUserData();
      }

      closeEditModal();
    } catch (error) {
      console.error('Error saving field:', error);
      Alert.alert('Error', 'Failed to save changes');
    }
  }

  function handleStartDateChange(event: any, selectedDate?: Date) {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false);
    }
    
    if (selectedDate) {
      setTempDate(selectedDate);
      if (Platform.OS === 'ios') {
        // iOS will have a Done button
      } else {
        // Android saves immediately
        saveStartDate(selectedDate);
      }
    }
  }

  async function saveStartDate(date: Date) {
    try {
      await supabase
        .from('goals')
        .update({
          start_date: date.toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', goal.id);

      await loadUserData();
      setShowStartDatePicker(false);
    } catch (error) {
      console.error('Error saving start date:', error);
      Alert.alert('Error', 'Failed to save start date');
    }
  }

  function openStartDatePicker() {
    if (goal?.start_date) {
      setTempDate(new Date(goal.start_date));
    } else {
      setTempDate(new Date());
    }
    setShowStartDatePicker(true);
  }

  async function handleGoalWeightPromptSave() {
    setShowGoalWeightPrompt(false);
    openEditModal('goal_weight');
  }

  function handleGoalWeightPromptSkip() {
    setShowGoalWeightPrompt(false);
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.dark.background : colors.light.background }]} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={isDark ? colors.dark.primary : colors.light.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.dark.background : colors.light.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: isDark ? colors.dark.text : colors.light.text }]}>
            Profile
          </Text>
          <Text style={[styles.headerSubtitle, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
            {user?.email}
          </Text>
        </View>

        {/* Subscription Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? colors.dark.text : colors.light.text }]}>
            Subscription
          </Text>
          
          {subscriptionLoading ? (
            <View style={[styles.card, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}>
              <ActivityIndicator size="small" color={isDark ? colors.dark.primary : colors.light.primary} />
            </View>
          ) : isSubscribed ? (
            <View style={[styles.subscriptionCard, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}>
              <View style={styles.subscriptionBadge}>
                <IconSymbol ios_icon_name="crown.fill" android_material_icon_name="workspace-premium" size={24} color="#FFD700" />
                <Text style={styles.subscriptionBadgeText}>Premium Member</Text>
              </View>
              <Text style={[styles.subscriptionDetails, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
                {planType === 'yearly' ? 'Yearly Plan' : 'Monthly Plan'}
                {expiresAt && ` • Renews ${new Date(expiresAt).toLocaleDateString()}`}
                {cancelAtPeriodEnd && ' • Cancels at period end'}
              </Text>
              <TouchableOpacity style={styles.subscriptionButton} onPress={handleManageSubscription}>
                <Text style={styles.subscriptionButtonText}>Manage Subscription</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.upgradeCard, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}>
              <Text style={[styles.upgradeTitle, { color: isDark ? colors.dark.text : colors.light.text }]}>
                Upgrade to Premium
              </Text>
              <Text style={[styles.upgradeDescription, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
                Unlock advanced analytics, custom recipes, habit tracking, and more!
              </Text>
              <TouchableOpacity style={styles.upgradeButton} onPress={handleManageSubscription}>
                <Text style={styles.upgradeButtonText}>View Plans</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Personal Information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? colors.dark.text : colors.light.text }]}>
            Personal Information
          </Text>
          <View style={[styles.card, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}>
            <EditableSettingItem
              label="Sex"
              value={user?.sex || 'Not set'}
              onPress={() => openEditModal('sex')}
              isDark={isDark}
            />
            <EditableSettingItem
              label="Age"
              value={user?.date_of_birth ? `${calculateAge(user.date_of_birth)} years` : 'Not set'}
              onPress={() => openEditModal('dob')}
              isDark={isDark}
            />
            <EditableSettingItem
              label="Height"
              value={user?.height ? formatHeight(user.height, user.preferred_units) : 'Not set'}
              onPress={() => openEditModal('height')}
              isDark={isDark}
            />
            <EditableSettingItem
              label="Current Weight"
              value={user?.current_weight ? formatWeight(user.current_weight, user.preferred_units) : 'Not set'}
              onPress={() => openEditModal('weight')}
              isDark={isDark}
            />
            <EditableSettingItem
              label="Activity Level"
              value={user?.activity_level || 'Not set'}
              onPress={() => openEditModal('activity')}
              isDark={isDark}
            />
          </View>
        </View>

        {/* Goals */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: isDark ? colors.dark.text : colors.light.text }]}>
            Goals
          </Text>
          <View style={[styles.card, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}>
            <EditableSettingItem
              label="Goal Type"
              value={goal?.goal_type ? formatGoalType(goal.goal_type) : 'Not set'}
              onPress={() => openEditModal('goal_type')}
              isDark={isDark}
            />
            <EditableSettingItem
              label="Goal Weight"
              value={user?.goal_weight ? formatWeight(user.goal_weight, user.preferred_units) : 'Not set'}
              onPress={() => openEditModal('goal_weight')}
              isDark={isDark}
            />
            <EditableSettingItem
              label="Start Date"
              value={goal?.start_date ? new Date(goal.start_date).toLocaleDateString() : 'Not set'}
              onPress={openStartDatePicker}
              isDark={isDark}
            />
            <EditableSettingItem
              label="Daily Calories"
              value={goal?.daily_calories ? `${goal.daily_calories} kcal` : 'Not set'}
              onPress={handleEditGoals}
              isDark={isDark}
              highlight
            />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: isDark ? colors.dark.primary : colors.light.primary }]}
            onPress={handleEditGoals}
          >
            <Text style={styles.buttonText}>Edit Goals & Macros</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.logoutButton,
              { borderColor: isDark ? colors.dark.text : colors.light.text },
            ]}
            onPress={handleLogout}
          >
            <Text style={[styles.logoutButtonText, { color: isDark ? colors.dark.text : colors.light.text }]}>
              Logout
            </Text>
          </TouchableOpacity>
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
          <View style={[styles.modalContent, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}>
            <Text style={[styles.modalTitle, { color: isDark ? colors.dark.text : colors.light.text }]}>
              Edit {editField}
            </Text>

            {editField === 'sex' && (
              <>
                <TouchableOpacity
                  style={[
                    styles.optionButton,
                    { borderColor: isDark ? colors.dark.border : colors.light.border },
                    editValue === 'male' && styles.optionButtonSelected,
                    editValue === 'male' && { borderColor: isDark ? colors.dark.primary : colors.light.primary },
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
                    { borderColor: isDark ? colors.dark.border : colors.light.border },
                    editValue === 'female' && styles.optionButtonSelected,
                    editValue === 'female' && { borderColor: isDark ? colors.dark.primary : colors.light.primary },
                  ]}
                  onPress={() => setEditValue('female')}
                >
                  <Text style={[styles.optionButtonText, { color: isDark ? colors.dark.text : colors.light.text }]}>
                    Female
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {editField === 'activity' && (
              <>
                {['sedentary', 'light', 'moderate', 'active', 'very_active'].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[
                      styles.optionButton,
                      { borderColor: isDark ? colors.dark.border : colors.light.border },
                      editValue === level && styles.optionButtonSelected,
                      editValue === level && { borderColor: isDark ? colors.dark.primary : colors.light.primary },
                    ]}
                    onPress={() => setEditValue(level)}
                  >
                    <Text style={[styles.optionButtonText, { color: isDark ? colors.dark.text : colors.light.text }]}>
                      {level.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
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
                      { borderColor: isDark ? colors.dark.border : colors.light.border },
                      editValue === type && styles.optionButtonSelected,
                      editValue === type && { borderColor: isDark ? colors.dark.primary : colors.light.primary },
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

            {['height', 'weight', 'goal_weight'].includes(editField || '') && (
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    borderColor: isDark ? colors.dark.border : colors.light.border,
                    color: isDark ? colors.dark.text : colors.light.text,
                    backgroundColor: isDark ? colors.dark.background : colors.light.background,
                  },
                ]}
                value={editValue}
                onChangeText={setEditValue}
                keyboardType="numeric"
                placeholder={`Enter ${editField}`}
                placeholderTextColor={isDark ? colors.dark.textSecondary : colors.light.textSecondary}
              />
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: isDark ? colors.dark.border : colors.light.border }]}
                onPress={closeEditModal}
              >
                <Text style={[styles.modalButtonText, { color: isDark ? colors.dark.text : colors.light.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: isDark ? colors.dark.primary : colors.light.primary }]}
                onPress={saveEditedField}
              >
                <Text style={[styles.modalButtonText, { color: '#FFF' }]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date Picker for DOB */}
      {showDatePicker && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}>
              <Text style={[styles.modalTitle, { color: isDark ? colors.dark.text : colors.light.text }]}>
                Select Date of Birth
              </Text>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => {
                  if (selectedDate) setTempDate(selectedDate);
                }}
                maximumDate={new Date()}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: isDark ? colors.dark.border : colors.light.border }]}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={[styles.modalButtonText, { color: isDark ? colors.dark.text : colors.light.text }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: isDark ? colors.dark.primary : colors.light.primary }]}
                  onPress={async () => {
                    await supabase
                      .from('users')
                      .update({
                        date_of_birth: tempDate.toISOString().split('T')[0],
                        updated_at: new Date().toISOString(),
                      })
                      .eq('id', user.id);
                    await loadUserData();
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={[styles.modalButtonText, { color: '#FFF' }]}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Date Picker for Start Date */}
      {showStartDatePicker && (
        <Modal visible transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}>
              <Text style={[styles.modalTitle, { color: isDark ? colors.dark.text : colors.light.text }]}>
                Select Start Date
              </Text>
              <DateTimePicker
                value={tempDate}
                mode="date"
                display="spinner"
                onChange={handleStartDateChange}
                maximumDate={new Date()}
              />
              {Platform.OS === 'ios' && (
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: isDark ? colors.dark.border : colors.light.border }]}
                    onPress={() => setShowStartDatePicker(false)}
                  >
                    <Text style={[styles.modalButtonText, { color: isDark ? colors.dark.text : colors.light.text }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, { backgroundColor: isDark ? colors.dark.primary : colors.light.primary }]}
                    onPress={() => saveStartDate(tempDate)}
                  >
                    <Text style={[styles.modalButtonText, { color: '#FFF' }]}>Done</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

function EditableSettingItem({ label, value, onPress, isDark, highlight }: {
  label: string;
  value: string;
  onPress: () => void;
  isDark: boolean;
  highlight?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.settingRow} onPress={onPress}>
      <Text style={[styles.settingLabel, { color: isDark ? colors.dark.textSecondary : colors.light.textSecondary }]}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <Text style={[
          styles.settingValue,
          { color: highlight ? (isDark ? colors.dark.primary : colors.light.primary) : (isDark ? colors.dark.text : colors.light.text) }
        ]}>
          {value}
        </Text>
        <IconSymbol
          ios_icon_name="chevron.right"
          android_material_icon_name="chevron-right"
          size={20}
          color={isDark ? colors.dark.textSecondary : colors.light.textSecondary}
        />
      </View>
    </TouchableOpacity>
  );
}
