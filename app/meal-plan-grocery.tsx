
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Share, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { getGroceryList, type GroceryListResponse } from '@/utils/mealPlansApi';

export default function MealPlanGroceryScreen() {
  const router = useRouter();
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [groceryData, setGroceryData] = useState<GroceryListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Local checked state: Set of "category:itemName" keys
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const secondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardBg = isDark ? colors.cardDark : colors.card;
  const borderColor = isDark ? colors.borderDark : colors.border;

  const loadGroceryList = useCallback(async () => {
    if (!planId) return;
    console.log('[MealPlanGrocery] Loading grocery list for plan:', planId);
    try {
      const data = await getGroceryList(planId);
      console.log('[MealPlanGrocery] Grocery list loaded, categories:', data.categories?.length || 0);
      setGroceryData(data);
      setError(null);
    } catch (err: any) {
      console.error('[MealPlanGrocery] Error loading grocery list:', err);
      setError('Failed to load grocery list.');
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useFocusEffect(
    useCallback(() => {
      console.log('[MealPlanGrocery] Screen focused');
      loadGroceryList();
    }, [loadGroceryList])
  );

  const getItemKey = (category: string, itemName: string) => `${category}:${itemName}`;

  const toggleItem = (category: string, itemName: string) => {
    const key = getItemKey(category, itemName);
    console.log('[MealPlanGrocery] Toggle item:', key);
    setCheckedItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleShare = async () => {
    console.log('[MealPlanGrocery] Share button pressed');
    if (!groceryData) return;

    let text = `🛒 Grocery List: ${groceryData.plan_name}\n\n`;
    groceryData.categories.forEach(cat => {
      text += `${cat.emoji} ${cat.category}\n`;
      cat.items.forEach(item => {
        const checked = checkedItems.has(getItemKey(cat.category, item.name));
        const checkMark = checked ? '✓ ' : '• ';
        const brandText = item.brand ? ` (${item.brand})` : '';
        text += `  ${checkMark}${item.name}${brandText} — ${item.display_amount}\n`;
      });
      text += '\n';
    });

    try {
      await Share.share({ message: text, title: `Grocery List: ${groceryData.plan_name}` });
    } catch (err: any) {
      console.error('[MealPlanGrocery] Share error:', err);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Grocery List</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !groceryData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color={textColor} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: textColor }]}>Grocery List</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: textColor }]}>{error || 'No data available.'}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={loadGroceryList}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const totalItems = groceryData.categories.reduce((sum, cat) => sum + cat.items.length, 0);
  const checkedCount = checkedItems.size;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: borderColor }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => {
          console.log('[MealPlanGrocery] Back button pressed');
          router.back();
        }}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow-back" size={24} color={textColor} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: textColor }]}>Grocery List</Text>
          <Text style={[styles.headerSubtitle, { color: secondaryColor }]} numberOfLines={1}>
            {groceryData.plan_name}
          </Text>
        </View>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare} activeOpacity={0.7}>
          <IconSymbol ios_icon_name="square.and.arrow.up" android_material_icon_name="share" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      {totalItems > 0 && (
        <View style={[styles.progressBar, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
          <Text style={[styles.progressText, { color: secondaryColor }]}>
            {checkedCount} of {totalItems} items checked
          </Text>
          <View style={[styles.progressTrack, { backgroundColor: borderColor }]}>
            <View style={[styles.progressFill, { width: `${(checkedCount / totalItems) * 100}%`, backgroundColor: colors.success }]} />
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {groceryData.categories.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: cardBg }]}>
            <Text style={[styles.emptyTitle, { color: textColor }]}>No items yet</Text>
            <Text style={[styles.emptyText, { color: secondaryColor }]}>
              Add foods to your meal plan to generate a grocery list.
            </Text>
          </View>
        ) : (
          groceryData.categories.map((cat) => (
            <View key={cat.category} style={styles.categorySection}>
              <View style={styles.categoryHeader}>
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text style={[styles.categoryName, { color: textColor }]}>{cat.category}</Text>
              </View>

              <View style={[styles.categoryCard, { backgroundColor: cardBg }]}>
                {cat.items.map((item, idx) => {
                  const key = getItemKey(cat.category, item.name);
                  const isChecked = checkedItems.has(key);
                  const isLast = idx === cat.items.length - 1;

                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.groceryItem,
                        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor },
                      ]}
                      onPress={() => toggleItem(cat.category, item.name)}
                      activeOpacity={0.7}
                    >
                      {/* Checkbox */}
                      <View style={[styles.checkbox, { borderColor: isChecked ? colors.success : borderColor, backgroundColor: isChecked ? colors.success : 'transparent' }]}>
                        {isChecked && (
                          <IconSymbol ios_icon_name="checkmark" android_material_icon_name="check" size={12} color="#fff" />
                        )}
                      </View>

                      {/* Item info */}
                      <View style={styles.groceryItemInfo}>
                        <Text style={[styles.groceryItemName, { color: textColor, textDecorationLine: isChecked ? 'line-through' : 'none', opacity: isChecked ? 0.5 : 1 }]}>
                          {item.name}
                        </Text>
                        {item.brand && (
                          <Text style={[styles.groceryItemBrand, { color: secondaryColor, opacity: isChecked ? 0.5 : 1 }]}>
                            {item.brand}
                          </Text>
                        )}
                      </View>

                      {/* Amount */}
                      <Text style={[styles.groceryItemAmount, { color: secondaryColor, opacity: isChecked ? 0.5 : 1 }]}>
                        {item.display_amount}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  errorText: { ...typography.body, textAlign: 'center', marginBottom: spacing.lg },
  retryButton: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl, borderRadius: borderRadius.md },
  retryButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { padding: spacing.xs, marginRight: spacing.sm },
  headerCenter: { flex: 1 },
  headerTitle: { ...typography.h3 },
  headerSubtitle: { ...typography.caption },
  headerRight: { width: 40 },
  shareButton: { padding: spacing.xs, minWidth: 40, alignItems: 'center' },
  progressBar: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  progressText: { ...typography.caption, marginBottom: 6 },
  progressTrack: { height: 4, borderRadius: borderRadius.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: borderRadius.full },
  scrollContent: { padding: spacing.md, paddingBottom: 60 },
  emptyCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: { ...typography.h3 },
  emptyText: { ...typography.body, textAlign: 'center' },
  categorySection: { marginBottom: spacing.lg },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  categoryEmoji: { fontSize: 20 },
  categoryName: { ...typography.bodyBold },
  categoryCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  groceryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groceryItemInfo: { flex: 1 },
  groceryItemName: { ...typography.bodyBold, fontSize: 15 },
  groceryItemBrand: { ...typography.caption },
  groceryItemAmount: { ...typography.caption, fontWeight: '500' },
  bottomSpacer: { height: 40 },
});
