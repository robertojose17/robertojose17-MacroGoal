
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { IconSymbol } from "@/components/IconSymbol";
import { useColorScheme } from "@/hooks/useColorScheme";
import { colors, spacing, borderRadius, typography } from "@/styles/commonStyles";
import { supabase } from "@/app/integrations/supabase/client";
import { useRouter } from "expo-router";

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [goalData, setGoalData] = useState<any>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      const { data: goal } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      setUserData({ ...user, ...profile });
      setGoalData(goal);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: colors[colorScheme].background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors[colorScheme].primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors[colorScheme].background }]} edges={['top']}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={[styles.profileHeader, { backgroundColor: colors[colorScheme].card }]}>
          <IconSymbol 
            ios_icon_name="person.circle.fill" 
            android_material_icon_name="person" 
            size={80} 
            color={colors[colorScheme].primary} 
          />
          <Text style={[styles.name, { color: colors[colorScheme].text }]}>
            {userData?.email || 'User'}
          </Text>
          {userData?.email && (
            <Text style={[styles.email, { color: colors[colorScheme].textSecondary }]}>
              {userData.email}
            </Text>
          )}
        </View>

        {goalData && (
          <View style={[styles.section, { backgroundColor: colors[colorScheme].card }]}>
            <Text style={[styles.sectionTitle, { color: colors[colorScheme].text }]}>Daily Goals</Text>
            <View style={styles.infoRow}>
              <IconSymbol 
                ios_icon_name="flame.fill" 
                android_material_icon_name="local-fire-department" 
                size={20} 
                color={colors[colorScheme].textSecondary} 
              />
              <Text style={[styles.infoText, { color: colors[colorScheme].text }]}>
                {goalData.daily_calories} calories
              </Text>
            </View>
            <View style={styles.infoRow}>
              <IconSymbol 
                ios_icon_name="chart.bar.fill" 
                android_material_icon_name="bar-chart" 
                size={20} 
                color={colors[colorScheme].textSecondary} 
              />
              <Text style={[styles.infoText, { color: colors[colorScheme].text }]}>
                P: {goalData.protein_g}g | C: {goalData.carbs_g}g | F: {goalData.fats_g}g
              </Text>
            </View>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors[colorScheme].primary }]}
          onPress={() => router.push('/edit-goals')}
        >
          <Text style={styles.buttonText}>Edit Goals</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.signOutButton, { backgroundColor: colors[colorScheme].error }]}
          onPress={handleSignOut}
        >
          <Text style={styles.buttonText}>Sign Out</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  profileHeader: {
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  name: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  email: {
    fontSize: typography.sizes.md,
  },
  section: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    marginBottom: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoText: {
    fontSize: typography.sizes.md,
  },
  button: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  signOutButton: {
    marginTop: spacing.lg,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
});
