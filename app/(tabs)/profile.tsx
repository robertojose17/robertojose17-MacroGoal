
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/app/integrations/supabase/client';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { useSubscription } from '@/hooks/useSubscription';

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { isSubscribed, loading: subscriptionLoading } = useSubscription();

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [goalData, setGoalData] = useState<any>(null);

  useEffect(() => {
    loadUserData();
  }, []);

  async function loadUserData() {
    try {
      setLoading(true);
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

      setUserData(profile);
      setGoalData(goal);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
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
  }

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.dark.background : colors.light.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: isDark ? colors.dark.background : colors.light.background }]} 
      edges={['top']}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          Platform.OS !== 'ios' && styles.contentContainerWithTabBar
        ]}
      >
        <View style={[styles.header, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}>
          <IconSymbol 
            ios_icon_name="person.circle.fill"
            android_material_icon_name="account-circle"
            size={80} 
            color={colors.primary} 
          />
          <Text style={[styles.name, { color: isDark ? colors.dark.text : colors.light.text }]}>
            {userData?.email || 'User'}
          </Text>
          {isSubscribed && (
            <View style={styles.premiumBadge}>
              <IconSymbol 
                ios_icon_name="star.fill"
                android_material_icon_name="star"
                size={16} 
                color={colors.accent} 
              />
              <Text style={styles.premiumText}>Premium</Text>
            </View>
          )}
        </View>

        <View style={[styles.section, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/edit-goals')}>
            <IconSymbol 
              ios_icon_name="target"
              android_material_icon_name="flag"
              size={24} 
              color={isDark ? colors.dark.textSecondary : colors.light.textSecondary} 
            />
            <Text style={[styles.menuText, { color: isDark ? colors.dark.text : colors.light.text }]}>Edit Goals</Text>
            <IconSymbol 
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20} 
              color={isDark ? colors.dark.textSecondary : colors.light.textSecondary} 
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/subscription')}>
            <IconSymbol 
              ios_icon_name="star.fill"
              android_material_icon_name="star"
              size={24} 
              color={colors.accent} 
            />
            <Text style={[styles.menuText, { color: isDark ? colors.dark.text : colors.light.text }]}>
              {isSubscribed ? 'Manage Subscription' : 'Upgrade to Premium'}
            </Text>
            <IconSymbol 
              ios_icon_name="chevron.right"
              android_material_icon_name="chevron-right"
              size={20} 
              color={isDark ? colors.dark.textSecondary : colors.light.textSecondary} 
            />
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: isDark ? colors.dark.card : colors.light.card }]}>
          <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
            <IconSymbol 
              ios_icon_name="arrow.right.square"
              android_material_icon_name="exit-to-app"
              size={24} 
              color="#FF3B30" 
            />
            <Text style={[styles.menuText, { color: '#FF3B30' }]}>Sign Out</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  contentContainerWithTabBar: {
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  name: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.accent + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  premiumText: {
    color: colors.accent,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.semibold as any,
  },
  section: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  menuText: {
    flex: 1,
    fontSize: typography.sizes.md,
  },
});
