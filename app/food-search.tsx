
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList, ActivityIndicator, Platform, Image } from 'react-native';
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

  useEffect(() => {
    console.log('[FoodSearch] Screen mounted, meal:', mealType, 'date:', date);
    
    // Auto-focus the search input
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);

    // Cleanup debounce timer on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // If search query is empty, clear results
    if (!searchQuery.trim()) {
      setResults([]);
      setErrorMessage(null);
      setHasSearched(false);
      return;
    }

    // Debounce search (500ms)
    debounceTimerRef.current = setTimeout(() => {
      performSearch(searchQuery.trim());
    }, 500);
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    console.log('[FoodSearch] Performing search for:', query);
    
    setLoading(true);
    setErrorMessage(null);
    setHasSearched(true);

    try {
      const products = await searchOpenFoodFacts(query);
      
      console.log('[FoodSearch] Search returned', products.length, 'products');

      // Transform products into display items
      const items: SearchResultItem[] = products.map((product) => {
        const servingInfo = extractServingSize(product);
        const nutrition = extractNutrition(product);
        
        // Calculate nutrition for default serving
        const multiplier = servingInfo.grams / 100;
        const displayCalories = nutrition.calories * multiplier;
        const displayProtein = nutrition.protein * multiplier;
        const displayCarbs = nutrition.carbs * multiplier;
        const displayFats = nutrition.fat * multiplier;
        
        // Check if product has nutrition data
        const hasNutrition = nutrition.calories > 0 || nutrition.protein > 0 || nutrition.carbs > 0 || nutrition.fat > 0;
        
        return {
          product,
          displayCalories,
          displayProtein,
          displayCarbs,
          displayFats,
          servingText: servingInfo.displayText,
          hasNutrition,
        };
      });

      setResults(items);
      setLoading(false);
    } catch (error) {
      console.error('[FoodSearch] Search error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Unable to connect to OpenFoodFacts. Try again.');
      setResults([]);
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (searchQuery.trim()) {
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
          {item.product.image_front_small_url && (
            <Image
              source={{ uri: item.product.image_front_small_url }}
              style={styles.productImage}
              resizeMode="cover"
            />
          )}
          
          <View style={styles.resultInfo}>
            <Text style={[styles.productName, { color: isDark ? colors.textDark : colors.text }]} numberOfLines={2}>
              {productName}
            </Text>
            
            {brand && (
              <Text style={[styles.productBrand, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]} numberOfLines={1}>
                {brand}
              </Text>
            )}
            
            {item.hasNutrition ? (
              <>
                <Text style={[styles.productCalories, { color: colors.calories }]}>
                  {Math.round(item.displayCalories)} kcal
                </Text>
                
                <Text style={[styles.productServing, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  per {item.servingText}
                </Text>
              </>
            ) : (
              <Text style={[styles.noNutritionText, { color: colors.warning || '#FF9500' }]}>
                Nutrition not available
              </Text>
            )}
          </View>
          
          <IconSymbol
            ios_icon_name="chevron.right"
            android_material_icon_name="chevron_right"
            size={24}
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
            Connection Error
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
  productImage: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  resultInfo: {
    flex: 1,
    gap: 2,
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
  productCalories: {
    ...typography.bodyBold,
    fontSize: 15,
    marginTop: 2,
  },
  productServing: {
    ...typography.caption,
    fontSize: 12,
  },
  noNutritionText: {
    ...typography.caption,
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 2,
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
