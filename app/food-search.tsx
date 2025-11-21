
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { searchOpenFoodFacts, OpenFoodFactsProduct, extractServingSize, extractNutrition } from '@/utils/openFoodFacts';

interface SearchResultItem {
  product: OpenFoodFactsProduct;
  displayCalories: number;
  displayProtein: number;
  displayCarbs: number;
  displayFats: number;
  displayFiber: number;
  servingText: string;
  hasNutrition: boolean;
}

export default function FoodSearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const mealType = (params.meal as string) || 'breakfast';
  const date = (params.date as string) || new Date().toISOString().split('T')[0];

  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const searchInputRef = useRef<TextInput>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const latestSearchIdRef = useRef<number>(0);

  useEffect(() => {
    console.log('[FoodSearch] Screen mounted, meal:', mealType, 'date:', date);
    
    // Auto-focus the search input
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);

    // Cleanup on unmount
    return () => {
      console.log('[FoodSearch] Screen unmounting, cleaning up...');
      
      // Clear debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      
      // Cancel any in-flight request
      if (abortControllerRef.current) {
        console.log('[FoodSearch] Aborting in-flight request on unmount');
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Cancel previous in-flight request
    if (abortControllerRef.current) {
      console.log('[FoodSearch] Cancelling previous request due to new input');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    // If search query is empty or too short, clear results
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setResults([]);
      setErrorMessage(null);
      setHasSearched(false);
      setLoading(false);
      return;
    }

    // Debounce search (500ms for optimal mobile performance)
    console.log('[FoodSearch] Debouncing search for:', searchQuery);
    debounceTimerRef.current = setTimeout(() => {
      performSearch(searchQuery.trim());
    }, 500);
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    // Generate unique search ID to handle race conditions
    const searchId = ++latestSearchIdRef.current;
    console.log('[FoodSearch] ========== PERFORMING SEARCH ==========');
    console.log('[FoodSearch] Search ID:', searchId);
    console.log('[FoodSearch] Query:', query);
    
    setLoading(true);
    setErrorMessage(null);
    setHasSearched(true);

    // Create new AbortController for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // Call OpenFoodFacts search with cancellation support
      console.log('[FoodSearch] Calling searchOpenFoodFacts...');
      const products = await searchOpenFoodFacts(query, controller.signal);
      
      // Check if this is still the latest search (avoid race conditions)
      if (searchId !== latestSearchIdRef.current) {
        console.log('[FoodSearch] 🚫 Ignoring stale search results (ID:', searchId, 'vs latest:', latestSearchIdRef.current, ')');
        return;
      }

      // Check if request was cancelled
      if (controller.signal.aborted) {
        console.log('[FoodSearch] 🚫 Request was cancelled, ignoring results');
        return;
      }
      
      console.log('[FoodSearch] Search completed, products returned:', products.length);

      if (products.length === 0) {
        console.log('[FoodSearch] No products returned');
        setResults([]);
        setErrorMessage('No foods found. Try a different search term.');
        setLoading(false);
        return;
      }

      // Transform products into display items
      // OPTIMIZED: Only calculate essential macros for list view
      const items: SearchResultItem[] = products.map((product) => {
        const servingInfo = extractServingSize(product);
        const nutrition = extractNutrition(product);
        
        // Calculate nutrition for default serving
        const multiplier = servingInfo.grams / 100;
        const displayCalories = nutrition.calories * multiplier;
        const displayProtein = nutrition.protein * multiplier;
        const displayCarbs = nutrition.carbs * multiplier;
        const displayFats = nutrition.fat * multiplier;
        const displayFiber = nutrition.fiber * multiplier;
        
        // Check if product has nutrition data
        const hasNutrition = nutrition.calories > 0 || nutrition.protein > 0 || nutrition.carbs > 0 || nutrition.fat > 0;
        
        return {
          product,
          displayCalories,
          displayProtein,
          displayCarbs,
          displayFats,
          displayFiber,
          servingText: servingInfo.displayText,
          hasNutrition,
        };
      });

      console.log('[FoodSearch] ✅ Transformed', items.length, 'items for display');
      setResults(items);
      setLoading(false);
    } catch (error) {
      // Check if this is still the latest search
      if (searchId !== latestSearchIdRef.current) {
        console.log('[FoodSearch] 🚫 Ignoring error from stale search (ID:', searchId, ')');
        return;
      }

      // Check if it was a cancellation
      if (error instanceof Error && error.message === 'Request cancelled') {
        console.log('[FoodSearch] 🚫 Search was cancelled');
        return;
      }

      console.error('[FoodSearch] ❌ Error in performSearch:', error);
      setErrorMessage('Connection issue. Please check your internet and try again.');
      setLoading(false);
    }
  };

  const handleRetry = () => {
    console.log('[FoodSearch] Retry button pressed');
    if (searchQuery.trim() && searchQuery.trim().length >= 2) {
      performSearch(searchQuery.trim());
    }
  };

  const handleSelectProduct = (item: SearchResultItem) => {
    console.log('[FoodSearch] Product selected:', item.product.product_name);
    
    // Navigate to Food Details screen
    router.push({
      pathname: '/food-details',
      params: {
        meal: mealType,
        date: date,
        offData: JSON.stringify(item.product),
        source: 'search',
      },
    });
  };

  const renderResultItem = ({ item }: { item: SearchResultItem }) => {
    const productName = item.product.product_name || item.product.generic_name || 'Unknown Product';
    const brand = item.product.brands || '';
    
    return (
      <TouchableOpacity
        style={[styles.resultCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}
        onPress={() => handleSelectProduct(item)}
        activeOpacity={0.7}
      >
        <View style={styles.resultContent}>
          <View style={styles.resultInfo}>
            <Text style={[styles.productName, { color: isDark ? colors.textDark : colors.text }]} numberOfLines={2}>
              {productName}
            </Text>
            
            {brand && (
              <Text style={[styles.productBrand, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]} numberOfLines={1}>
                {brand}
              </Text>
            )}
            
            <Text style={[styles.productServing, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              per {item.servingText}
            </Text>
            
            {item.hasNutrition ? (
              <View style={styles.macrosRow}>
                <Text style={[styles.macroText, { color: colors.calories }]}>
                  {Math.round(item.displayCalories)} cal
                </Text>
                <Text style={[styles.macroDivider, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  •
                </Text>
                <Text style={[styles.macroText, { color: colors.protein }]}>
                  P: {item.displayProtein.toFixed(1)}g
                </Text>
                <Text style={[styles.macroDivider, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  •
                </Text>
                <Text style={[styles.macroText, { color: colors.carbs }]}>
                  C: {item.displayCarbs.toFixed(1)}g
                </Text>
                <Text style={[styles.macroDivider, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  •
                </Text>
                <Text style={[styles.macroText, { color: colors.fats }]}>
                  F: {item.displayFats.toFixed(1)}g
                </Text>
              </View>
            ) : (
              <Text style={[styles.noNutritionText, { color: colors.warning || '#FF9500' }]}>
                Nutrition not available
              </Text>
            )}
          </View>
          
          <IconSymbol
            ios_icon_name="chevron.right"
            android_material_icon_name="chevron_right"
            size={20}
            color={isDark ? colors.textSecondaryDark : colors.textSecondary}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (loading) {
      return null;
    }

    if (errorMessage) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={[styles.emptyTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Connection Issue
          </Text>
          <Text style={[styles.emptyMessage, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            {errorMessage}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={handleRetry}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (hasSearched && results.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={[styles.emptyTitle, { color: isDark ? colors.textDark : colors.text }]}>
            No foods found
          </Text>
          <Text style={[styles.emptyMessage, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Try a different search term
          </Text>
        </View>
      );
    }

    if (searchQuery.trim().length > 0 && searchQuery.trim().length < 2) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>✏️</Text>
          <Text style={[styles.emptyTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Keep typing...
          </Text>
          <Text style={[styles.emptyMessage, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Enter at least 2 characters to search
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🍎</Text>
        <Text style={[styles.emptyTitle, { color: isDark ? colors.textDark : colors.text }]}>
          Search for foods
        </Text>
        <Text style={[styles.emptyMessage, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
          Start typing to search the OpenFoodFacts database
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={24}
            color={isDark ? colors.textDark : colors.text}
          />
        </TouchableOpacity>
        <Text style={[styles.title, { color: isDark ? colors.textDark : colors.text }]}>
          Search Food Library
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchInputContainer, { backgroundColor: isDark ? colors.cardDark : colors.card, borderColor: isDark ? colors.borderDark : colors.border }]}>
          <IconSymbol
            ios_icon_name="magnifyingglass"
            android_material_icon_name="search"
            size={20}
            color={isDark ? colors.textSecondaryDark : colors.textSecondary}
          />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: isDark ? colors.textDark : colors.text }]}
            placeholder="Search foods…"
            placeholderTextColor={isDark ? colors.textSecondaryDark : colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="cancel"
                size={20}
                color={isDark ? colors.textSecondaryDark : colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Searching...
            </Text>
          </View>
        )}
      </View>

      <FlatList
        data={results}
        renderItem={renderResultItem}
        keyExtractor={(item, index) => item.product.code || `product-${index}`}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={10}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'android' ? spacing.lg : 0,
    paddingBottom: spacing.md,
  },
  backButton: {
    padding: spacing.xs,
  },
  title: {
    ...typography.h3,
    flex: 1,
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: spacing.xs,
  },
  clearButton: {
    padding: spacing.xs,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.caption,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  resultCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  resultContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  resultInfo: {
    flex: 1,
    gap: 4,
  },
  productName: {
    ...typography.bodyBold,
    fontSize: 16,
    lineHeight: 20,
  },
  productBrand: {
    ...typography.caption,
    fontSize: 13,
  },
  productServing: {
    ...typography.caption,
    fontSize: 12,
    marginTop: 2,
  },
  macrosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  macroText: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
  },
  macroDivider: {
    ...typography.caption,
    fontSize: 13,
  },
  noNutritionText: {
    ...typography.caption,
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl * 2,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h2,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptyMessage: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
