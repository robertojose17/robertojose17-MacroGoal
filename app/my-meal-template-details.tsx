
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, ActivityIndicator, Modal } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { MyMealTemplate } from '@/types/myMealTemplate';
import { getMyMealTemplateById, calculateMyMealSummary, deleteMyMealTemplate, addMyMealTemplateToDiary } from '@/utils/myMealTemplateDatabase';

export default function MyMealTemplateDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const templateId = params.templateId as string;
  const defaultMealType = (params.meal as string) || 'breakfast';
  const date = (params.date as string) || new Date().toISOString().split('T')[0];

  const [template, setTemplate] = useState<MyMealTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showMealTypeModal, setShowMealTypeModal] = useState(false);

  useEffect(() => {
    loadTemplate();
  }, [templateId]);

  const loadTemplate = async () => {
    try {
      setLoading(true);
      const data = await getMyMealTemplateById(templateId);
      setTemplate(data);
      console.log('[TemplateDetails] Loaded template:', data?.name);
    } catch (error) {
      console.error('[TemplateDetails] Error loading template:', error);
      Alert.alert('Error', 'Failed to load meal');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleAddToDiary = () => {
    if (!template) return;
    console.log('[TemplateDetails] Opening meal type selector');
    setShowMealTypeModal(true);
  };

  const handleMealTypeSelected = async (selectedMealType: string) => {
    if (!template) return;

    setShowMealTypeModal(false);
    setAdding(true);

    console.log('[TemplateDetails] Adding template to diary:', {
      templateId,
      mealType: selectedMealType,
      date,
      itemCount: template.items?.length || 0,
    });

    try {
      const success = await addMyMealTemplateToDiary(templateId, selectedMealType, date);
      
      if (success) {
        console.log('[TemplateDetails] Template added to diary successfully');
        Alert.alert(
          'Success',
          `"${template.name}" has been added to ${selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)}`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate back to diary
                router.dismissTo('/(tabs)/(home)/');
              },
            },
          ]
        );
      } else {
        Alert.alert('Error', 'Failed to add meal to diary. Please try again.');
      }
    } catch (error) {
      console.error('[TemplateDetails] Error adding to diary:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = () => {
    console.log('[TemplateDetails] Editing template:', templateId);
    router.push({
      pathname: '/my-meal-template-edit',
      params: {
        templateId: templateId,
      },
    });
  };

  const handleDelete = () => {
    if (!template) return;

    Alert.alert(
      'Delete Meal',
      `Are you sure you want to delete "${template.name}"? This will not affect past diary entries.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteMyMealTemplate(templateId);
            if (success) {
              console.log('[TemplateDetails] Template deleted');
              Alert.alert('Success', 'Meal deleted', [
                {
                  text: 'OK',
                  onPress: () => router.back(),
                },
              ]);
            } else {
              Alert.alert('Error', 'Failed to delete meal');
            }
          },
        },
      ]
    );
  };

  if (loading || !template) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const items = template.items || [];
  const summary = items.length > 0 ? calculateMyMealSummary(items) : null;

  const mealTypeOptions = [
    { key: 'breakfast', label: 'Breakfast', icon: 'sunrise', color: '#F59E0B' },
    { key: 'lunch', label: 'Lunch', icon: 'sun.max', color: '#10B981' },
    { key: 'dinner', label: 'Dinner', icon: 'moon', color: '#8B5CF6' },
    { key: 'snack', label: 'Snacks', icon: 'star', color: '#EC4899' },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={24}
            color={isDark ? colors.textDark : colors.text}
          />
        </TouchableOpacity>
        <Text style={[styles.title, { color: isDark ? colors.textDark : colors.text }]}>
          Meal Details
        </Text>
        <TouchableOpacity onPress={handleEdit}>
          <IconSymbol
            ios_icon_name="pencil"
            android_material_icon_name="edit"
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
          <Text style={[styles.mealName, { color: isDark ? colors.textDark : colors.text }]}>
            {template.name}
          </Text>
          {template.note && (
            <Text style={[styles.mealNote, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              {template.note}
            </Text>
          )}
        </View>

        {summary && (
          <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
            <Text style={[styles.sectionTitle, { color: isDark ? colors.textDark : colors.text }]}>
              Total Nutrition
            </Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.calories }]}>
                  {Math.round(summary.totalCalories)}
                </Text>
                <Text style={[styles.summaryLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  kcal
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.protein }]}>
                  {Math.round(summary.totalProtein)}g
                </Text>
                <Text style={[styles.summaryLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  Protein
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.carbs }]}>
                  {Math.round(summary.totalCarbs)}g
                </Text>
                <Text style={[styles.summaryLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  Carbs
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryValue, { color: colors.fats }]}>
                  {Math.round(summary.totalFat)}g
                </Text>
                <Text style={[styles.summaryLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  Fat
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? colors.textDark : colors.text }]}>
            Foods ({items.length})
          </Text>
          {items.map((item, index) => (
            <View
              key={index}
              style={[
                styles.itemCard,
                {
                  backgroundColor: isDark ? colors.backgroundDark : colors.background,
                  borderColor: isDark ? colors.borderDark : colors.border,
                },
              ]}
            >
              <View style={styles.itemInfo}>
                <Text style={[styles.itemName, { color: isDark ? colors.textDark : colors.text }]}>
                  {item.food_name}
                </Text>
                {item.brand && (
                  <Text style={[styles.itemBrand, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                    {item.brand}
                  </Text>
                )}
                <Text style={[styles.itemAmount, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  {item.amount_display}
                </Text>
              </View>
              <View style={styles.itemNutrition}>
                <Text style={[styles.itemCalories, { color: isDark ? colors.textDark : colors.text }]}>
                  {Math.round((item.per100_calories * item.amount_grams) / 100)}
                </Text>
                <Text style={[styles.itemCaloriesLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  kcal
                </Text>
                <Text style={[styles.itemMacros, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  P: {Math.round((item.per100_protein * item.amount_grams) / 100)}g • C: {Math.round((item.per100_carbs * item.amount_grams) / 100)}g • F: {Math.round((item.per100_fat * item.amount_grams) / 100)}g
                </Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.addToDiaryButton, { backgroundColor: colors.primary, opacity: adding ? 0.7 : 1 }]}
          onPress={handleAddToDiary}
          disabled={adding}
        >
          {adding ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <React.Fragment>
              <IconSymbol
                ios_icon_name="plus.circle.fill"
                android_material_icon_name="add_circle"
                size={24}
                color="#FFFFFF"
              />
              <Text style={styles.addToDiaryButtonText}>Add to Diary</Text>
            </React.Fragment>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.deleteButton, { borderColor: colors.error }]}
          onPress={handleDelete}
        >
          <IconSymbol
            ios_icon_name="trash"
            android_material_icon_name="delete"
            size={20}
            color={colors.error}
          />
          <Text style={[styles.deleteButtonText, { color: colors.error }]}>
            Delete Meal
          </Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Meal Type Selection Modal */}
      <Modal
        visible={showMealTypeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMealTypeModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMealTypeModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
            <Text style={[styles.modalTitle, { color: isDark ? colors.textDark : colors.text }]}>
              Add to which meal?
            </Text>
            <Text style={[styles.modalSubtitle, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              All {items.length} {items.length === 1 ? 'food' : 'foods'} will be added
            </Text>

            <View style={styles.mealTypeOptions}>
              {mealTypeOptions.map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.mealTypeOption,
                    { backgroundColor: isDark ? colors.backgroundDark : colors.background }
                  ]}
                  onPress={() => handleMealTypeSelected(option.key)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.mealTypeIconContainer, { backgroundColor: option.color + '20' }]}>
                    <IconSymbol
                      ios_icon_name={option.icon}
                      android_material_icon_name={option.icon === 'sunrise' ? 'wb_twilight' : option.icon === 'sun.max' ? 'wb_sunny' : option.icon === 'moon' ? 'nightlight' : 'star'}
                      size={28}
                      color={option.color}
                    />
                  </View>
                  <Text style={[styles.mealTypeLabel, { color: isDark ? colors.textDark : colors.text }]}>
                    {option.label}
                  </Text>
                  <IconSymbol
                    ios_icon_name="chevron.right"
                    android_material_icon_name="chevron_right"
                    size={20}
                    color={isDark ? colors.textSecondaryDark : colors.textSecondary}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowMealTypeModal(false)}
            >
              <Text style={[styles.modalCancelText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'android' ? spacing.lg : 0,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  mealName: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  mealNote: {
    ...typography.body,
    fontStyle: 'italic',
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    ...typography.bodyBold,
    fontSize: 20,
  },
  summaryLabel: {
    ...typography.caption,
    fontSize: 11,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  itemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    ...typography.bodyBold,
    marginBottom: 2,
  },
  itemBrand: {
    ...typography.caption,
    marginBottom: 2,
  },
  itemAmount: {
    ...typography.caption,
  },
  itemNutrition: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },
  itemCalories: {
    ...typography.bodyBold,
    fontSize: 18,
  },
  itemCaloriesLabel: {
    ...typography.caption,
    fontSize: 11,
  },
  itemMacros: {
    ...typography.caption,
    fontSize: 11,
  },
  addToDiaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  addToDiaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
    borderWidth: 2,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.15)',
    elevation: 8,
  },
  modalTitle: {
    ...typography.h2,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  mealTypeOptions: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  mealTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    gap: spacing.md,
  },
  mealTypeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealTypeLabel: {
    ...typography.bodyBold,
    fontSize: 17,
    flex: 1,
  },
  modalCancelButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalCancelText: {
    ...typography.bodyBold,
    fontSize: 16,
  },
});
