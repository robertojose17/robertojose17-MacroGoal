import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonCard } from '@/components/SkeletonLoader';
import { COLORS } from '@/constants/Colors';
import { apiGet } from '@/utils/api';
import { CheckIn } from '@/types';
import { Plus, TrendingUp, Scale, ChevronRight } from 'lucide-react-native';

const SUPABASE_URL = 'https://esgptfiofoaeguslgvcq.supabase.co';
const API_BASE = `${SUPABASE_URL}/functions/v1`;

function formatDateDisplay(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function SimpleLineChart({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 300;
  const height = 80;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((v - min) / range) * height,
  }));

  return (
    <View style={{ height, width: '100%', position: 'relative' }}>
      {pts.map((pt, i) => {
        if (i === 0) return null;
        const prev = pts[i - 1];
        const dx = pt.x - prev.x;
        const dy = pt.y - prev.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              left: prev.x,
              top: prev.y,
              width: len,
              height: 2,
              backgroundColor: COLORS.primary,
              transformOrigin: '0 50%',
              transform: [{ rotate: `${angle}deg` }],
            }}
          />
        );
      })}
      {pts.map((pt, i) => (
        <View
          key={`dot-${i}`}
          style={{
            position: 'absolute',
            left: pt.x - 4,
            top: pt.y - 4,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: COLORS.primary,
          }}
        />
      ))}
    </View>
  );
}

export default function ProgressScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchCheckIns = useCallback(async () => {
    console.log('[Progress] Fetching check-ins');
    try {
      const data = await apiGet<{ check_ins: CheckIn[] }>(`${API_BASE}/api/check-ins`);
      setCheckIns(data.check_ins ?? []);
      setError('');
    } catch (err) {
      console.error('[Progress] Fetch error:', err);
      setError('Failed to load check-ins');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCheckIns();
  }, [fetchCheckIns]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCheckIns();
  };

  const latest = checkIns[0];
  const chartData = [...checkIns].reverse().slice(-10).map(c => Number(c.weight) || 0);

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Progress',
          headerRight: () => (
            <AnimatedPressable
              onPress={() => {
                console.log('[Progress] New check-in pressed');
                router.push('/check-in-form');
              }}
              style={{ padding: 8 }}
            >
              <Plus size={22} color={COLORS.primary} />
            </AnimatedPressable>
          ),
        }}
      />
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120 }}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5, marginBottom: 4 }}>
            Progress
          </Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[Progress] New check-in button pressed');
              router.push('/check-in-form');
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 8,
              backgroundColor: COLORS.primary,
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 10,
              alignSelf: 'flex-start',
              marginTop: 8,
            }}
          >
            <Plus size={16} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>New Check-in</Text>
          </AnimatedPressable>
        </View>

        {loading ? (
          <View style={{ paddingHorizontal: 20 }}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : error ? (
          <View style={{ paddingHorizontal: 20, alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ color: COLORS.danger, marginBottom: 12 }}>{error}</Text>
            <AnimatedPressable
              onPress={fetchCheckIns}
              style={{ backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Try Again</Text>
            </AnimatedPressable>
          </View>
        ) : (
          <>
            {/* Latest Stats */}
            {latest && (
              <View
                style={{
                  marginHorizontal: 20,
                  backgroundColor: COLORS.surface,
                  borderRadius: 20,
                  padding: 20,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 16 }}>
                  Latest Stats
                </Text>
                <View style={{ flexDirection: 'row', gap: 16 }}>
                  <View
                    style={{
                      flex: 1,
                      backgroundColor: COLORS.primaryMuted,
                      borderRadius: 14,
                      padding: 16,
                      alignItems: 'center',
                    }}
                  >
                    <Scale size={20} color={COLORS.primary} />
                    <Text style={{ fontSize: 24, fontWeight: '800', color: COLORS.text, marginTop: 8 }}>
                      {Number(latest.weight).toFixed(1)}
                    </Text>
                    <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>kg</Text>
                  </View>
                  {latest.body_fat != null && (
                    <View
                      style={{
                        flex: 1,
                        backgroundColor: 'rgba(52,211,153,0.1)',
                        borderRadius: 14,
                        padding: 16,
                        alignItems: 'center',
                      }}
                    >
                      <TrendingUp size={20} color={COLORS.accent} />
                      <Text style={{ fontSize: 24, fontWeight: '800', color: COLORS.text, marginTop: 8 }}>
                        {Number(latest.body_fat).toFixed(1)}
                      </Text>
                      <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>% body fat</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Weight Chart */}
            {chartData.length >= 2 && (
              <View
                style={{
                  marginHorizontal: 20,
                  backgroundColor: COLORS.surface,
                  borderRadius: 20,
                  padding: 20,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 16 }}>
                  Weight Trend
                </Text>
                <SimpleLineChart data={chartData} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                  <Text style={{ fontSize: 11, color: COLORS.textTertiary }}>
                    {formatDateDisplay(checkIns[checkIns.length - 1]?.date ?? '')}
                  </Text>
                  <Text style={{ fontSize: 11, color: COLORS.textTertiary }}>
                    {formatDateDisplay(checkIns[0]?.date ?? '')}
                  </Text>
                </View>
              </View>
            )}

            {/* Check-in History */}
            <View style={{ paddingHorizontal: 20 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 }}>
                Check-in History
              </Text>
              {checkIns.length === 0 ? (
                <View
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 16,
                    padding: 32,
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                >
                  <View
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: 20,
                      backgroundColor: COLORS.primaryMuted,
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 12,
                    }}
                  >
                    <Scale size={28} color={COLORS.primary} />
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 6 }}>
                    No check-ins yet
                  </Text>
                  <Text style={{ fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 16 }}>
                    Track your weight and body composition over time
                  </Text>
                  <AnimatedPressable
                    onPress={() => router.push('/check-in-form')}
                    style={{
                      backgroundColor: COLORS.primary,
                      borderRadius: 12,
                      paddingHorizontal: 20,
                      paddingVertical: 10,
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Add first check-in</Text>
                  </AnimatedPressable>
                </View>
              ) : (
                checkIns.map(ci => (
                  <AnimatedPressable
                    key={ci.id}
                    onPress={() => {
                      console.log('[Progress] Check-in tapped:', ci.id);
                      router.push({ pathname: '/check-in-details', params: { id: ci.id, data: JSON.stringify(ci) } });
                    }}
                    style={{
                      backgroundColor: COLORS.surface,
                      borderRadius: 14,
                      padding: 16,
                      marginBottom: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                      borderWidth: 1,
                      borderColor: COLORS.border,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.text }}>
                        {formatDateDisplay(ci.date)}
                      </Text>
                      <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 2 }}>
                        {Number(ci.weight).toFixed(1)} kg
                        {ci.body_fat != null ? ` · ${Number(ci.body_fat).toFixed(1)}% body fat` : ''}
                      </Text>
                    </View>
                    <ChevronRight size={18} color={COLORS.textTertiary} />
                  </AnimatedPressable>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </>
  );
}
