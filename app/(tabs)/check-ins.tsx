
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';

interface CheckIn {
  id: string;
  date: string;
  weight: number | null;
  steps: number | null;
  steps_goal: number | null;
  went_to_gym: boolean;
  measurements: any;
  photo_url: string | null;
  notes: string | null;
}

export default function CheckInsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);

  const loadCheckIns = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        console.log('[CheckIns] No user found');
        setLoading(false);
        return;
      }

      setUser(authUser);

      // Load user profile to get preferred units
      const { data: userData } = await supabase
        .from('users')
        .select('preferred_units')
        .eq('id', authUser.id)
        .maybeSingle();

      if (userData) {
        setUser({ ...authUser, ...userData });
      }

      console.log('[CheckIns] Loading check-ins for user:', authUser.id);

      const { data, error } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', authUser.id)
        .order('date', { ascending: false });

      if (error) {
        console.error('[CheckIns] Error loading check-ins:', error);
        Alert.alert('Error', 'Failed to load check-ins');
      } else {
        console.log('[CheckIns] Loaded', data?.length || 0, 'check-ins');
        setCheckIns(data || []);
      }
    } catch (error) {
      console.error('[CheckIns] Error in loadCheckIns:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log('[CheckIns] Screen focused, loading data');
      loadCheckIns();
    }, [loadCheckIns])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadCheckIns();
  };

  const handleNewCheckIn = () => {
    router.push('/check-in-form');
  };

  const handleViewCheckIn = (checkIn: CheckIn) => {
    router.push({
      pathname: '/check-in-details',
      params: { checkInId: checkIn.id },
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
      });
    }
  };

  const formatWeight = (weight: number | null) => {
    if (!weight) return 'N/A';
    const units = user?.preferred_units || 'metric';
    if (units === 'imperial') {
      const lbs = Math.round(weight * 2.20462);
      return `${lbs} lbs`;
    }
    return `${Math.round(weight)} kg`;
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}
        edges={['top']}
      >
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: isDark ? colors.textDark : colors.text }]}>
            Loading check-ins...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}
      edges={['top']}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDark ? colors.textDark : colors.text }]}>
          Check-Ins
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* New Check-In Button */}
        <TouchableOpacity
          style={[styles.newButton, { backgroundColor: colors.primary }]}
          onPress={handleNewCheckIn}
          activeOpacity={0.8}
        >
          <IconSymbol
            ios_icon_name="plus.circle.fill"
            android_material_icon_name="add_circle"
            size={24}
            color="#FFFFFF"
          />
          <Text style={styles.newButtonText}>New Check-In</Text>
        </TouchableOpacity>

        {/* Check-Ins List */}
        {checkIns.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
            <IconSymbol
              ios_icon_name="chart.line.uptrend.xyaxis"
              android_material_icon_name="trending_up"
              size={48}
              color={isDark ? colors.textSecondaryDark : colors.textSecondary}
            />
            <Text style={[styles.emptyTitle, { color: isDark ? colors.textDark : colors.text }]}>
              No Check-Ins Yet
            </Text>
            <Text style={[styles.emptyText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Track your progress by recording weight, measurements, steps, and more.
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: colors.primary }]}
              onPress={handleNewCheckIn}
            >
              <Text style={styles.emptyButtonText}>Create Your First Check-In</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.checkInsList}>
            {checkIns.map((checkIn, index) => (
              <React.Fragment key={checkIn.id}>
                <TouchableOpacity
                  style={[styles.checkInCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}
                  onPress={() => handleViewCheckIn(checkIn)}
                  activeOpacity={0.7}
                >
                  <View style={styles.checkInHeader}>
                    <View style={styles.checkInDateContainer}>
                      <IconSymbol
                        ios_icon_name="calendar"
                        android_material_icon_name="calendar_today"
                        size={20}
                        color={colors.primary}
                      />
                      <Text style={[styles.checkInDate, { color: isDark ? colors.textDark : colors.text }]}>
                        {formatDate(checkIn.date)}
                      </Text>
                    </View>
                    <IconSymbol
                      ios_icon_name="chevron.right"
                      android_material_icon_name="chevron_right"
                      size={20}
                      color={isDark ? colors.textSecondaryDark : colors.textSecondary}
                    />
                  </View>

                  <View style={styles.checkInStats}>
                    {/* Weight */}
                    {checkIn.weight && (
                      <View style={styles.statItem}>
                        <IconSymbol
                          ios_icon_name="scalemass"
                          android_material_icon_name="monitor_weight"
                          size={18}
                          color={isDark ? colors.textSecondaryDark : colors.textSecondary}
                        />
                        <Text style={[styles.statText, { color: isDark ? colors.textDark : colors.text }]}>
                          {formatWeight(checkIn.weight)}
                        </Text>
                      </View>
                    )}

                    {/* Steps */}
                    {checkIn.steps !== null && (
                      <View style={styles.statItem}>
                        <IconSymbol
                          ios_icon_name="figure.walk"
                          android_material_icon_name="directions_walk"
                          size={18}
                          color={isDark ? colors.textSecondaryDark : colors.textSecondary}
                        />
                        <Text style={[styles.statText, { color: isDark ? colors.textDark : colors.text }]}>
                          {checkIn.steps.toLocaleString()}
                          {checkIn.steps_goal && ` / ${checkIn.steps_goal.toLocaleString()}`}
                        </Text>
                      </View>
                    )}

                    {/* Gym */}
                    {checkIn.went_to_gym && (
                      <View style={styles.statItem}>
                        <IconSymbol
                          ios_icon_name="dumbbell.fill"
                          android_material_icon_name="fitness_center"
                          size={18}
                          color={colors.success}
                        />
                        <Text style={[styles.statText, { color: colors.success }]}>
                          Gym
                        </Text>
                      </View>
                    )}

                    {/* Photo indicator */}
                    {checkIn.photo_url && (
                      <View style={styles.statItem}>
                        <IconSymbol
                          ios_icon_name="photo"
                          android_material_icon_name="photo"
                          size={18}
                          color={colors.info}
                        />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </React.Fragment>
            ))}
          </View>
        )}

        <View style={styles.bottomSpacer} />
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'android' ? spacing.lg : 0,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.h2,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 120,
  },
  newButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)',
    elevation: 3,
  },
  newButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  emptyTitle: {
    ...typography.h3,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  checkInsList: {
    gap: spacing.md,
  },
  checkInCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  checkInHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  checkInDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkInDate: {
    ...typography.h3,
    fontSize: 18,
  },
  checkInStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    ...typography.body,
    fontSize: 14,
  },
  bottomSpacer: {
    height: 40,
  },
});
