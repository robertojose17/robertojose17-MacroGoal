
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/app/integrations/supabase/client';
import { useColorScheme } from '@/hooks/useColorScheme';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [goalData, setGoalData] = useState<any>(null);
  const [subscription, setSubscription] = useState<any>(null);

  const loadData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No user found');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      console.log('Loading profile data for user:', user.id);

      // Load user data
      const { data: userRes, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Error loading user data:', userError);
      } else {
        console.log('User data loaded:', userRes);
        setUserData(userRes);
      }

      // Load goal data
      const { data: goalRes, error: goalError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (goalError) {
        console.error('Error loading goal data:', goalError);
      } else {
        console.log('Goal data loaded:', goalRes);
        setGoalData(goalRes);
      }

      // Load subscription data
      const { data: subRes, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (subError) {
        console.error('Error loading subscription data:', subError);
      } else {
        console.log('Subscription data loaded:', subRes);
        setSubscription(subRes);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleEditGoals = () => {
    router.push('/edit-goals');
  };

  const handleViewSubscription = () => {
    router.push('/paywall');
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors[colorScheme].background }]}>
        <ActivityIndicator size="large" color={colors[colorScheme].primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors[colorScheme].background }]} edges={['top']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.content}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors[colorScheme].text }]}>Profile</Text>
        </View>

        {/* Personal Info Card */}
        <View style={[styles.card, { backgroundColor: colors[colorScheme].card }]}>
          <View style={styles.cardHeader}>
            <IconSymbol 
              ios_icon_name="person.circle.fill" 
              android_material_icon_name="account-circle" 
              size={24} 
              color={colors[colorScheme].primary} 
            />
            <Text style={[styles.cardTitle, { color: colors[colorScheme].text }]}>Personal Info</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors[colorScheme].textSecondary }]}>Email</Text>
            <Text style={[styles.value, { color: colors[colorScheme].text }]}>
              {userData?.email || 'Not set'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors[colorScheme].textSecondary }]}>Weight</Text>
            <Text style={[styles.value, { color: colors[colorScheme].text }]}>
              {userData?.weight ? `${userData.weight} kg` : 'Not set'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors[colorScheme].textSecondary }]}>Height</Text>
            <Text style={[styles.value, { color: colors[colorScheme].text }]}>
              {userData?.height ? `${userData.height} cm` : 'Not set'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors[colorScheme].textSecondary }]}>Sex</Text>
            <Text style={[styles.value, { color: colors[colorScheme].text }]}>
              {userData?.sex || 'Not set'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors[colorScheme].textSecondary }]}>Date of Birth</Text>
            <Text style={[styles.value, { color: colors[colorScheme].text }]}>
              {userData?.dob || 'Not set'}
            </Text>
          </View>
        </View>

        {/* Goals Card */}
        <View style={[styles.card, { backgroundColor: colors[colorScheme].card }]}>
          <View style={styles.cardHeader}>
            <IconSymbol 
              ios_icon_name="target" 
              android_material_icon_name="track-changes" 
              size={24} 
              color={colors[colorScheme].primary} 
            />
            <Text style={[styles.cardTitle, { color: colors[colorScheme].text }]}>Daily Goals</Text>
          </View>
          {goalData ? (
            <>
              <View style={styles.infoRow}>
                <Text style={[styles.label, { color: colors[colorScheme].textSecondary }]}>Calories</Text>
                <Text style={[styles.value, { color: colors[colorScheme].text }]}>
                  {goalData.daily_calories} kcal
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.label, { color: colors[colorScheme].textSecondary }]}>Protein</Text>
                <Text style={[styles.value, { color: colors[colorScheme].text }]}>
                  {goalData.protein_g}g
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.label, { color: colors[colorScheme].textSecondary }]}>Carbs</Text>
                <Text style={[styles.value, { color: colors[colorScheme].text }]}>
                  {goalData.carbs_g}g
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.label, { color: colors[colorScheme].textSecondary }]}>Fats</Text>
                <Text style={[styles.value, { color: colors[colorScheme].text }]}>
                  {goalData.fats_g}g
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.label, { color: colors[colorScheme].textSecondary }]}>Fiber</Text>
                <Text style={[styles.value, { color: colors[colorScheme].text }]}>
                  {goalData.fiber_g}g
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={[styles.label, { color: colors[colorScheme].textSecondary }]}>Goal Type</Text>
                <Text style={[styles.value, { color: colors[colorScheme].text }]}>
                  {goalData.goal_type || 'Not set'}
                </Text>
              </View>
            </>
          ) : (
            <Text style={[styles.emptyText, { color: colors[colorScheme].textSecondary }]}>
              No active goals set. Tap "Edit Goals" to set your targets.
            </Text>
          )}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors[colorScheme].primary }]}
            onPress={handleEditGoals}
          >
            <IconSymbol 
              ios_icon_name="pencil" 
              android_material_icon_name="edit" 
              size={20} 
              color="#fff" 
            />
            <Text style={styles.buttonText}>Edit Goals</Text>
          </TouchableOpacity>
        </View>

        {/* Subscription Card */}
        <View style={[styles.card, { backgroundColor: colors[colorScheme].card }]}>
          <View style={styles.cardHeader}>
            <IconSymbol 
              ios_icon_name="star.circle.fill" 
              android_material_icon_name="star" 
              size={24} 
              color={colors[colorScheme].primary} 
            />
            <Text style={[styles.cardTitle, { color: colors[colorScheme].text }]}>Subscription</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={[styles.label, { color: colors[colorScheme].textSecondary }]}>Status</Text>
            <Text style={[styles.value, { color: colors[colorScheme].text }]}>
              {subscription?.status || 'Free'}
            </Text>
          </View>
          {subscription?.plan_name && (
            <View style={styles.infoRow}>
              <Text style={[styles.label, { color: colors[colorScheme].textSecondary }]}>Plan</Text>
              <Text style={[styles.value, { color: colors[colorScheme].text }]}>
                {subscription.plan_name}
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors[colorScheme].primary }]}
            onPress={handleViewSubscription}
          >
            <IconSymbol 
              ios_icon_name="arrow.up.circle.fill" 
              android_material_icon_name="upgrade" 
              size={20} 
              color="#fff" 
            />
            <Text style={styles.buttonText}>
              {subscription?.status === 'active' ? 'Manage Subscription' : 'Upgrade to Premium'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
    paddingBottom: 100, // Extra padding for FloatingTabBar
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  card: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128, 128, 128, 0.1)',
  },
  label: {
    fontSize: 16,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
});
