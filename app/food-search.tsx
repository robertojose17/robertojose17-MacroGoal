import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonCard } from '@/components/SkeletonLoader';
import { COLORS } from '@/constants/Colors';
import { apiGet } from '@/utils/api';
import { Food } from '@/types';
import { Search, ScanLine, Plus, ChevronRight } from 'lucide-react-native';

const SUPABASE_URL = 'https://esgptfiofoaeguslgvcq.supabase.co';
const API_BASE = `${SUPABASE_URL}/functions/v1`;

interface OFFProduct {
  product_name?: string;
  brands?: string;
  nutriments?: {
    'energy-kcal_100g'?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
  };
  serving_size?: string;
}

function parseOFFFood(p: OFFProduct): Food {
  const n = p.nutriments ?? {};
  return {
    id: `off-${Math.random().toString(36).slice(2)}`,
    name: p.product_name ?? 'Unknown',
    brand: p.brands,
    calories: Number(n['energy-kcal_100g']) || 0,
    protein: Number(n['proteins_100g']) || 0,
    carbs: Number(n['carbohydrates_100g']) || 0,
    fat: Number(n['fat_100g']) || 0,
    serving_size: 100,
    serving_unit: 'g',
    is_custom: false,
  };
}

export default function FoodSearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ meal_type?: string; date?: string }>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchFoods = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    console.log('[FoodSearch] Searching for:', q);
    setLoading(true);
    setSearched(true);
    try {
      const [customRes, offRes] = await Promise.allSettled([
        apiGet<{ foods: Food[] }>(`${API_BASE}/api/foods/search?q=${encodeURIComponent(q)}`),
        fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&json=1&page_size=20`)
          .then(r => r.ok ? r.json() : { products: [] }),
      ]);

      const customFoods: Food[] = customRes.status === 'fulfilled' ? (customRes.value.foods ?? []) : [];
      const offFoods: Food[] = offRes.status === 'fulfilled'
        ? (offRes.value.products ?? []).slice(0, 15).map(parseOFFFood).filter((f: Food) => f.name && f.name !== 'Unknown')
        : [];

      setResults([...customFoods, ...offFoods]);
    } catch (err) {
      console.error('[FoodSearch] Search error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchFoods(query);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, searchFoods]);

  const handleFoodPress = (food: Food) => {
    console.log('[FoodSearch] Food selected:', food.name);
    router.push({
      pathname: '/food-details',
      params: {
        food: JSON.stringify(food),
        meal_type: params.meal_type ?? 'breakfast',
        date: params.date ?? new Date().toISOString().split('T')[0],
      },
    });
  };

  const renderItem = ({ item }: { item: Food }) => {
    const cals = Math.round(Number(item.calories) || 0);
    const isCustom = item.is_custom;
    return (
      <AnimatedPressable
        onPress={() => handleFoodPress(item)}
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.text }} numberOfLines={1}>
              {item.name}
            </Text>
            {isCustom && (
              <View style={{ backgroundColor: COLORS.primaryMuted, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ fontSize: 10, fontWeight: '600', color: COLORS.primary }}>Custom</Text>
              </View>
            )}
          </View>
          {item.brand ? (
            <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }} numberOfLines={1}>
              {item.brand}
            </Text>
          ) : null}
          <Text style={{ fontSize: 12, color: COLORS.textTertiary, marginTop: 2 }}>
            per {item.serving_size}{item.serving_unit} · P:{Math.round(item.protein)}g C:{Math.round(item.carbs)}g F:{Math.round(item.fat)}g
          </Text>
        </View>
        <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text, marginRight: 8 }}>{cals}</Text>
        <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginRight: 8 }}>kcal</Text>
        <ChevronRight size={16} color={COLORS.textTertiary} />
      </AnimatedPressable>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Search Foods',
          headerRight: () => (
            <AnimatedPressable
              onPress={() => {
                console.log('[FoodSearch] Barcode scanner pressed');
                router.push({ pathname: '/barcode-scanner', params: { meal_type: params.meal_type, date: params.date } });
              }}
              style={{ padding: 8 }}
            >
              <ScanLine size={22} color={COLORS.primary} />
            </AnimatedPressable>
          ),
        }}
      />
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        {/* Search Bar */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 8,
            backgroundColor: COLORS.background,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: COLORS.surface,
              borderRadius: 12,
              paddingHorizontal: 12,
              paddingVertical: 10,
              gap: 8,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Search size={18} color={COLORS.textTertiary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search foods..."
              placeholderTextColor={COLORS.textTertiary}
              autoFocus
              style={{ flex: 1, fontSize: 16, color: COLORS.text }}
              returnKeyType="search"
              onSubmitEditing={() => searchFoods(query)}
            />
            {loading && <ActivityIndicator size="small" color={COLORS.primary} />}
          </View>
        </View>

        {/* Create Custom Food */}
        <AnimatedPressable
          onPress={() => {
            console.log('[FoodSearch] Create custom food pressed');
            router.push('/my-foods-create');
          }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 16,
            paddingVertical: 12,
            backgroundColor: COLORS.surface,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.divider,
          }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: COLORS.primaryMuted,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Plus size={18} color={COLORS.primary} />
          </View>
          <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.primary }}>Create custom food</Text>
        </AnimatedPressable>

        {/* Results */}
        {loading && !searched ? (
          <View style={{ padding: 16 }}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : !searched ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 }}>
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
              <Search size={32} color={COLORS.primary} />
            </View>
            <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 8 }}>
              Search for foods
            </Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', maxWidth: 260 }}>
              Search our database of millions of foods or create your own custom foods
            </Text>
          </View>
        ) : results.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.text, marginBottom: 8 }}>
              No results found
            </Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', maxWidth: 260, marginBottom: 20 }}>
              Try a different search term or create a custom food
            </Text>
            <AnimatedPressable
              onPress={() => router.push('/my-foods-create')}
              style={{
                backgroundColor: COLORS.primary,
                borderRadius: 12,
                paddingHorizontal: 20,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Create custom food</Text>
            </AnimatedPressable>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item, idx) => `${item.id}-${idx}`}
            renderItem={renderItem}
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={{ paddingBottom: 100 }}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    </>
  );
}
