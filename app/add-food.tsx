
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { getRecentFoods, getFavoriteFoods } from '@/utils/foodDatabase';
import { Food } from '@/types';

type TabType = 'all' | 'my-meals' | 'favorites' | 'quick-add';

export default function AddFoodScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const mealType = (params.meal as string) || 'breakfast';
  const date = (params.date as string) || new Date().toISOString().split('T')[0];
  
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [recentFoods, setRecentFoods] = useState<Food[]>([]);
  const [favoriteFoods, setFavoriteFoods] = useState<Food[]>([]);

  const mealLabels: Record<string, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snacks',
  };

  useEffect(() => {
    console.log('[AddFood] Screen mounted on platform:', Platform.OS);
    console.log('[AddFood] Params:', { mealType, date });
    loadFoods();
  }, []);

  const loadFoods = async () => {
    try {
      const recent = await getRecentFoods();
      const favorites = await getFavoriteFoods();
      setRecentFoods(recent);
      setFavoriteFoods(favorites);
      console.log('[AddFood] Loaded foods:', { recent: recent.length, favorites: favorites.length });
    } catch (error) {
      console.error('[AddFood] Error loading foods:', error);
    }
  };

  const handleSearchPress = () => {
    console.log('[AddFood] Opening Food Library search');
    router.push(`/food-search?meal=${mealType}&date=${date}`);
  };

  const handleBarcodeScan = () => {
    console.log('[AddFood] Navigating to barcode-scan');
    router.push(`/barcode-scan?meal=${mealType}&date=${date}`);
  };

  const handleCopyFromPrevious = () => {
    console.log('[AddFood] Copy from previous - not yet implemented');
    // TODO: Implement copy from previous functionality
  };

  const handleQuickAdd = () => {
    console.log('[AddFood] Navigating to quick-add');
    router.push(`/quick-add?meal=${mealType}&date=${date}`);
  };

  const handleAddFood = (food: Food) => {
    console.log('[AddFood] Adding food:', food.name);
    router.push(`/food-details?foodId=${food.id}&meal=${mealType}&date=${date}`);
  };

  const renderFoodItem = (food: Food, index: number) => {
    const servingText = `${food.serving_amount}${food.serving_unit}`;
    const macrosText = `P: ${Math.round(food.protein)}g • C: ${Math.round(food.carbs)}g • F: ${Math.round(food.fats)}g`;
    
    return (
      <View 
        key={index}
        style={[
          styles.foodCard,
          { backgroundColor: isDark ? colors.cardDark : '#FFFFFF' }
        ]}
      >
        <View style={styles.foodInfo}>
          <Text style={[styles.foodName, { color: isDark ? colors.textDark : colors.text }]}>
            {food.name}
          </Text>
          <Text style={[styles.foodServing, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            {food.brand ? `${food.brand} • ` : ''}{servingText} • {Math.round(food.calories)} cal
          </Text>
          <Text style={[styles.foodMacros, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            {macrosText}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => handleAddFood(food)}
          activeOpacity={0.7}
        >
          <IconSymbol
            ios_icon_name="plus"
            android_material_icon_name="add"
            size={20}
            color="#FFFFFF"
          />
        </TouchableOpacity>
      </View>
    );
  };

  const getDisplayFoods = () => {
    switch (activeTab) {
      case 'favorites':
        return favoriteFoods;
      case 'my-meals':
        return []; // TODO: Implement my meals
      case 'quick-add':
        return [];
      case 'all':
      default:
        return recentFoods;
    }
  };

  const displayFoods = getDisplayFoods();

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : '#F5F5F5' }]} 
      edges={['top']}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: isDark ? colors.backgroundDark : '#F5F5F5' }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={24}
            color={isDark ? colors.textDark : colors.text}
          />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? colors.textDark : colors.text }]}>
          Add to {mealLabels[mealType]}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Sticky Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: isDark ? colors.backgroundDark : '#F5F5F5' }]}>
        <TouchableOpacity 
          style={[
            styles.searchBar,
            { 
              backgroundColor: isDark ? colors.cardDark : '#FFFFFF',
              borderColor: isDark ? colors.borderDark : colors.border,
            }
          ]}
          onPress={handleSearchPress}
          activeOpacity={0.7}
        >
          <IconSymbol
            ios_icon_name="magnifyingglass"
            android_material_icon_name="search"
            size={20}
            color={isDark ? colors.textSecondaryDark : colors.textSecondary}
          />
          <Text style={[styles.searchPlaceholder, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            Search food...
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Row */}
      <View style={[styles.tabContainer, { backgroundColor: isDark ? colors.backgroundDark : '#F5F5F5' }]}>
        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('all')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'all' && styles.tabTextActive,
            { color: activeTab === 'all' ? (isDark ? colors.textDark : colors.text) : (isDark ? colors.textSecondaryDark : colors.textSecondary) }
          ]}>
            All
          </Text>
          {activeTab === 'all' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('my-meals')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'my-meals' && styles.tabTextActive,
            { color: activeTab === 'my-meals' ? (isDark ? colors.textDark : colors.text) : (isDark ? colors.textSecondaryDark : colors.textSecondary) }
          ]}>
            My Meals
          </Text>
          {activeTab === 'my-meals' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('favorites')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'favorites' && styles.tabTextActive,
            { color: activeTab === 'favorites' ? (isDark ? colors.textDark : colors.text) : (isDark ? colors.textSecondaryDark : colors.textSecondary) }
          ]}>
            Favorites
          </Text>
          {activeTab === 'favorites' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tab}
          onPress={() => setActiveTab('quick-add')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'quick-add' && styles.tabTextActive,
            { color: activeTab === 'quick-add' ? (isDark ? colors.textDark : colors.text) : (isDark ? colors.textSecondaryDark : colors.textSecondary) }
          ]}>
            Quick Add
          </Text>
          {activeTab === 'quick-add' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Actions - Only show on "All" tab */}
        {activeTab === 'all' && (
          <React.Fragment>
            <Text style={[styles.sectionLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Quick Actions
            </Text>
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={[styles.quickActionCard, styles.quickActionCardLeft]}
                onPress={handleBarcodeScan}
                activeOpacity={0.7}
              >
                <View style={styles.quickActionIconContainer}>
                  <IconSymbol
                    ios_icon_name="barcode.viewfinder"
                    android_material_icon_name="qr_code_scanner"
                    size={32}
                    color="#8B5CF6"
                  />
                </View>
                <Text style={[styles.quickActionTitle, { color: isDark ? colors.textDark : colors.text }]}>
                  Barcode Scan
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActionCard, styles.quickActionCardRight]}
                onPress={handleCopyFromPrevious}
                activeOpacity={0.7}
              >
                <View style={styles.quickActionIconContainer}>
                  <IconSymbol
                    ios_icon_name="calendar"
                    android_material_icon_name="event"
                    size={32}
                    color="#10B981"
                  />
                </View>
                <Text style={[styles.quickActionTitle, { color: isDark ? colors.textDark : colors.text }]}>
                  Copy from Previous
                </Text>
              </TouchableOpacity>
            </View>
          </React.Fragment>
        )}

        {/* Recent Foods / Favorites / My Meals */}
        {activeTab === 'all' && (
          <React.Fragment>
            <Text style={[styles.sectionLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Recent Foods
            </Text>
            {displayFoods.length > 0 ? (
              displayFoods.map((food, index) => renderFoodItem(food, index))
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  No recent foods yet
                </Text>
              </View>
            )}
          </React.Fragment>
        )}

        {activeTab === 'favorites' && (
          <React.Fragment>
            <Text style={[styles.sectionLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Favorite Foods
            </Text>
            {displayFoods.length > 0 ? (
              displayFoods.map((food, index) => renderFoodItem(food, index))
            ) : (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  No favorite foods yet
                </Text>
              </View>
            )}
          </React.Fragment>
        )}

        {activeTab === 'my-meals' && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              My Meals feature coming soon
            </Text>
          </View>
        )}

        {activeTab === 'quick-add' && (
          <View style={styles.quickAddContainer}>
            <Text style={[styles.sectionLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Quick Add Calories
            </Text>
            <TouchableOpacity
              style={[styles.quickAddButton, { backgroundColor: colors.primary }]}
              onPress={handleQuickAdd}
              activeOpacity={0.7}
            >
              <IconSymbol
                ios_icon_name="pencil"
                android_material_icon_name="edit"
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.quickAddButtonText}>
                Manually Enter Calories & Macros
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom padding to avoid tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
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
    paddingBottom: spacing.sm,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
    fontSize: 18,
    flex: 1,
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    gap: spacing.sm,
  },
  searchPlaceholder: {
    ...typography.body,
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '30',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    position: 'relative',
  },
  tabText: {
    ...typography.body,
    fontSize: 14,
  },
  tabTextActive: {
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    right: '25%',
    height: 2,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  sectionLabel: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  quickActionCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg + spacing.md,
    borderRadius: borderRadius.lg,
    boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.06)',
    elevation: 1,
  },
  quickActionCardLeft: {
    backgroundColor: '#F3E8FF',
  },
  quickActionCardRight: {
    backgroundColor: '#D1FAE5',
  },
  quickActionIconContainer: {
    marginBottom: spacing.sm,
  },
  quickActionTitle: {
    ...typography.bodyBold,
    fontSize: 15,
  },
  foodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.08)',
    elevation: 1,
  },
  foodInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  foodName: {
    ...typography.bodyBold,
    fontSize: 16,
    marginBottom: 2,
  },
  foodServing: {
    ...typography.caption,
    fontSize: 13,
    marginBottom: 2,
  },
  foodMacros: {
    ...typography.caption,
    fontSize: 12,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: '#0EA5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    ...typography.body,
    fontSize: 15,
  },
  quickAddContainer: {
    paddingTop: spacing.md,
  },
  quickAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  quickAddButtonText: {
    ...typography.bodyBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
});
