
import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Platform, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { IconSymbol } from '@/components/IconSymbol'
import { useTheme } from '@react-navigation/native'
import { useSubscription } from '@/hooks/useSubscription'
import { supabase } from '@/app/integrations/supabase/client'
import * as Linking from 'expo-linking'
import { useRouter, useFocusEffect } from 'expo-router'
import { cmToFeetInches, kgToLbs, getLossRateDisplayText, feetInchesToCm, lbsToKg, calculateBMR, calculateTDEE, calculateTargetCalories, calculateMacrosWithPreset } from '@/utils/calculations'
import { Sex, ActivityLevel, GoalType } from '@/types'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useColorScheme } from '@/hooks/useColorScheme'
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles'

type EditField = 'sex' | 'dob' | 'height' | 'weight' | 'activity' | 'units' | 'start_date' | 'goal_weight'

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    alignItems: 'center',
    borderRadius: 12,
    padding: 32,
    marginBottom: 16,
    gap: 12,
  },
  email: {
    fontSize: 16,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  premiumText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  section: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  planContent: {
    flex: 1,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  planPrice: {
    fontSize: 14,
    color: '#fff',
    marginTop: 4,
  },
  planSavings: {
    fontSize: 12,
    color: '#FFD700',
    marginTop: 2,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  featureItem: {
    fontSize: 14,
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingLabel: {
    fontSize: 16,
  },
  settingValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  editGoalsButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  editGoalsText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
})

export default function ProfileScreen() {
  const theme = useTheme()
  const router = useRouter()
  const colorScheme = useColorScheme()
  const { isSubscribed, loading, subscribe, refresh } = useSubscription()
  const [userEmail, setUserEmail] = useState<string>('')
  const [refreshing, setRefreshing] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [goal, setGoal] = useState<any>(null)

  useFocusEffect(
    useCallback(() => {
      loadUserData()
    }, [])
  )

  useEffect(() => {
    loadUserData()
    
    // Handle deep link return from Stripe
    const subscription = Linking.addEventListener('url', handleDeepLink)
    
    return () => subscription.remove()
  }, [])

  const handleDeepLink = ({ url }: { url: string }) => {
    const { queryParams } = Linking.parse(url)
    
    if (queryParams?.payment_success === 'true') {
      console.log('[Profile] Payment success detected, refreshing subscription status')
      // Aggressively refresh subscription status
      setTimeout(() => refresh(), 500)
      setTimeout(() => refresh(), 2000)
      setTimeout(() => refresh(), 5000)
      
      Alert.alert('Success!', 'Your premium subscription is now active!')
    } else if (queryParams?.payment_cancelled === 'true') {
      Alert.alert('Cancelled', 'Payment was cancelled')
    }
  }

  const loadUserData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        setUserEmail(authUser.email || '')

        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (userData) {
          setUser(userData)
        }

        const { data: goalData } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', authUser.id)
          .eq('is_active', true)
          .single()

        if (goalData) {
          setGoal(goalData)
        }
      }
    } catch (error) {
      console.error('[Profile] Error loading user data:', error)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadUserData()
    await refresh()
    setRefreshing(false)
  }

  const handleSubscribe = (plan: 'monthly' | 'yearly') => {
    Alert.alert(
      'Subscribe to Premium',
      `Unlock advanced analytics, custom recipes, and more for ${plan === 'monthly' ? '$9.99/month' : '$79.99/year'}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => subscribe(plan) },
      ]
    )
  }

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut()
            router.replace('/auth/welcome')
          },
        },
      ]
    )
  }

  const handleEditGoals = () => {
    router.push('/edit-goals')
  }

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const formatHeight = (heightCm: number, units: string) => {
    if (units === 'imperial') {
      const { feet, inches } = cmToFeetInches(heightCm)
      return `${feet}'${inches}"`
    }
    return `${heightCm} cm`
  }

  const formatWeight = (weightKg: number, units: string) => {
    if (units === 'imperial') {
      return `${kgToLbs(weightKg).toFixed(1)} lbs`
    }
    return `${weightKg.toFixed(1)} kg`
  }

  const formatGoalType = (goalType: string) => {
    switch (goalType) {
      case 'lose': return 'Lose Weight'
      case 'maintain': return 'Maintain Weight'
      case 'gain': return 'Gain Weight'
      default: return goalType
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    )
  }

  const isDark = colorScheme === 'dark'

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: theme.colors.card }]}>
          <IconSymbol 
            ios_icon_name="person.circle.fill" 
            android_material_icon_name="account-circle" 
            size={80} 
            color={theme.colors.primary} 
          />
          <Text style={[styles.email, { color: theme.colors.text }]}>{userEmail}</Text>
          
          {isSubscribed && (
            <View style={[styles.premiumBadge, { backgroundColor: '#FFD700' }]}>
              <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={16} color="#000" />
              <Text style={styles.premiumText}>Premium</Text>
            </View>
          )}
        </View>

        {/* User Info Section */}
        {user && (
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Personal Info</Text>
            
            {user.sex && (
              <View style={[styles.settingItem, { borderBottomColor: isDark ? '#333' : '#E5E5EA' }]}>
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Sex</Text>
                <Text style={[styles.settingValue, { color: theme.colors.text }]}>
                  {user.sex.charAt(0).toUpperCase() + user.sex.slice(1)}
                </Text>
              </View>
            )}

            {user.date_of_birth && (
              <View style={[styles.settingItem, { borderBottomColor: isDark ? '#333' : '#E5E5EA' }]}>
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Age</Text>
                <Text style={[styles.settingValue, { color: theme.colors.text }]}>
                  {calculateAge(user.date_of_birth)} years
                </Text>
              </View>
            )}

            {user.height && (
              <View style={[styles.settingItem, { borderBottomColor: isDark ? '#333' : '#E5E5EA' }]}>
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Height</Text>
                <Text style={[styles.settingValue, { color: theme.colors.text }]}>
                  {formatHeight(user.height, user.preferred_units)}
                </Text>
              </View>
            )}

            {user.current_weight && (
              <View style={[styles.settingItem, { borderBottomColor: isDark ? '#333' : '#E5E5EA' }]}>
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Current Weight</Text>
                <Text style={[styles.settingValue, { color: theme.colors.text }]}>
                  {formatWeight(user.current_weight, user.preferred_units)}
                </Text>
              </View>
            )}

            {user.activity_level && (
              <View style={[styles.settingItem, { borderBottomColor: isDark ? '#333' : '#E5E5EA', borderBottomWidth: 0 }]}>
                <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Activity Level</Text>
                <Text style={[styles.settingValue, { color: theme.colors.text }]}>
                  {user.activity_level.replace('_', ' ').split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Goals Section */}
        {goal && (
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Current Goals</Text>
            
            <View style={[styles.settingItem, { borderBottomColor: isDark ? '#333' : '#E5E5EA' }]}>
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Goal Type</Text>
              <Text style={[styles.settingValue, { color: theme.colors.text }]}>
                {formatGoalType(goal.goal_type)}
              </Text>
            </View>

            <View style={[styles.settingItem, { borderBottomColor: isDark ? '#333' : '#E5E5EA' }]}>
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Daily Calories</Text>
              <Text style={[styles.settingValue, { color: theme.colors.text }]}>
                {goal.daily_calories} kcal
              </Text>
            </View>

            <View style={[styles.settingItem, { borderBottomColor: isDark ? '#333' : '#E5E5EA' }]}>
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Protein</Text>
              <Text style={[styles.settingValue, { color: theme.colors.text }]}>
                {goal.protein_g}g
              </Text>
            </View>

            <View style={[styles.settingItem, { borderBottomColor: isDark ? '#333' : '#E5E5EA' }]}>
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Carbs</Text>
              <Text style={[styles.settingValue, { color: theme.colors.text }]}>
                {goal.carbs_g}g
              </Text>
            </View>

            <View style={[styles.settingItem, { borderBottomColor: isDark ? '#333' : '#E5E5EA', borderBottomWidth: 0 }]}>
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>Fats</Text>
              <Text style={[styles.settingValue, { color: theme.colors.text }]}>
                {goal.fats_g}g
              </Text>
            </View>

            <TouchableOpacity 
              style={[styles.editGoalsButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleEditGoals}
            >
              <Text style={styles.editGoalsText}>Edit Goals</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Subscription Section */}
        {!isSubscribed ? (
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Upgrade to Premium</Text>
            
            <TouchableOpacity 
              style={[styles.planButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => handleSubscribe('monthly')}
            >
              <View style={styles.planContent}>
                <Text style={styles.planTitle}>Monthly Plan</Text>
                <Text style={styles.planPrice}>$9.99/month</Text>
              </View>
              <IconSymbol ios_icon_name="arrow.right" android_material_icon_name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.planButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => handleSubscribe('yearly')}
            >
              <View style={styles.planContent}>
                <Text style={styles.planTitle}>Yearly Plan</Text>
                <Text style={styles.planPrice}>$79.99/year</Text>
                <Text style={styles.planSavings}>Save 33%</Text>
              </View>
              <IconSymbol ios_icon_name="arrow.right" android_material_icon_name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>

            <Text style={[styles.featuresTitle, { color: theme.colors.text }]}>Premium Features:</Text>
            <Text style={[styles.featureItem, { color: isDark ? '#98989D' : '#666' }]}>• Advanced analytics & trends</Text>
            <Text style={[styles.featureItem, { color: isDark ? '#98989D' : '#666' }]}>• Custom recipe builder</Text>
            <Text style={[styles.featureItem, { color: isDark ? '#98989D' : '#666' }]}>• Habit tracking & streaks</Text>
            <Text style={[styles.featureItem, { color: isDark ? '#98989D' : '#666' }]}>• Data export (CSV)</Text>
          </View>
        ) : (
          <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Premium Active</Text>
            <Text style={[styles.infoText, { color: isDark ? '#98989D' : '#666' }]}>
              You have access to all premium features!
            </Text>
          </View>
        )}

        {/* Logout Button */}
        <TouchableOpacity 
          style={[styles.logoutButton, { backgroundColor: '#FF3B30' }]}
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  )
}
