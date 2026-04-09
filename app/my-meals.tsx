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
import { Meal } from '@/types';
import { Plus, Trash2, ChevronRight, ChefHat } from 'lucide-react-native';

const SUPABASE_URL = 'https://esgptfiofoaeguslgvcq.supabase.co';
const API_BASE = `${SUPABASE_URL}/functions/v1`;

export default function MyMealsScreen() {
  const router = useRouter();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchMeals = useCallback(async () => {
    console.log('[MyMeals] Fetching meals');
    try {
      const data = await apiGet<{ meals: Meal[] }>(`${API_BASE}/api/my-meals`);
      setMeals(data.meals ?? []);
      setError('');
    } catch (err) {
      console.error('[MyMeals] Fetch error:', err);
      setError('Failed to load meals');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMeals();
  };

  const handleDelete = (meal: Meal) => {
    console.log('[MyMeals] Delete pressed:', meal.name);
    Alert.alert('Delete Meal', `Delete "${meal.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setMeals(prev => prev.filter(m => m.id !== meal.id));
            await apiDelete(`${API_BASE}/api/my-meals/${meal.id}`);
          } catch (err) {
            console.error('[MyMeals] Delete error:', err);
            fetchMeals();
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Meal }) => {
    const totalCals = (item.items ?? []).reduce((s, i) => s + (Number(i.calories) || 0), 0);
    const itemCount = (item.items ?? []).length;
    return (
      <AnimatedPressable
        onPress={() => {
          console.log('[MyMeals] Meal tapped:', item.name);
          router.push({ pathname: '/my-meals-details', params: { id: item.id, meal: JSON.stringify(item) } });
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
          <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
            {itemCount} item{itemCount !== 1 ? 's' : ''} · {Math.round(totalCals)} kcal
          </Text>
        </View>
        <AnimatedPressable onPress={() => handleDelete(item)} style={{ padding: 8, marginRight: 4 }}>
          <Trash2 size={18} color={COLORS.danger} />
        </AnimatedPressable>
        <ChevronRight size={18} color={COLORS.textTertiary} />
      </AnimatedPressable>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'My Meals',
          headerRight: () => (
            <AnimatedPressable
              onPress={() => {
                console.log('[MyMeals] Create meal pressed');
                router.push('/my-meals-create');
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
        </View>
      ) : error ? (
        <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: COLORS.danger, marginBottom: 12 }}>{error}</Text>
          <AnimatedPressable
            onPress={fetchMeals}
            style={{ backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Try Again</Text>
          </AnimatedPressable>
        </View>
      ) : meals.length === 0 ? (
        <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 22,
              backgroundColor: 'rgba(52,211,153,0.1)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            <ChefHat size={32} color={COLORS.accent} />
          </View>
          <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 8 }}>No saved meals yet</Text>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24, maxWidth: 260 }}>
            Save your favorite meal combinations for quick logging
          </Text>
          <AnimatedPressable
            onPress={() => router.push('/my-meals-create')}
            style={{ backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Create first meal</Text>
          </AnimatedPressable>
        </View>
      ) : (
        <FlatList
          data={meals}
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
