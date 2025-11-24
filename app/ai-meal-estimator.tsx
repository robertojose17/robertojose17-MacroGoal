
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform, Alert, ActivityIndicator, Image, KeyboardAvoidingView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/app/integrations/supabase/client';

interface EstimatedMeal {
  name: string;
  servings: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  notes?: string;
}

export default function AIMealEstimatorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const mode = (params.mode as string) || 'diary';
  const mealType = (params.meal as string) || 'breakfast';
  const date = (params.date as string) || new Date().toISOString().split('T')[0];
  const returnTo = (params.returnTo as string) || undefined;
  const myMealId = (params.mealId as string) || undefined;

  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [estimatedMeal, setEstimatedMeal] = useState<EstimatedMeal | null>(null);
  const [servings, setServings] = useState(1);
  const [editableCalories, setEditableCalories] = useState('');
  const [editableProtein, setEditableProtein] = useState('');
  const [editableCarbs, setEditableCarbs] = useState('');
  const [editableFat, setEditableFat] = useState('');
  const [editableFiber, setEditableFiber] = useState('');

  const handleTakePhoto = async () => {
    console.log('[AIMealEstimator] Taking photo...');
    
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      console.log('[AIMealEstimator] Photo taken:', result.assets[0].uri);
      setImageUri(result.assets[0].uri);
    }
  };

  const handleChoosePhoto = async () => {
    console.log('[AIMealEstimator] Choosing photo...');
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library permission is required to choose photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      console.log('[AIMealEstimator] Photo chosen:', result.assets[0].uri);
      setImageUri(result.assets[0].uri);
    }
  };

  const handleRemoveImage = () => {
    console.log('[AIMealEstimator] Removing image');
    setImageUri(null);
  };

  const handleEstimate = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please enter a meal description');
      return;
    }

    setLoading(true);
    console.log('[AIMealEstimator] Starting estimation...');
    console.log('[AIMealEstimator] Description:', description);
    console.log('[AIMealEstimator] Has image:', !!imageUri);

    try {
      const formData = new FormData();
      formData.append('description', description.trim());

      if (imageUri) {
        const filename = imageUri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('image', {
          uri: imageUri,
          name: filename,
          type: type,
        } as any);
      }

      const edgeFunctionUrl = 'https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/ai-meal-estimate';
      console.log('[AIMealEstimator] Calling Edge Function:', edgeFunctionUrl);

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: formData,
      });

      console.log('[AIMealEstimator] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AIMealEstimator] Error response:', errorText);
        
        try {
          const errorJson = JSON.parse(errorText);
          Alert.alert('AI Estimate Failed', errorJson.error || 'AI estimate failed — check connection and try again.');
        } catch {
          Alert.alert('AI Estimate Failed', 'AI estimate failed — check connection and try again.');
        }
        setLoading(false);
        return;
      }

      const result = await response.json();
      console.log('[AIMealEstimator] Success! Result:', result);
      
      // Check if result contains a warning in notes
      if (result.notes && result.notes.includes('⚠️')) {
        Alert.alert(
          'AI Estimate',
          result.notes,
          [{ text: 'OK', onPress: () => {} }]
        );
      }

      setEstimatedMeal(result);
      setServings(result.servings || 1);
      setEditableCalories(result.calories.toString());
      setEditableProtein(result.protein_g.toString());
      setEditableCarbs(result.carbs_g.toString());
      setEditableFat(result.fat_g.toString());
      setEditableFiber(result.fiber_g.toString());
    } catch (error) {
      console.error('[AIMealEstimator] Error:', error);
      Alert.alert('AI Estimate Failed', 'AI estimate failed — check connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogToDiary = async () => {
    if (!estimatedMeal) return;

    console.log('[AIMealEstimator] Logging to diary...');
    console.log('[AIMealEstimator] Mode:', mode);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to add food');
        return;
      }

      const finalCalories = parseFloat(editableCalories) || 0;
      const finalProtein = parseFloat(editableProtein) || 0;
      const finalCarbs = parseFloat(editableCarbs) || 0;
      const finalFat = parseFloat(editableFat) || 0;
      const finalFiber = parseFloat(editableFiber) || 0;

      // Create food entry
      const { data: foodData, error: foodError } = await supabase
        .from('foods')
        .insert({
          name: estimatedMeal.name,
          serving_amount: 1,
          serving_unit: 'serving',
          calories: finalCalories,
          protein: finalProtein,
          carbs: finalCarbs,
          fats: finalFat,
          fiber: finalFiber,
          user_created: true,
          created_by: user.id,
        })
        .select()
        .single();

      if (foodError) {
        console.error('[AIMealEstimator] Error creating food:', foodError);
        Alert.alert('Error', 'Failed to create food entry');
        return;
      }

      console.log('[AIMealEstimator] Food created:', foodData.id);

      // Check mode: If mymeal, return to builder
      if (mode === 'mymeal') {
        console.log('[AIMealEstimator] Mode is mymeal, returning to builder');

        const newFoodItem = {
          food_id: foodData.id,
          food: foodData,
          quantity: servings,
          calories: finalCalories * servings,
          protein: finalProtein * servings,
          carbs: finalCarbs * servings,
          fats: finalFat * servings,
          fiber: finalFiber * servings,
          serving_description: `${servings} serving${servings !== 1 ? 's' : ''}`,
          grams: null,
        };

        router.dismissTo({
          pathname: returnTo || '/my-meal-builder',
          params: {
            mealId: myMealId || '',
            newFoodItem: JSON.stringify(newFoodItem),
          },
        });

        return;
      }

      // Normal diary mode: Log to diary
      const { data: existingMeal } = await supabase
        .from('meals')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', date)
        .eq('meal_type', mealType)
        .maybeSingle();

      let mealId = existingMeal?.id;

      if (!mealId) {
        console.log('[AIMealEstimator] Creating new meal');
        const { data: newMeal, error: mealError } = await supabase
          .from('meals')
          .insert({
            user_id: user.id,
            date: date,
            meal_type: mealType,
          })
          .select()
          .single();

        if (mealError) {
          console.error('[AIMealEstimator] Error creating meal:', mealError);
          Alert.alert('Error', 'Failed to create meal');
          return;
        }

        mealId = newMeal.id;
      }

      // Add meal item
      const { error: mealItemError } = await supabase
        .from('meal_items')
        .insert({
          meal_id: mealId,
          food_id: foodData.id,
          quantity: servings,
          calories: finalCalories * servings,
          protein: finalProtein * servings,
          carbs: finalCarbs * servings,
          fats: finalFat * servings,
          fiber: finalFiber * servings,
          serving_description: `${servings} serving${servings !== 1 ? 's' : ''}`,
          grams: null,
        });

      if (mealItemError) {
        console.error('[AIMealEstimator] Error adding meal item:', mealItemError);
        Alert.alert('Error', 'Failed to add food to meal');
        return;
      }

      console.log('[AIMealEstimator] Success! Navigating back to diary');
      router.dismissTo('/(tabs)/(home)/');
    } catch (error) {
      console.error('[AIMealEstimator] Error logging to diary:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    }
  };

  const handleBack = () => {
    if (estimatedMeal) {
      Alert.alert(
        'Discard Estimate?',
        'Are you sure you want to go back? Your estimate will be lost.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  const incrementServings = () => {
    setServings(prev => prev + 1);
  };

  const decrementServings = () => {
    if (servings > 1) {
      setServings(prev => prev - 1);
    }
  };

  if (estimatedMeal) {
    const displayCalories = parseFloat(editableCalories) || 0;
    const displayProtein = parseFloat(editableProtein) || 0;
    const displayCarbs = parseFloat(editableCarbs) || 0;
    const displayFat = parseFloat(editableFat) || 0;
    const displayFiber = parseFloat(editableFiber) || 0;

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack}>
              <IconSymbol
                ios_icon_name="chevron.left"
                android_material_icon_name="arrow_back"
                size={24}
                color={isDark ? colors.textDark : colors.text}
              />
            </TouchableOpacity>
            <Text style={[styles.title, { color: isDark ? colors.textDark : colors.text }]}>
              Review Estimate
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
              <View style={styles.aiBadgeContainer}>
                <IconSymbol
                  ios_icon_name="sparkles"
                  android_material_icon_name="auto_awesome"
                  size={16}
                  color={colors.primary}
                />
                <Text style={[styles.aiBadge, { color: colors.primary }]}>
                  AI Estimated
                </Text>
              </View>

              <Text style={[styles.mealName, { color: isDark ? colors.textDark : colors.text }]}>
                {estimatedMeal.name}
              </Text>

              {estimatedMeal.notes && (
                <Text style={[styles.notes, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  {estimatedMeal.notes}
                </Text>
              )}

              <View style={styles.servingsControl}>
                <Text style={[styles.label, { color: isDark ? colors.textDark : colors.text }]}>
                  Servings:
                </Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={[styles.stepperButton, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}
                    onPress={decrementServings}
                    disabled={servings <= 1}
                  >
                    <IconSymbol
                      ios_icon_name="minus"
                      android_material_icon_name="remove"
                      size={20}
                      color={servings <= 1 ? (isDark ? colors.textSecondaryDark : colors.textSecondary) : (isDark ? colors.textDark : colors.text)}
                    />
                  </TouchableOpacity>
                  <Text style={[styles.servingsValue, { color: isDark ? colors.textDark : colors.text }]}>
                    {servings}
                  </Text>
                  <TouchableOpacity
                    style={[styles.stepperButton, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}
                    onPress={incrementServings}
                  >
                    <IconSymbol
                      ios_icon_name="plus"
                      android_material_icon_name="add"
                      size={20}
                      color={isDark ? colors.textDark : colors.text}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
              <Text style={[styles.sectionTitle, { color: isDark ? colors.textDark : colors.text }]}>
                Nutrition (per serving)
              </Text>
              <Text style={[styles.sectionSubtitle, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                Tap to edit values
              </Text>

              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  Calories
                </Text>
                <TextInput
                  style={[styles.nutritionInput, { color: colors.calories, borderColor: isDark ? colors.borderDark : colors.border }]}
                  value={editableCalories}
                  onChangeText={setEditableCalories}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={isDark ? colors.textSecondaryDark : colors.textSecondary}
                />
                <Text style={[styles.nutritionUnit, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  kcal
                </Text>
              </View>

              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  Protein
                </Text>
                <TextInput
                  style={[styles.nutritionInput, { color: colors.protein, borderColor: isDark ? colors.borderDark : colors.border }]}
                  value={editableProtein}
                  onChangeText={setEditableProtein}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={isDark ? colors.textSecondaryDark : colors.textSecondary}
                />
                <Text style={[styles.nutritionUnit, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  g
                </Text>
              </View>

              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  Carbs
                </Text>
                <TextInput
                  style={[styles.nutritionInput, { color: colors.carbs, borderColor: isDark ? colors.borderDark : colors.border }]}
                  value={editableCarbs}
                  onChangeText={setEditableCarbs}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={isDark ? colors.textSecondaryDark : colors.textSecondary}
                />
                <Text style={[styles.nutritionUnit, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  g
                </Text>
              </View>

              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  Fats
                </Text>
                <TextInput
                  style={[styles.nutritionInput, { color: colors.fats, borderColor: isDark ? colors.borderDark : colors.border }]}
                  value={editableFat}
                  onChangeText={setEditableFat}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={isDark ? colors.textSecondaryDark : colors.textSecondary}
                />
                <Text style={[styles.nutritionUnit, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  g
                </Text>
              </View>

              <View style={styles.nutritionItem}>
                <Text style={[styles.nutritionLabel, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  Fiber
                </Text>
                <TextInput
                  style={[styles.nutritionInput, { color: colors.fiber, borderColor: isDark ? colors.borderDark : colors.border }]}
                  value={editableFiber}
                  onChangeText={setEditableFiber}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor={isDark ? colors.textSecondaryDark : colors.textSecondary}
                />
                <Text style={[styles.nutritionUnit, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  g
                </Text>
              </View>

              <View style={styles.totalSection}>
                <Text style={[styles.totalLabel, { color: isDark ? colors.textDark : colors.text }]}>
                  Total ({servings} serving{servings !== 1 ? 's' : ''}):
                </Text>
                <Text style={[styles.totalValue, { color: colors.primary }]}>
                  {Math.round(displayCalories * servings)} kcal
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleLogToDiary}
            >
              <Text style={styles.primaryButtonText}>Log to Diary</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { borderColor: isDark ? colors.borderDark : colors.border }]}
              onPress={handleBack}
            >
              <Text style={[styles.secondaryButtonText, { color: isDark ? colors.textDark : colors.text }]}>
                Back
              </Text>
            </TouchableOpacity>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack}>
            <IconSymbol
              ios_icon_name="chevron.left"
              android_material_icon_name="arrow_back"
              size={24}
              color={isDark ? colors.textDark : colors.text}
            />
          </TouchableOpacity>
          <Text style={[styles.title, { color: isDark ? colors.textDark : colors.text }]}>
            AI Meal Estimator
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
            <Text style={[styles.sectionTitle, { color: isDark ? colors.textDark : colors.text }]}>
              Describe Your Meal
            </Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: isDark ? colors.backgroundDark : colors.background, borderColor: isDark ? colors.borderDark : colors.border, color: isDark ? colors.textDark : colors.text }]}
              placeholder="e.g., 'chipotle bowl chicken no rice'"
              placeholderTextColor={isDark ? colors.textSecondaryDark : colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
            <Text style={[styles.sectionTitle, { color: isDark ? colors.textDark : colors.text }]}>
              Add Photo (Optional)
            </Text>
            
            {imageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={handleRemoveImage}
                >
                  <IconSymbol
                    ios_icon_name="xmark.circle.fill"
                    android_material_icon_name="cancel"
                    size={32}
                    color="#FF3B30"
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imageButtonsRow}>
                <TouchableOpacity
                  style={[styles.imageButton, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}
                  onPress={handleTakePhoto}
                >
                  <IconSymbol
                    ios_icon_name="camera"
                    android_material_icon_name="photo_camera"
                    size={32}
                    color={colors.primary}
                  />
                  <Text style={[styles.imageButtonText, { color: isDark ? colors.textDark : colors.text }]}>
                    Take Photo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.imageButton, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}
                  onPress={handleChoosePhoto}
                >
                  <IconSymbol
                    ios_icon_name="photo"
                    android_material_icon_name="photo_library"
                    size={32}
                    color={colors.primary}
                  />
                  <Text style={[styles.imageButtonText, { color: isDark ? colors.textDark : colors.text }]}>
                    Choose Photo
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
            onPress={handleEstimate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Estimate Macros</Text>
            )}
          </TouchableOpacity>

          <Text style={[styles.disclaimer, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
            AI estimates are approximations. Review and edit before logging.
          </Text>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
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
  title: {
    ...typography.h3,
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  card: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 2,
  },
  sectionTitle: {
    ...typography.h3,
    marginBottom: spacing.sm,
  },
  sectionSubtitle: {
    ...typography.caption,
    marginBottom: spacing.md,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    minHeight: 100,
  },
  imageButtonsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  imageButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  imageButtonText: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.md,
  },
  removeImageButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
  },
  primaryButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: spacing.sm,
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  disclaimer: {
    ...typography.caption,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  aiBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  aiBadge: {
    fontSize: 12,
    fontWeight: '700',
  },
  mealName: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  notes: {
    ...typography.body,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  servingsControl: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  label: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  servingsValue: {
    ...typography.h3,
    fontSize: 20,
    minWidth: 40,
    textAlign: 'center',
  },
  nutritionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  nutritionLabel: {
    ...typography.body,
    flex: 1,
  },
  nutritionInput: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    fontSize: 16,
    fontWeight: '600',
    minWidth: 80,
    textAlign: 'right',
  },
  nutritionUnit: {
    ...typography.body,
    marginLeft: spacing.xs,
    minWidth: 40,
  },
  totalSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    marginTop: spacing.md,
    borderTopWidth: 2,
    borderTopColor: colors.border,
  },
  totalLabel: {
    ...typography.bodyBold,
    fontSize: 16,
  },
  totalValue: {
    ...typography.h3,
    fontSize: 20,
  },
  bottomSpacer: {
    height: 100,
  },
});
