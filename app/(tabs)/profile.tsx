
import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { GlassView } from "expo-glass-effect";
import { useTheme } from "@react-navigation/native";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import { supabase } from "@/app/integrations/supabase/client";

interface UserData {
  email: string;
  date_of_birth: string | null;
  sex: string | null;
  height: number | null;
  current_weight: number | null;
  weight_unit: string;
  activity_level: string | null;
}

interface GoalData {
  daily_calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  fiber_g: number;
  goal_type: string;
}

interface SubscriptionData {
  status: string;
  plan_type: string | null;
}

export default function ProfileScreen() {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [goalData, setGoalData] = useState<GoalData | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);

  const loadProfileData = useCallback(async () => {
    if (!user?.id) {
      console.log('[Profile] No user ID available');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      console.log('[Profile] Loading profile data for user:', user.id);

      // Fetch user data from Supabase
      const { data: userDataResult, error: userError } = await supabase
        .from('users')
        .select('email, date_of_birth, sex, height, current_weight, weight_unit, activity_level')
        .eq('id', user.id)
        .maybeSingle();

      if (userError) {
        console.error('[Profile] Error fetching user data:', userError);
      } else if (userDataResult) {
        console.log('[Profile] User data loaded:', userDataResult);
        setUserData(userDataResult);
      }

      // Fetch active goal from Supabase
      const { data: goalDataResult, error: goalError } = await supabase
        .from('goals')
        .select('daily_calories, protein_g, carbs_g, fats_g, fiber_g, goal_type')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (goalError) {
        console.error('[Profile] Error fetching goal data:', goalError);
      } else if (goalDataResult) {
        console.log('[Profile] Goal data loaded:', goalDataResult);
        setGoalData(goalDataResult);
      }

      // Fetch subscription from Supabase
      const { data: subDataResult, error: subError } = await supabase
        .from('subscriptions')
        .select('status, plan_type')
        .eq('user_id', user.id)
        .maybeSingle();

      if (subError) {
        console.error('[Profile] Error fetching subscription data:', subError);
      } else if (subDataResult) {
        console.log('[Profile] Subscription data loaded:', subDataResult);
        setSubscription(subDataResult);
      }
    } catch (error) {
      console.error('[Profile] Error loading profile data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadProfileData();
  }, [loadProfileData]);

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

  const handleSignOut = () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut();
              router.replace("/");
            } catch (error) {
              Alert.alert("Error", "Failed to sign out");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const age = calculateAge(userData?.date_of_birth || null);
  const isPremium = subscription?.status === "active" || subscription?.status === "trialing";

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.contentContainer,
          Platform.OS !== 'ios' && styles.contentContainerWithTabBar
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
      >
        {/* Profile Header */}
        <GlassView style={[
          styles.profileHeader,
          Platform.OS !== 'ios' && { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
        ]} glassEffectStyle="regular">
          <IconSymbol ios_icon_name="person.circle.fill" android_material_icon_name="person" size={80} color={theme.colors.primary} />
          <Text style={[styles.name, { color: theme.colors.text }]}>{user?.name || "User"}</Text>
          <Text style={[styles.email, { color: theme.dark ? '#98989D' : '#666' }]}>{user?.email}</Text>
          {isPremium && (
            <View style={[styles.premiumBadge, { backgroundColor: theme.colors.primary }]}>
              <IconSymbol ios_icon_name="star.fill" android_material_icon_name="star" size={16} color="#FFF" />
              <Text style={styles.premiumText}>Premium</Text>
            </View>
          )}
        </GlassView>

        {/* User Stats */}
        {userData && (
          <GlassView style={[
            styles.section,
            Platform.OS !== 'ios' && { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
          ]} glassEffectStyle="regular">
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Personal Info</Text>
            {age && (
              <View style={styles.infoRow}>
                <IconSymbol ios_icon_name="calendar" android_material_icon_name="calendar-today" size={20} color={theme.dark ? '#98989D' : '#666'} />
                <Text style={[styles.infoText, { color: theme.colors.text }]}>{age} years old</Text>
              </View>
            )}
            {userData?.sex && (
              <View style={styles.infoRow}>
                <IconSymbol ios_icon_name="person.fill" android_material_icon_name="person" size={20} color={theme.dark ? '#98989D' : '#666'} />
                <Text style={[styles.infoText, { color: theme.colors.text }]}>{userData.sex === 'male' ? 'Male' : userData.sex === 'female' ? 'Female' : 'Other'}</Text>
              </View>
            )}
            {userData?.height && (
              <View style={styles.infoRow}>
                <IconSymbol ios_icon_name="ruler" android_material_icon_name="straighten" size={20} color={theme.dark ? '#98989D' : '#666'} />
                <Text style={[styles.infoText, { color: theme.colors.text }]}>{userData.height} cm</Text>
              </View>
            )}
            {userData?.current_weight && (
              <View style={styles.infoRow}>
                <IconSymbol ios_icon_name="scalemass" android_material_icon_name="monitor-weight" size={20} color={theme.dark ? '#98989D' : '#666'} />
                <Text style={[styles.infoText, { color: theme.colors.text }]}>{userData.current_weight} {userData.weight_unit || 'kg'}</Text>
              </View>
            )}
            {userData?.activity_level && (
              <View style={styles.infoRow}>
                <IconSymbol ios_icon_name="figure.walk" android_material_icon_name="directions-walk" size={20} color={theme.dark ? '#98989D' : '#666'} />
                <Text style={[styles.infoText, { color: theme.colors.text }]}>
                  {userData.activity_level === 'sedentary' ? 'Sedentary' :
                   userData.activity_level === 'light' ? 'Light Activity' :
                   userData.activity_level === 'moderate' ? 'Moderate Activity' :
                   userData.activity_level === 'active' ? 'Active' :
                   userData.activity_level === 'very_active' ? 'Very Active' : userData.activity_level}
                </Text>
              </View>
            )}
          </GlassView>
        )}

        {/* Daily Goals */}
        {goalData && (
          <GlassView style={[
            styles.section,
            Platform.OS !== 'ios' && { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
          ]} glassEffectStyle="regular">
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Daily Goals</Text>
            <View style={styles.infoRow}>
              <IconSymbol ios_icon_name="flame.fill" android_material_icon_name="local-fire-department" size={20} color={theme.dark ? '#98989D' : '#666'} />
              <Text style={[styles.infoText, { color: theme.colors.text }]}>{Math.round(goalData.daily_calories)} calories</Text>
            </View>
            <View style={styles.infoRow}>
              <IconSymbol ios_icon_name="p.circle.fill" android_material_icon_name="circle" size={20} color="#FF6B6B" />
              <Text style={[styles.infoText, { color: theme.colors.text }]}>{Math.round(goalData.protein_g)}g protein</Text>
            </View>
            <View style={styles.infoRow}>
              <IconSymbol ios_icon_name="c.circle.fill" android_material_icon_name="circle" size={20} color="#4ECDC4" />
              <Text style={[styles.infoText, { color: theme.colors.text }]}>{Math.round(goalData.carbs_g)}g carbs</Text>
            </View>
            <View style={styles.infoRow}>
              <IconSymbol ios_icon_name="f.circle.fill" android_material_icon_name="circle" size={20} color="#FFD93D" />
              <Text style={[styles.infoText, { color: theme.colors.text }]}>{Math.round(goalData.fats_g)}g fats</Text>
            </View>
            <View style={styles.infoRow}>
              <IconSymbol ios_icon_name="leaf.fill" android_material_icon_name="eco" size={20} color="#95E1D3" />
              <Text style={[styles.infoText, { color: theme.colors.text }]}>{Math.round(goalData.fiber_g)}g fiber</Text>
            </View>
            <TouchableOpacity 
              style={[styles.editButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => router.push("/edit-goals")}
            >
              <Text style={styles.editButtonText}>Edit Goals</Text>
            </TouchableOpacity>
          </GlassView>
        )}

        {/* No Data Message */}
        {!userData && !goalData && (
          <GlassView style={[
            styles.section,
            Platform.OS !== 'ios' && { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
          ]} glassEffectStyle="regular">
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Complete Your Profile</Text>
            <Text style={[styles.infoText, { color: theme.dark ? '#98989D' : '#666' }]}>
              Set up your goals to start tracking your nutrition and fitness journey.
            </Text>
            <TouchableOpacity 
              style={[styles.editButton, { backgroundColor: theme.colors.primary, marginTop: 12 }]}
              onPress={() => router.push("/edit-goals")}
            >
              <Text style={styles.editButtonText}>Set Up Goals</Text>
            </TouchableOpacity>
          </GlassView>
        )}

        {/* Sign Out Button */}
        <TouchableOpacity 
          style={[styles.signOutButton, { borderColor: theme.dark ? '#98989D' : '#666' }]}
          onPress={handleSignOut}
        >
          <IconSymbol ios_icon_name="arrow.right.square" android_material_icon_name="logout" size={20} color={theme.dark ? '#98989D' : '#666'} />
          <Text style={[styles.signOutText, { color: theme.dark ? '#98989D' : '#666' }]}>Sign Out</Text>
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
    padding: 20,
  },
  contentContainerWithTabBar: {
    paddingBottom: 100,
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
  name: {
    fontSize: 24,
    fontWeight: 'bold',
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
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    borderRadius: 12,
    padding: 20,
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 16,
  },
  editButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
