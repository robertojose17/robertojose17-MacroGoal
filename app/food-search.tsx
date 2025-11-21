
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { searchProducts, OpenFoodFactsProduct, extractNutrition } from '@/utils/openFoodFacts';

export default function FoodSearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const mealType = (params.meal as string) || 'breakfast';
  const date = (params.date as string) || new Date().toISOString().split('T')[0];

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<OpenFoodFactsProduct[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [screenLoaded, setScreenLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Debounce timer ref
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Confirm screen is mounted
  useEffect(() => {
    console.log('[FoodSearch] ✓ Screen mounted on platform:', Platform.OS);
    console.log('[FoodSearch] Params:', { mealType, date });
    setScreenLoaded(true);
  }, []);

  // Live search with debounce
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // If search query is empty, clear results
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      setErrorMessage(null);
      return;
    }

    // Set new timer for debounced search
    debounceTimerRef.current = setTimeout(() => {
      performSearch(searchQuery);
    }, 400); // 400ms debounce

    // Cleanup on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      return;
    }

    console.log('[FoodSearch] ========================================');
    console.log('[FoodSearch] 🔍 STARTING SEARCH');
    console.log('[FoodSearch] Query:', query);
    console.log('[FoodSearch] Platform:', Platform.OS);
    console.log('[FoodSearch] Timestamp:', new Date().toISOString());
    console.log('[FoodSearch] ========================================');

    setSearching(true);
    setHasSearched(true);
    setErrorMessage(null);

    try {
      console.log('[FoodSearch] Calling searchProducts...');
      const startTime = Date.now();
      
      const data = await searchProducts(query);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      console.log(`[FoodSearch] Search completed in ${duration}ms`);
      
      if (data === null) {
        console.error('[FoodSearch] ❌ Search returned null (API error)');
        console.error('[FoodSearch] This indicates a network or API failure');
        setErrorMessage('Failed to connect to OpenFoodFacts. Please check your internet connection and try again.');
        setResults([]);
      } else if (data.products && data.products.length > 0) {
        console.log('[FoodSearch] ✅ SUCCESS! Found', data.products.length, 'products from OpenFoodFacts');
        console.log('[FoodSearch] First product:', data.products[0].product_name);
        
        // Filter out products with no name
        const validProducts = data.products.filter(p => p.product_name && p.product_name.trim().length > 0);
        
        console.log('[FoodSearch] Valid products after filtering:', validProducts.length);
        setResults(validProducts);
        setErrorMessage(null);
      } else {
        console.log('[FoodSearch] ⚠️ No results found for query:', query);
        console.log('[FoodSearch] Response data:', JSON.stringify(data, null, 2));
        setResults([]);
        setErrorMessage(null);
      }
    } catch (error) {
      console.error('[FoodSearch] ❌ EXCEPTION during search');
      console.error('[FoodSearch] Error type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('[FoodSearch] Error message:', error instanceof Error ? error.message : String(error));
      console.error('[FoodSearch] Error stack:', error instanceof Error ? error.stack : 'N/A');
      
      setErrorMessage('An unexpected error occurred. Please try again.');
      setResults([]);
    } finally {
      setSearching(false);
      console.log('[FoodSearch] Search process completed');
    }
  };

  const handleSelectFood = (product: OpenFoodFactsProduct) => {
    console.log('[FoodSearch] Selected product:', product.product_name);
    console.log('[FoodSearch] Navigating to food-details with product data');
    
    router.push({
      pathname: '/food-details',
      params: {
        meal: mealType,
        date: date,
        offData: JSON.stringify(product),
        source: 'search',
      },
    });
  };

  const handleRetry = () => {
    console.log('[FoodSearch] Retry button pressed');
    setErrorMessage(null);
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
      {/* Debug indicator - visible on mobile */}
      {screenLoaded && (
        <View style={styles.debugBanner}>
          <Text style={styles.debugText}>
            ✓ Food Library (OpenFoodFacts) - {Platform.OS}
          </Text>
        </View>
      )}

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
        <View style={[styles.searchBar, { backgroundColor: isDark ? colors.cardDark : colors.card, borderColor: isDark ? colors.borderDark : colors.border }]}>
          <IconSymbol
            ios_icon_name="magnifyingglass"
            android_material_icon_name="search"
            size={20}
            color={isDark ? colors.textSecondaryDark : colors.textSecondary}
          />
          <TextInput
            style={[styles.searchInput, { color: isDark ? colors.textDark : colors.text }]}
            placeholder="Type to search (e.g., egg, chicken, banana)"
            placeholderTextColor={isDark ? colors.textSecondaryDark : colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus={true}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <IconSymbol
                ios_icon_name="xmark.circle.fill"
                android_material_icon_name="cancel"
                size={20}
                color={isDark ? colors.textSecondaryDark : colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {searching && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Searching OpenFoodFacts...
            </Text>
            <Text style={[styles.loadingSubtext, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Platform: {Platform.OS}
            </Text>
            <Text style={[styles.loadingSubtext, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Query: &quot;{searchQuery}&quot;
            </Text>
          </View>
        )}

        {errorMessage && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={[styles.errorTitle, { color: isDark ? colors.textDark : colors.text }]}>
              Connection Error
            </Text>
            <Text style={[styles.errorText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              {errorMessage}
            </Text>
            <Text style={[styles.errorDebug, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Platform: {Platform.OS} • Query: &quot;{searchQuery}&quot;
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.primary }]}
              onPress={handleRetry}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {!searching && !errorMessage && hasSearched && results.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={[styles.emptyText, { color: isDark ? colors.textDark : colors.text }]}>
              No foods found
            </Text>
            <Text style={[styles.emptySubtext, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Try a different search term
            </Text>
            <Text style={[styles.emptyDebug, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Searched for: &quot;{searchQuery}&quot;
            </Text>
          </View>
        )}

        {!searching && !errorMessage && !hasSearched && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🍽️</Text>
            <Text style={[styles.emptyText, { color: isDark ? colors.textDark : colors.text }]}>
              Search for food
            </Text>
            <Text style={[styles.emptySubtext, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Start typing to see live results from OpenFoodFacts
            </Text>
            <View style={styles.examplesContainer}>
              <Text style={[styles.examplesTitle, { color: isDark ? colors.textDark : colors.text }]}>
                Try searching for:
              </Text>
              <View style={styles.exampleTags}>
                <TouchableOpacity 
                  style={[styles.exampleTag, { backgroundColor: isDark ? colors.cardDark : colors.card }]}
                  onPress={() => setSearchQuery('egg')}
                >
                  <Text style={[styles.exampleTagText, { color: colors.primary }]}>egg</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.exampleTag, { backgroundColor: isDark ? colors.cardDark : colors.card }]}
                  onPress={() => setSearchQuery('chicken')}
                >
                  <Text style={[styles.exampleTagText, { color: colors.primary }]}>chicken</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.exampleTag, { backgroundColor: isDark ? colors.cardDark : colors.card }]}
                  onPress={() => setSearchQuery('banana')}
                >
                  <Text style={[styles.exampleTagText, { color: colors.primary }]}>banana</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {!searching && !errorMessage && results.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={[styles.resultsCount, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Found {results.length} results from OpenFoodFacts
            </Text>
            {results.map((product, index) => {
              const nutrition = extractNutrition(product);
              const brandText = product.brands || '';
              
              return (
                <React.Fragment key={index}>
                  <TouchableOpacity
                    style={[styles.resultCard, { backgroundColor: isDark ? colors.cardDark : colors.card }]}
                    onPress={() => handleSelectFood(product)}
                  >
                    <View style={styles.resultContent}>
                      <View style={styles.resultHeader}>
                        <Text style={[styles.resultName, { color: isDark ? colors.textDark : colors.text }]}>
                          {product.product_name || 'Unknown Product'}
                        </Text>
                      </View>
                      
                      {brandText && (
                        <Text style={[styles.resultBrand, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                          {brandText}
                        </Text>
                      )}
                      
                      <Text style={[styles.resultNutrition, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                        Per 100g: {Math.round(nutrition.calories)} kcal • P: {Math.round(nutrition.protein)}g • C: {Math.round(nutrition.carbs)}g • F: {Math.round(nutrition.fat)}g
                      </Text>
                      
                      {product.serving_size && (
                        <Text style={[styles.resultServing, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                          Serving: {product.serving_size}
                        </Text>
                      )}
                    </View>
                    <IconSymbol
                      ios_icon_name="chevron.right"
                      android_material_icon_name="chevron_right"
                      size={24}
                      color={isDark ? colors.textSecondaryDark : colors.textSecondary}
                    />
                  </TouchableOpacity>
                </React.Fragment>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  debugBanner: {
    backgroundColor: colors.success,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  debugText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
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
    marginBottom: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  loadingSubtext: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  errorTitle: {
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: 22,
  },
  errorDebug: {
    ...typography.caption,
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontStyle: 'italic',
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyText: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    ...typography.body,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyDebug: {
    ...typography.caption,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  examplesContainer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
  examplesTitle: {
    ...typography.bodyBold,
    marginBottom: spacing.sm,
  },
  exampleTags: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  exampleTag: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  exampleTagText: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  resultsContainer: {
    gap: spacing.sm,
  },
  resultsCount: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  resultContent: {
    flex: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: spacing.sm,
  },
  resultName: {
    ...typography.bodyBold,
    fontSize: 16,
    flex: 1,
  },
  resultBrand: {
    ...typography.caption,
    marginBottom: 4,
  },
  resultNutrition: {
    ...typography.caption,
    marginBottom: 2,
  },
  resultServing: {
    ...typography.caption,
    fontStyle: 'italic',
  },
});
