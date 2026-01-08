
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/app/integrations/supabase/client';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import CalendarDatePicker from '@/components/CalendarDatePicker';

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  height: number | null;
  current_weight: number | null;
  goal_weight: number | null;
  date_of_birth: string | null;
  sex: 'male' | 'female' | null;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | null;
  weight_loss_rate: number | null;
  journey_start_date: string | null;
  weight_unit: 'lbs' | 'kg';
}

interface Goals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

interface Subscription {
  status: 'active' | 'inactive' | 'trialing' | null;
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [goals, setGoals] = useState<Goals | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [])
  );

  const loadProfileData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Load user profile
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (userError) throw userError;

      // Load goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('calories, protein, carbs, fats')
        .eq('user_id', authUser.id)
        .eq('is_active', true)
        .single();

      if (goalsError && goalsError.code !== 'PGRST116') {
        console.error('Goals error:', goalsError);
      }

      // Load subscription
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', authUser.id)
        .single();

      if (subError && subError.code !== 'PGRST116') {
        console.error('Subscription error:', subError);
      }

      setUser(userData);
      setGoals(goalsData);
      setSubscription(subData);
    } catch (error) {
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

  const calculateAge = (dob: string | null): number | null => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatHeight = (heightCm: number | null): string => {
    if (!heightCm) return 'Not set';
    const totalInches = heightCm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}' ${inches}"`;
  };

  const formatWeight = (weight: number | null, unit: 'lbs' | 'kg'): string => {
    if (!weight) return 'Not set';
    return `${Math.round(weight)} ${unit}`;
  };

  const getActivityLabel = (level: string | null): string => {
    const labels = {
      sedentary: 'Sedentary',
      light: 'Light',
      moderate: 'Moderate',
      active: 'Active',
      very_active: 'Very Active',
    };
    return level ? labels[level as keyof typeof labels] || 'Not set' : 'Not set';
  };

  const getWeightLossRateLabel = (rate: number | null): string => {
    if (!rate) return 'Not set';
    if (rate === 0.5) return '0.5 lb/week (slow)';
    if (rate === 1) return '1 lb/week (moderate)';
    if (rate === 1.5) return '1.5 lb/week (aggressive)';
    return `${rate} lb/week`;
  };

  const handleLogOut = async () => {
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
            router.replace('/');
          },
        },
      ]
    );
  };

  const handleEditGoals = () => {
    router.push('/edit-goals');
  };

  const handleUpgradeToPremium = () => {
    Alert.alert('Premium', 'Premium subscription coming soon!');
  };

  const handleSetJourneyDate = async (selectedDate: Date) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const dateString = selectedDate.toISOString().split('T')[0];

      const { error } = await supabase
        .from('users')
        .update({ journey_start_date: dateString })
        .eq('id', authUser.id);

      if (error) throw error;

      setUser(prev => prev ? { ...prev, journey_start_date: dateString } : null);
      setShowDatePicker(false);
      Alert.alert('Success', 'Journey start date updated');
    } catch (error) {
      console.error('Error updating journey date:', error);
      Alert.alert('Error', 'Failed to update journey date');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#000' : '#F5F5F5' }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDark ? '#5B9FED' : '#007AFF'} />
        </View>
      </SafeAreaView>
    );
  }

  const age = calculateAge(user?.date_of_birth || null);
  const isPremium = subscription?.status === 'active';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#000' : '#F5F5F5' }]} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          Platform.OS !== 'ios' && styles.contentContainerWithTabBar
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#5B9FED' : '#007AFF'} />
        }
      >
        <Text style={[styles.screenTitle, { color: isDark ? '#FFF' : '#000' }]}>Profile</Text>

        {/* User Header Card */}
        <View style={[styles.headerCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}>
          <View style={[styles.avatar, { backgroundColor: isDark ? '#5B9FED' : '#007AFF' }]}>
            <Text style={styles.avatarText}>
              {user?.name ? user.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={[styles.userName, { color: isDark ? '#FFF' : '#000' }]}>
            {user?.name || 'User'}
          </Text>
          <Text style={[styles.userEmail, { color: isDark ? '#98989D' : '#666' }]}>
            {user?.email}
          </Text>
          <View style={[styles.badge, { backgroundColor: isDark ? '#5B9FED' : '#007AFF' }]}>
            <Text style={styles.badgeText}>{isPremium ? 'Premium' : 'Free'}</Text>
          </View>
        </View>

        {/* Subscription Section */}
        {!isPremium && (
          <View style={[styles.section, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}>
            <View style={styles.sectionHeader}>
              <IconSymbol
                ios_icon_name="lock.fill"
                android_material_icon_name="lock"
                size={20}
                color={isDark ? '#FFF' : '#000'}
              />
              <Text style={[styles.sectionTitle, { color: isDark ? '#FFF' : '#000' }]}>Subscription</Text>
            </View>
            <Text style={[styles.sectionSubtitle, { color: isDark ? '#98989D' : '#666' }]}>
              Unlock AI-powered meal estimation and future AI features
            </Text>
            <TouchableOpacity
              style={[styles.premiumButton, { backgroundColor: isDark ? '#5B9FED' : '#007AFF' }]}
              onPress={handleUpgradeToPremium}
            >
              <IconSymbol
                ios_icon_name="sparkles"
                android_material_icon_name="auto-awesome"
                size={20}
                color="#FFF"
              />
              <Text style={styles.premiumButtonText}>Upgrade to Premium</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Calorie & Goals Settings */}
        <View style={[styles.section, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#FFF' : '#000' }]}>
              Calorie & Goals Settings
            </Text>
            <TouchableOpacity onPress={handleEditGoals}>
              <Text style={[styles.advancedLink, { color: isDark ? '#5B9FED' : '#007AFF' }]}>Advanced</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.sectionSubtitle, { color: isDark ? '#98989D' : '#666' }]}>
            Edit any value to recalculate your daily targets
          </Text>

          {/* Profile Fields */}
          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: isDark ? '#98989D' : '#666' }]}>Name</Text>
            <View style={styles.fieldValueRow}>
              <Text style={[styles.fieldValue, { color: isDark ? '#FFF' : '#000' }]}>
                {user?.name || 'Not set'}
              </Text>
              <IconSymbol
                ios_icon_name="pencil"
                android_material_icon_name="edit"
                size={16}
                color={isDark ? '#5B9FED' : '#007AFF'}
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: isDark ? '#98989D' : '#666' }]}>Height</Text>
            <View style={styles.fieldValueRow}>
              <Text style={[styles.fieldValue, { color: isDark ? '#FFF' : '#000' }]}>
                {formatHeight(user?.height || null)}
              </Text>
              <IconSymbol
                ios_icon_name="pencil"
                android_material_icon_name="edit"
                size={16}
                color={isDark ? '#5B9FED' : '#007AFF'}
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: isDark ? '#98989D' : '#666' }]}>Current Weight</Text>
            <View style={styles.fieldValueRow}>
              <Text style={[styles.fieldValue, { color: isDark ? '#FFF' : '#000' }]}>
                {formatWeight(user?.current_weight || null, user?.weight_unit || 'lbs')}
              </Text>
              <IconSymbol
                ios_icon_name="pencil"
                android_material_icon_name="edit"
                size={16}
                color={isDark ? '#5B9FED' : '#007AFF'}
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: isDark ? '#98989D' : '#666' }]}>Goal Weight</Text>
            <View style={styles.fieldValueRow}>
              <Text style={[styles.fieldValue, { color: isDark ? '#FFF' : '#000' }]}>
                {formatWeight(user?.goal_weight || null, user?.weight_unit || 'lbs')}
              </Text>
              <IconSymbol
                ios_icon_name="pencil"
                android_material_icon_name="edit"
                size={16}
                color={isDark ? '#5B9FED' : '#007AFF'}
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: isDark ? '#98989D' : '#666' }]}>Age</Text>
            <View style={styles.fieldValueRow}>
              <Text style={[styles.fieldValue, { color: isDark ? '#FFF' : '#000' }]}>
                {age ? `${age} years` : 'Not set'}
              </Text>
              <IconSymbol
                ios_icon_name="pencil"
                android_material_icon_name="edit"
                size={16}
                color={isDark ? '#5B9FED' : '#007AFF'}
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: isDark ? '#98989D' : '#666' }]}>Sex</Text>
            <View style={styles.fieldValueRow}>
              <Text style={[styles.fieldValue, { color: isDark ? '#FFF' : '#000' }]}>
                {user?.sex ? user.sex.charAt(0).toUpperCase() + user.sex.slice(1) : 'Not set'}
              </Text>
              <IconSymbol
                ios_icon_name="pencil"
                android_material_icon_name="edit"
                size={16}
                color={isDark ? '#5B9FED' : '#007AFF'}
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: isDark ? '#98989D' : '#666' }]}>Activity Level</Text>
            <View style={styles.fieldValueRow}>
              <Text style={[styles.fieldValue, { color: isDark ? '#FFF' : '#000' }]}>
                {getActivityLabel(user?.activity_level || null)}
              </Text>
              <IconSymbol
                ios_icon_name="pencil"
                android_material_icon_name="edit"
                size={16}
                color={isDark ? '#5B9FED' : '#007AFF'}
              />
            </View>
          </View>

          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: isDark ? '#98989D' : '#666' }]}>Weight Loss Rate</Text>
            <View style={styles.fieldValueRow}>
              <Text style={[styles.fieldValue, { color: isDark ? '#FFF' : '#000' }]}>
                {getWeightLossRateLabel(user?.weight_loss_rate || null)}
              </Text>
              <IconSymbol
                ios_icon_name="pencil"
                android_material_icon_name="edit"
                size={16}
                color={isDark ? '#5B9FED' : '#007AFF'}
              />
            </View>
          </View>
        </View>

        {/* Current Daily Targets */}
        <View style={[styles.section, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#FFF' : '#000' }]}>Current Daily Targets</Text>
          <View style={styles.targetsGrid}>
            <View style={styles.targetItem}>
              <Text style={[styles.targetLabel, { color: isDark ? '#98989D' : '#666' }]}>Calories</Text>
              <Text style={[styles.targetValue, { color: isDark ? '#FFF' : '#000' }]}>
                {goals?.calories || 0}
              </Text>
            </View>
            <View style={styles.targetItem}>
              <Text style={[styles.targetLabel, { color: isDark ? '#98989D' : '#666' }]}>Protein</Text>
              <Text style={[styles.targetValue, { color: isDark ? '#FFF' : '#000' }]}>
                {goals?.protein || 0}g
              </Text>
            </View>
            <View style={styles.targetItem}>
              <Text style={[styles.targetLabel, { color: isDark ? '#98989D' : '#666' }]}>Carbs</Text>
              <Text style={[styles.targetValue, { color: isDark ? '#FFF' : '#000' }]}>
                {goals?.carbs || 0}g
              </Text>
            </View>
            <View style={styles.targetItem}>
              <Text style={[styles.targetLabel, { color: isDark ? '#98989D' : '#666' }]}>Fats</Text>
              <Text style={[styles.targetValue, { color: isDark ? '#FFF' : '#000' }]}>
                {goals?.fats || 0}g
              </Text>
            </View>
          </View>
        </View>

        {/* Journey Start Date */}
        <View style={[styles.section, { backgroundColor: isDark ? '#1C1C1E' : '#FFF' }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: isDark ? '#FFF' : '#000' }]}>Journey Start Date</Text>
            <TouchableOpacity onPress={() => setShowDatePicker(true)}>
              <View style={styles.setDateButton}>
                <Text style={[styles.setDateText, { color: isDark ? '#5B9FED' : '#007AFF' }]}>Set Date</Text>
                <IconSymbol
                  ios_icon_name="calendar"
                  android_material_icon_name="calendar-today"
                  size={16}
                  color={isDark ? '#5B9FED' : '#007AFF'}
                />
              </View>
            </TouchableOpacity>
          </View>
          <Text style={[styles.sectionSubtitle, { color: isDark ? '#98989D' : '#666' }]}>
            Track your progress from this date
          </Text>
          {user?.journey_start_date && (
            <Text style={[styles.journeyDate, { color: isDark ? '#FFF' : '#000' }]}>
              {new Date(user.journey_start_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          )}
        </View>

        {/* Log Out Button */}
        <TouchableOpacity style={styles.logOutButton} onPress={handleLogOut}>
          <Text style={styles.logOutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <CalendarDatePicker
          onDateSelect={handleSetJourneyDate}
          onClose={() => setShowDatePicker(false)}
          initialDate={user?.journey_start_date ? new Date(user.journey_start_date) : new Date()}
        />
      )}
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
    padding: 16,
  },
  contentContainerWithTabBar: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 34,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  headerCard: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  advancedLink: {
    fontSize: 16,
    fontWeight: '600',
  },
  premiumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  premiumButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  fieldLabel: {
    fontSize: 16,
  },
  fieldValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fieldValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  targetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 8,
  },
  targetItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
  },
  targetLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  targetValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  setDateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  setDateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  journeyDate: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  logOutButton: {
    borderWidth: 2,
    borderColor: '#FF3B30',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 32,
  },
  logOutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
});
