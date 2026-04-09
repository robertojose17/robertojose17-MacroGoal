import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Alert,
  LayoutAnimation,
  RefreshControl,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonCard } from '@/components/SkeletonLoader';
import { COLORS } from '@/constants/Colors';
import { apiGet, apiDelete } from '@/utils/api';
import { Food } from '@/types';
import { Plus, Trash2, ChevronRight, UtensilsCrossed } from 'lucide-react-native';

const SUPABASE_URL = 'https://esgptfiofoaeguslgvcq.supabase.co';
const API_BASE = `${SUPABASE_URL}/functions/v1`;

export default function MyFoodsScreen() {
  const router = useRouter();
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchFoods = useCallback(async () => {
    console.log('[MyFoods] Fetching custom foods');
    try {
      const data = await apiGet<{ foods: Food[] }>(`${API_BASE}/api/my-foods`);
      setFoods(data.foods ?? []);
      setError('');
    } catch (err) {
      console.error('[MyFoods] Fetch error:', err);
      setError('Failed to load foods');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFoods();
  }, [fetchFoods]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFoods();
  };

  const handleDelete = (food: Food) => {
    console.log('[MyFoods] Delete pressed:', food.name);
    Alert.alert('Delete Food', `Delete "${food.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setFoods(prev => prev.filter(f => f.id !== food.id));
            await apiDelete(`${API_BASE}/api/my-foods/${food.id}`);
          } catch (err) {
            console.error('[MyFoods] Delete error:', err);
            fetchFoods();
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Food }) => (
    <AnimatedPressable
      onPress={() => {
        console.log('[MyFoods] Food tapped:', item.name);
        router.push({ pathname: '/my-foods-edit', params: { food: JSON.stringify(item) } });
      }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.text }} numberOfLines={1}>
          {item.name}
        </Text>
        {item.brand ? (
          <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>{item.brand}</Text>
        ) : null}
        <Text style={{ fontSize: 12, color: COLORS.textTertiary, marginTop: 2 }}>
          {item.serving_size}{item.serving_unit} · P:{Math.round(item.protein)}g C:{Math.round(item.carbs)}g F:{Math.round(item.fat)}g
        </Text>
      </View>
      <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text, marginRight: 4 }}>
        {Math.round(Number(item.calories))}
      </Text>
      <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginRight: 12 }}>kcal</Text>
      <AnimatedPressable onPress={() => handleDelete(item)} style={{ padding: 8 }}>
        <Trash2 size={18} color={COLORS.danger} />
      </AnimatedPressable>
    </AnimatedPressable>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'My Foods',
          headerRight: () => (
            <AnimatedPressable
              onPress={() => {
                console.log('[MyFoods] Create food pressed');
                router.push('/my-foods-create');
              }}
              style={{ padding: 8 }}
            >
              <Plus size={22} color={COLORS.primary} />
            </AnimatedPressable>
          ),
        }}
      />
      {loading ? (
        <View style={{ flex: 1, backgroundColor: COLORS.background, padding: 16 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : error ? (
        <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: COLORS.danger, marginBottom: 12 }}>{error}</Text>
          <AnimatedPressable
            onPress={fetchFoods}
            style={{ backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Try Again</Text>
          </AnimatedPressable>
        </View>
      ) : foods.length === 0 ? (
        <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              backgroundColor: COLORS.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <UtensilsCrossed size={32} color={COLORS.primary} />
          </View>
          <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 8 }}>No custom foods yet</Text>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24, maxWidth: 260 }}>
            Create custom foods with your own nutritional data
          </Text>
          <AnimatedPressable
            onPress={() => router.push('/my-foods-create')}
            style={{ backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Create first food</Text>
          </AnimatedPressable>
        </View>
      ) : (
        <FlatList
          data={foods}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ paddingBottom: 40 }}
          style={{ backgroundColor: COLORS.background }}
        />
      )}
    </>
  );
}
