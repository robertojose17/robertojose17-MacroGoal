
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
  Pressable,
  Alert,
  ActionSheetIOS,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack, useFocusEffect } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { colors, spacing, borderRadius } from '@/styles/commonStyles';
import {
  Tracker,
  TrackerEntry,
  TrackerStats,
  getStats,
  listEntries,
  deleteEntry,
  deleteTracker,
  listTrackers,
  backfillWeightFromCheckIns,
} from '@/utils/trackersApi';
import {
  Flame,
  Trophy,
  Target,
  TrendingUp,
  Calendar,
  MoreHorizontal,
  Plus,
  Trash2,
  CheckCircle2,
  BarChart3,
} from 'lucide-react-native';
import SwipeToDeleteRow from '@/components/SwipeToDeleteRow';

// ─── AnimatedPressable ────────────────────────────────────────────────────────
function AnimatedPressable({
  onPress,
  style,
  children,
  scaleValue = 0.97,
  disabled,
}: {
  onPress?: () => void;
  style?: object | object[];
  children: React.ReactNode;
  scaleValue?: number;
  disabled?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const animIn = () =>
    Animated.spring(scale, { toValue: scaleValue, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  const animOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  return (
    <Animated.View style={[{ transform: [{ scale }] }, disabled && { opacity: 0.5 }]}>
      <Pressable onPressIn={animIn} onPressOut={animOut} onPress={onPress} disabled={disabled} style={style}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  sub,
  icon,
  iconColor,
  isDark,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  iconColor: string;
  isDark: boolean;
}) {
  const cardBg = isDark ? colors.cardDark : colors.card;
  const cardBorder = isDark ? colors.cardBorderDark : colors.cardBorder;
  const textColor = isDark ? colors.textDark : colors.text;
  const subColor = isDark ? colors.textSecondaryDark : colors.textSecondary;

  return (
    <View style={[styles.statCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      <View style={[styles.statIconCircle, { backgroundColor: iconColor + '18' }]}>
        {icon}
      </View>
      <Text style={[styles.statValue, { color: textColor }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: subColor }]}>{label}</Text>
      {sub ? <Text style={[styles.statSub, { color: subColor }]}>{sub}</Text> : null}
    </View>
  );
}

// ─── SkeletonStatCard ─────────────────────────────────────────────────────────
function SkeletonStatCard({ isDark }: { isDark: boolean }) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const shimmer = isDark ? '#3A3C52' : '#D4D6DA';
  const cardBg = isDark ? colors.cardDark : colors.card;
  const cardBorder = isDark ? colors.cardBorderDark : colors.cardBorder;
  return (
    <Animated.View style={[styles.statCard, { backgroundColor: cardBg, borderColor: cardBorder, opacity }]}>
      <View style={[styles.skeletonCircle, { backgroundColor: shimmer }]} />
      <View style={[styles.skeletonLine, { width: 48, backgroundColor: shimmer, marginTop: 8 }]} />
      <View style={[styles.skeletonLine, { width: 64, height: 11, backgroundColor: shimmer, marginTop: 6 }]} />
    </Animated.View>
  );
}

// ─── Format helpers ───────────────────────────────────────────────────────────
function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  if (target.getTime() === today.getTime()) return 'Today';
  if (target.getTime() === yesterday.getTime()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatValue(value: number, trackerType: string, unit: string | null): string {
  if (trackerType === 'binary') return value === 1 ? 'Done ✓' : 'Skipped';
  const num = Number(value);
  const unitStr = unit ? ` ${unit}` : '';
  if (trackerType === 'duration') {
    if (num >= 60) {
      const h = Math.floor(num / 60);
      const min = num % 60;
      return min > 0 ? `${h}h ${min}m` : `${h}h`;
    }
    return `${num}m`;
  }
  return `${num % 1 === 0 ? num : num.toFixed(1)}${unitStr}`;
}

function getCheckInType(name: string): 'weight' | 'steps' | 'gym' | null {
  const lower = name.toLowerCase();
  if (lower === 'weight') return 'weight';
  if (lower === 'steps') return 'steps';
  if (lower === 'gym') return 'gym';
  return null;
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function TrackerDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [tracker, setTracker] = useState<Tracker | null>(null);
  const [stats, setStats] = useState<TrackerStats | null>(null);
  const [entries, setEntries] = useState<TrackerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    console.log('[TrackerDetail] Loading data for tracker:', id);
    try {
      setError(null);
      const [allTrackers, statsData] = await Promise.all([
        listTrackers(),
        getStats(id),
      ]);
      const found = allTrackers.find(t => t.id === id) ?? null;
      setTracker(found);
      setStats(statsData);

      // Backfill check_ins → tracker_entries for the weight tracker before listing entries
      if (found && found.name.toLowerCase() === 'weight') {
        console.log('[TrackerDetail] Weight tracker detected — running check_ins backfill');
        await backfillWeightFromCheckIns(id);
      }

      const entriesData = await listEntries(id, 500);
      setEntries(entriesData);
      console.log('[TrackerDetail] Loaded tracker:', found?.name, 'entries:', entriesData.length);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load tracker';
      console.error('[TrackerDetail] Error:', msg);
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      console.log('[TrackerDetail] Screen focused');
      setLoading(true);
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    console.log('[TrackerDetail] Pull-to-refresh');
    setRefreshing(true);
    loadData();
  };

  const handleMore = () => {
    console.log('[TrackerDetail] More button tapped');
    if (!tracker || tracker.is_default) return;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancel', 'Delete tracker'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
          title: tracker.name,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) confirmDelete();
        }
      );
    } else {
      Alert.alert(tracker.name, 'What would you like to do?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete tracker', style: 'destructive', onPress: confirmDelete },
      ]);
    }
  };

  const confirmDelete = () => {
    console.log('[TrackerDetail] Confirm delete tracker:', id);
    Alert.alert('Delete tracker?', 'This will permanently delete this tracker and all its entries.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete tracker',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTracker(id!);
            console.log('[TrackerDetail] Tracker deleted, navigating back');
            router.back();
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Failed to delete';
            Alert.alert('Error', msg);
          }
        },
      },
    ]);
  };

  const handleDeleteEntry = async (entry: TrackerEntry) => {
    const isWeightTracker = tracker?.name.toLowerCase() === 'weight';
    console.log('[TrackerDetail] Delete entry:', entry.id, 'date:', entry.date, 'syncCheckIns:', isWeightTracker);
    try {
      await deleteEntry(id!, entry.id, isWeightTracker ? { syncCheckIns: true, date: entry.date } : undefined);
      setEntries(prev => prev.filter(e => e.id !== entry.id));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to delete entry';
      Alert.alert('Error', msg);
    }
  };

  const handleLogEntry = () => {
    console.log('[TrackerDetail] Log entry button tapped');
    if (tracker?.is_default) {
      const type = getCheckInType(tracker.name);
      if (type) {
        router.push({ pathname: '/check-in-form', params: { type } });
        return;
      }
    }
    router.push({ pathname: '/tracker/log', params: { trackerId: id } });
  };

  const bg = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const subColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardBg = isDark ? colors.cardDark : colors.card;
  const cardBorder = isDark ? colors.cardBorderDark : colors.cardBorder;

  const trackerTitle = tracker ? `${tracker.emoji} ${tracker.name}` : '';
  const completionPct = stats ? Math.round(Number(stats.completion_rate)) : 0;
  const avgDisplay = stats && tracker
    ? formatValue(Number(stats.avg_value), tracker.tracker_type, tracker.unit)
    : '—';
  const statusLabel =
    stats?.status === 'on_track' ? 'On Track 🟢' :
    stats?.status === 'improving' ? 'Improving 📈' :
    'Behind 🔴';
  const statusColor =
    stats?.status === 'on_track' ? colors.success :
    stats?.status === 'improving' ? colors.primary :
    colors.warning;

  return (
    <>
      <Stack.Screen
        options={{
          title: trackerTitle,
          headerBackButtonDisplayMode: 'minimal',
          headerRight: () => (
            tracker && !tracker.is_default ? (
              <AnimatedPressable onPress={handleMore} style={styles.headerIconBtn} scaleValue={0.9}>
                <MoreHorizontal size={20} color={subColor} strokeWidth={2} />
              </AnimatedPressable>
            ) : null
          ),
        }}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: bg }}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {loading ? (
          /* Skeleton */
          <>
            <View style={styles.statsGrid}>
              {[0, 1, 2, 3, 4, 5].map(i => <SkeletonStatCard key={i} isDark={isDark} />)}
            </View>
          </>
        ) : error ? (
          <View style={[styles.errorCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <Text style={[styles.errorTitle, { color: textColor }]}>Couldn't load tracker</Text>
            <Text style={[styles.errorSub, { color: subColor }]}>{error}</Text>
            <AnimatedPressable onPress={() => { setLoading(true); loadData(); }} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
              <Text style={styles.retryBtnText}>Try again</Text>
            </AnimatedPressable>
          </View>
        ) : (
          <>
            {/* Row 1: Streak + Best Streak */}
            <View style={styles.statsGrid}>
              <StatCard
                label="day streak"
                value={String(stats?.current_streak ?? 0)}
                sub="current"
                icon={<Flame size={20} color="#FF8A5B" strokeWidth={2} />}
                iconColor="#FF8A5B"
                isDark={isDark}
              />
              <StatCard
                label="best ever"
                value={String(stats?.best_streak ?? 0)}
                sub="all time"
                icon={<Trophy size={20} color="#F59E0B" strokeWidth={2} />}
                iconColor="#F59E0B"
                isDark={isDark}
              />
            </View>

            {/* Row 2: Completion + Days Tracked */}
            <View style={styles.statsGrid}>
              <StatCard
                label="of days logged"
                value={`${completionPct}%`}
                icon={<CheckCircle2 size={20} color={colors.success} strokeWidth={2} />}
                iconColor={colors.success}
                isDark={isDark}
              />
              <StatCard
                label="total entries"
                value={String(stats?.days_tracked ?? 0)}
                icon={<Calendar size={20} color={colors.primary} strokeWidth={2} />}
                iconColor={colors.primary}
                isDark={isDark}
              />
            </View>

            {/* Row 3: This Week + Last Week */}
            <View style={styles.statsGrid}>
              <StatCard
                label="this week"
                value={String(stats?.this_week_count ?? 0)}
                icon={<TrendingUp size={20} color="#8B5CF6" strokeWidth={2} />}
                iconColor="#8B5CF6"
                isDark={isDark}
              />
              <StatCard
                label="last week"
                value={String(stats?.last_week_count ?? 0)}
                icon={<BarChart3 size={20} color="#6B7280" strokeWidth={2} />}
                iconColor="#6B7280"
                isDark={isDark}
              />
            </View>

            {/* Row 4: Status card */}
            <View style={[styles.statusCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <View style={styles.statusCardRow}>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
                  <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
                </View>
                {tracker?.goal_value && stats ? (
                  <Text style={[styles.statusMeta, { color: subColor }]}>
                    {stats.days_goal_met} / {stats.days_tracked} days hit goal
                  </Text>
                ) : null}
              </View>
              {tracker && tracker.tracker_type !== 'binary' && stats && Number(stats.avg_value) > 0 ? (
                <View style={styles.avgRow}>
                  <Target size={14} color={subColor} strokeWidth={2} />
                  <Text style={[styles.avgText, { color: subColor }]}>
                    Avg: {avgDisplay}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Row 5: Recent Entries */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>Recent Entries</Text>
              <AnimatedPressable onPress={handleLogEntry} style={[styles.logEntryBtn, { backgroundColor: colors.primary }]} scaleValue={0.94}>
                <Plus size={14} color="#fff" strokeWidth={2.5} />
                <Text style={styles.logEntryBtnText}>Log entry</Text>
              </AnimatedPressable>
            </View>

            {entries.length === 0 ? (
              <View style={[styles.emptyEntries, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                <Text style={[styles.emptyEntriesTitle, { color: textColor }]}>No entries yet</Text>
                <Text style={[styles.emptyEntriesSub, { color: subColor }]}>
                  Log your first entry to start tracking progress
                </Text>
              </View>
            ) : (
              <View style={[styles.entriesList, { backgroundColor: cardBg, borderColor: cardBorder }]}>
                {entries.map((entry, index) => {
                  const valueDisplay = tracker
                    ? formatValue(Number(entry.value), tracker.tracker_type, tracker.unit)
                    : String(entry.value);
                  const dateDisplay = formatDate(entry.date);
                  const isLast = index === entries.length - 1;
                  return (
                    <SwipeToDeleteRow key={entry.id} onDelete={() => handleDeleteEntry(entry)}>
                      <View style={[styles.entryRow, !isLast && { borderBottomWidth: 1, borderBottomColor: isDark ? colors.borderDark : colors.border }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.entryDate, { color: textColor }]}>{dateDisplay}</Text>
                          {entry.notes ? (
                            <Text style={[styles.entryNotes, { color: subColor }]} numberOfLines={1}>
                              {entry.notes}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={[styles.entryValue, { color: colors.primary }]}>{valueDisplay}</Text>
                        <View style={[styles.deleteHint, { backgroundColor: colors.error + '18' }]}>
                          <Trash2 size={12} color={colors.error} strokeWidth={2} />
                        </View>
                      </View>
                    </SwipeToDeleteRow>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 120,
    paddingTop: spacing.sm,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  statCard: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    alignItems: 'center',
    boxShadow: '0px 1px 3px rgba(0,0,0,0.04), 0px 4px 12px rgba(0,0,0,0.03)',
    elevation: 2,
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    textAlign: 'center',
  },
  statSub: {
    fontSize: 11,
    marginTop: 1,
    textAlign: 'center',
  },
  statusCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    marginBottom: spacing.lg,
    boxShadow: '0px 1px 3px rgba(0,0,0,0.04), 0px 4px 12px rgba(0,0,0,0.03)',
    elevation: 2,
  },
  statusCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  statusMeta: {
    fontSize: 13,
    fontWeight: '500',
  },
  avgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
  },
  avgText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  logEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.sm,
  },
  logEntryBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  entriesList: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
    boxShadow: '0px 1px 3px rgba(0,0,0,0.04), 0px 4px 12px rgba(0,0,0,0.03)',
    elevation: 2,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  entryDate: {
    fontSize: 15,
    fontWeight: '500',
  },
  entryNotes: {
    fontSize: 12,
    marginTop: 2,
  },
  entryValue: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  deleteHint: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyEntries: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyEntriesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  emptyEntriesSub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Skeleton
  skeletonCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  skeletonLine: {
    height: 13,
    borderRadius: 6,
  },
  // Error
  errorCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  errorSub: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
