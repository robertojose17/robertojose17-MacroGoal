
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/useColorScheme';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { listTrackers, getStats, Tracker, TrackerStats } from '@/utils/trackersApi';
import { Flame, Trophy, Plus, ChevronRight, CheckCircle2 } from 'lucide-react-native';

// ─── AnimatedPressable ────────────────────────────────────────────────────────
function AnimatedPressable({
  onPress,
  style,
  children,
  scaleValue = 0.97,
}: {
  onPress?: () => void;
  style?: object | object[];
  children: React.ReactNode;
  scaleValue?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const animIn = () =>
    Animated.spring(scale, { toValue: scaleValue, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  const animOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable onPressIn={animIn} onPressOut={animOut} onPress={onPress} style={style}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

// ─── AnimatedListItem ─────────────────────────────────────────────────────────
function AnimatedListItem({ index, children }: { index: number; children: React.ReactNode }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 350, delay: index * 60, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 350, delay: index * 60, useNativeDriver: true }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <Animated.View style={{ opacity, transform: [{ translateY }] }}>{children}</Animated.View>;
}

// ─── SkeletonCard ─────────────────────────────────────────────────────────────
function SkeletonCard({ isDark }: { isDark: boolean }) {
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
  const bg = isDark ? colors.cardDark : colors.card;
  const shimmer = isDark ? '#3A3C52' : '#D4D6DA';
  return (
    <Animated.View style={[styles.card, { backgroundColor: bg, borderColor: isDark ? colors.cardBorderDark : colors.cardBorder, opacity }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.skeletonCircle, { backgroundColor: shimmer }]} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={[styles.skeletonLine, { width: '50%', backgroundColor: shimmer }]} />
          <View style={[styles.skeletonLine, { width: '30%', height: 11, backgroundColor: shimmer }]} />
        </View>
        <View style={[styles.skeletonPill, { backgroundColor: shimmer }]} />
      </View>
      <View style={[styles.divider, { backgroundColor: isDark ? colors.borderDark : colors.border }]} />
      <View style={styles.statsRow}>
        <View style={[styles.skeletonLine, { width: 80, backgroundColor: shimmer }]} />
        <View style={[styles.skeletonLine, { width: 70, backgroundColor: shimmer }]} />
        <View style={[styles.skeletonLine, { width: 50, backgroundColor: shimmer }]} />
      </View>
    </Animated.View>
  );
}

// ─── Default tracker type mapping ────────────────────────────────────────────
function getCheckInType(name: string): 'weight' | 'steps' | 'gym' | null {
  const lower = name.toLowerCase();
  if (lower === 'weight') return 'weight';
  if (lower === 'steps') return 'steps';
  if (lower === 'gym') return 'gym';
  return null;
}

// ─── TrackerCard ──────────────────────────────────────────────────────────────
function TrackerCard({
  tracker,
  stats,
  isDark,
  onPress,
  onLog,
}: {
  tracker: Tracker;
  stats: TrackerStats | null;
  isDark: boolean;
  onPress: () => void;
  onLog: () => void;
}) {
  const completionPct = stats ? Math.round(Number(stats.completion_rate) * 100) : 0;
  const streak = stats ? Number(stats.current_streak) : 0;
  const statusColor =
    stats?.status === 'on_track' ? colors.success :
    stats?.status === 'improving' ? colors.primary :
    colors.warning;

  const cardBg = isDark ? colors.cardDark : colors.card;
  const cardBorder = isDark ? colors.cardBorderDark : colors.cardBorder;
  const textColor = isDark ? colors.textDark : colors.text;
  const subColor = isDark ? colors.textSecondaryDark : colors.textSecondary;

  return (
    <AnimatedPressable onPress={onPress} style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      {/* Header row */}
      <View style={styles.cardHeader}>
        <View style={[styles.emojiCircle, { backgroundColor: isDark ? '#2A2C40' : '#EEF2FF' }]}>
          <Text style={styles.emojiText}>{tracker.emoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.trackerName, { color: textColor }]} numberOfLines={1}>
            {tracker.name}
          </Text>
          {tracker.unit && !tracker.is_default ? (
            <Text style={[styles.trackerUnit, { color: subColor }]}>{tracker.unit}</Text>
          ) : null}
        </View>
        <AnimatedPressable onPress={onLog} style={[styles.logButton, { backgroundColor: colors.primary }]} scaleValue={0.94}>
          <Plus size={14} color="#fff" strokeWidth={2.5} />
          <Text style={styles.logButtonText}>Log</Text>
        </AnimatedPressable>
        <ChevronRight size={16} color={subColor} strokeWidth={2} style={{ marginLeft: 4 }} />
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: isDark ? colors.borderDark : colors.border }]} />

      {/* Stats row */}
      <View style={styles.statsRow}>
        {/* Streak */}
        <View style={styles.statChip}>
          <Flame size={13} color="#FF8A5B" strokeWidth={2} />
          <Text style={[styles.statChipText, { color: textColor }]}>
            {streak}
            <Text style={[styles.statChipLabel, { color: subColor }]}> day streak</Text>
          </Text>
        </View>

        {/* Completion */}
        <View style={styles.statChip}>
          <CheckCircle2 size={13} color={colors.success} strokeWidth={2} />
          <Text style={[styles.statChipText, { color: textColor }]}>
            {completionPct}
            <Text style={[styles.statChipLabel, { color: subColor }]}>% rate</Text>
          </Text>
        </View>

        {/* Status badge */}
        {stats ? (
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {stats.status === 'on_track' ? 'on track' : stats.status === 'improving' ? 'improving' : 'behind'}
            </Text>
          </View>
        ) : (
          <View style={[styles.statusBadge, { backgroundColor: subColor + '22' }]}>
            <Text style={[styles.statusText, { color: subColor }]}>no data</Text>
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CheckInsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [statsMap, setStatsMap] = useState<Record<string, TrackerStats>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadingRef = useRef(false);

  const loadData = useCallback(async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    console.log('[CheckIns] Loading trackers and stats');
    try {
      setError(null);
      const rawTrackers = await listTrackers();
      const list = Array.isArray(rawTrackers) ? rawTrackers : [];
      console.log('[CheckIns] Loaded', list.length, 'trackers');
      setTrackers(list);

      const statsResults = await Promise.all(
        list.map(t => getStats(t.id).catch(() => null))
      );
      const map: Record<string, TrackerStats> = {};
      list.forEach((t, i) => {
        if (statsResults[i]) map[t.id] = statsResults[i]!;
      });
      setStatsMap(map);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load trackers';
      console.error('[CheckIns] Error loading data:', msg);
      // 404 means the feature endpoint isn't available yet — show empty state, not error
      if (msg.includes('404')) {
        setTrackers([]);
        setError(null);
      } else {
        setError(msg);
      }
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      console.log('[CheckIns] Screen focused');
      setLoading(true);
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    console.log('[CheckIns] Pull-to-refresh triggered');
    setRefreshing(true);
    loadData();
  };

  const handleCardPress = (tracker: Tracker) => {
    console.log('[CheckIns] Tracker card tapped:', tracker.name, tracker.id);
    router.push({ pathname: '/tracker/[id]', params: { id: tracker.id } });
  };

  const handleLog = (tracker: Tracker) => {
    console.log('[CheckIns] Log button tapped:', tracker.name, tracker.id);
    if (tracker.is_default) {
      const type = getCheckInType(tracker.name);
      if (type) {
        router.push({ pathname: '/check-in-form', params: { type } });
        return;
      }
    }
    router.push({ pathname: '/tracker/log', params: { trackerId: tracker.id } });
  };

  const handleCreateTracker = () => {
    console.log('[CheckIns] Create tracker button tapped');
    router.push('/tracker/create');
  };

  const bg = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const subColor = isDark ? colors.textSecondaryDark : colors.textSecondary;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Check-Ins',
          headerLargeTitle: true,
          headerTransparent: true,
          headerShadowVisible: false,
          headerLargeTitleShadowVisible: false,
          headerLargeStyle: { backgroundColor: 'transparent' },
          headerRight: () => (
            <AnimatedPressable onPress={handleCreateTracker} style={styles.headerButton} scaleValue={0.9}>
              <Plus size={22} color={colors.primary} strokeWidth={2.5} />
            </AnimatedPressable>
          ),
        }}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: bg }}
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Section header */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textColor }]}>Your Trackers</Text>
          {!loading && (
            <View style={[styles.countBadge, { backgroundColor: colors.primary + '22' }]}>
              <Text style={[styles.countBadgeText, { color: colors.primary }]}>{trackers.length}</Text>
            </View>
          )}
        </View>

        {/* Error state */}
        {error && !loading ? (
          <View style={[styles.errorCard, { backgroundColor: isDark ? colors.cardDark : colors.card, borderColor: isDark ? colors.cardBorderDark : colors.cardBorder }]}>
            <Text style={[styles.errorTitle, { color: textColor }]}>Couldn't load trackers</Text>
            <Text style={[styles.errorSub, { color: subColor }]}>Check your connection and try again</Text>
            <AnimatedPressable onPress={() => { setLoading(true); loadData(); }} style={[styles.retryButton, { backgroundColor: colors.primary }]}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </AnimatedPressable>
          </View>
        ) : loading ? (
          /* Skeleton */
          <View style={styles.list}>
            {[0, 1, 2].map(i => <SkeletonCard key={i} isDark={isDark} />)}
          </View>
        ) : trackers.length === 0 ? (
          /* Empty state */
          <View style={[styles.emptyCard, { backgroundColor: isDark ? colors.cardDark : colors.card, borderColor: isDark ? colors.cardBorderDark : colors.cardBorder }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.primary + '18' }]}>
              <Trophy size={32} color={colors.primary} strokeWidth={1.5} />
            </View>
            <Text style={[styles.emptyTitle, { color: textColor }]}>No trackers yet</Text>
            <Text style={[styles.emptySub, { color: subColor }]}>
              Create your first tracker to start building healthy habits
            </Text>
            <AnimatedPressable onPress={handleCreateTracker} style={[styles.emptyButton, { backgroundColor: colors.primary }]}>
              <Plus size={16} color="#fff" strokeWidth={2.5} />
              <Text style={styles.emptyButtonText}>Create tracker</Text>
            </AnimatedPressable>
          </View>
        ) : (
          /* Tracker list */
          <View style={styles.list}>
            {trackers.map((tracker, index) => (
              <AnimatedListItem key={tracker.id} index={index}>
                <TrackerCard
                  tracker={tracker}
                  stats={statsMap[tracker.id] ?? null}
                  isDark={isDark}
                  onPress={() => handleCardPress(tracker)}
                  onLog={() => handleLog(tracker)}
                />
              </AnimatedListItem>
            ))}
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 120,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  countBadge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  list: {
    gap: spacing.sm,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    boxShadow: '0px 1px 3px rgba(0,0,0,0.04), 0px 4px 12px rgba(0,0,0,0.03)',
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  emojiCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 20,
  },
  trackerName: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  trackerUnit: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 1,
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  logButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm,
    opacity: 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statChipLabel: {
    fontSize: 12,
    fontWeight: '400',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    marginLeft: 'auto',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  headerButton: {
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
  skeletonPill: {
    width: 56,
    height: 28,
    borderRadius: borderRadius.sm,
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
  retryButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  // Empty
  emptyCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
    marginBottom: spacing.lg,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});
