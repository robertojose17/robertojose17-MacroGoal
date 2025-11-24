
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Platform, Alert, KeyboardAvoidingView, Image, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import * as ImagePicker from 'expo-image-picker';
import { estimateMealWithGemini } from '@/utils/aiMealEstimator';

export default function AIMealEstimatorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const mealType = (params.meal as string) || 'breakfast';
  const date = (params.date as string) || new Date().toISOString().split('T')[0];
  const mode = (params.mode as string) || 'diary';
  const returnTo = (params.returnTo as string) || undefined;
  const myMealId = (params.mealId as string) || undefined;

  const [mealDescription, setMealDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions to add photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        console.log('[AIMealEstimator] Image selected:', result.assets[0].uri);
      }
    } catch (error) {
      console.error('[AIMealEstimator] Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera permissions to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        console.log('[AIMealEstimator] Photo taken:', result.assets[0].uri);
      }
    } catch (error) {
      console.error('[AIMealEstimator] Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handleRemoveImage = () => {
    setImageUri(null);
  };

  const handleEstimate = async () => {
    if (!mealDescription.trim()) {
      Alert.alert('Description Required', 'Please describe your meal to get an estimate.');
      return;
    }

    // Clear previous errors
    setErrorMessage(null);
    setEstimating(true);

    try {
      console.log('[AIMealEstimator] ========================================');
      console.log('[AIMealEstimator] User pressed "Estimate Macros"');
      console.log('[AIMealEstimator] Description:', mealDescription);
      console.log('[AIMealEstimator] Has image:', !!imageUri);
      console.log('[AIMealEstimator] ========================================');

      const result = await estimateMealWithGemini(mealDescription, imageUri);

      console.log('[AIMealEstimator] ========================================');
      console.log('[AIMealEstimator] ✅ Estimation successful!');
      console.log('[AIMealEstimator] Result items:', result.items.length);
      console.log('[AIMealEstimator] Total calories:', result.total.calories);
      console.log('[AIMealEstimator] ========================================');

      // Navigate to results screen
      router.push({
        pathname: '/ai-meal-results',
        params: {
          result: JSON.stringify(result),
          meal: mealType,
          date: date,
          mode: mode,
          returnTo: returnTo,
          mealId: myMealId,
        },
      });
    } catch (error: any) {
      console.error('[AIMealEstimator] ========================================');
      console.error('[AIMealEstimator] ❌ Estimation failed');
      console.error('[AIMealEstimator] Error:', error);
      console.error('[AIMealEstimator] Error message:', error.message);
      console.error('[AIMealEstimator] ========================================');
      
      const errorMsg = error.message || 'Failed to estimate meal. Please try again.';
      setErrorMessage(errorMsg);
      
      // Show alert with the specific error message
      Alert.alert('Estimation Failed', errorMsg);
    } finally {
      // Always stop loading
      setEstimating(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]} edges={['top']}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={0}
      >
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
            AI Meal Estimator
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {errorMessage && (
            <View style={[styles.errorCard, { backgroundColor: 'rgba(255, 59, 48, 0.1)', borderColor: '#FF3B30' }]}>
              <IconSymbol
                ios_icon_name="exclamationmark.triangle.fill"
                android_material_icon_name="error"
                size={24}
                color="#FF3B30"
              />
              <Text style={[styles.errorText, { color: '#FF3B30' }]}>
                {errorMessage}
              </Text>
            </View>
          )}

          <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
            <Text style={[styles.sectionTitle, { color: isDark ? colors.textDark : colors.text }]}>
              Describe Your Meal
            </Text>
            <Text style={[styles.sectionSubtitle, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Be as specific as possible for better accuracy
            </Text>

            <TextInput
              style={[
                styles.textInput,
                { 
                  backgroundColor: isDark ? colors.backgroundDark : colors.background,
                  borderColor: isDark ? colors.borderDark : colors.border,
                  color: isDark ? colors.textDark : colors.text
                }
              ]}
              placeholder="e.g., 'chipotle bowl chicken no rice' or 'grilled salmon with broccoli and quinoa'"
              placeholderTextColor={isDark ? colors.textSecondaryDark : colors.textSecondary}
              value={mealDescription}
              onChangeText={setMealDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={[styles.card, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
            <Text style={[styles.sectionTitle, { color: isDark ? colors.textDark : colors.text }]}>
              Add Photo (Optional)
            </Text>
            <Text style={[styles.sectionSubtitle, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Adding a photo can improve estimation accuracy
            </Text>

            {imageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={handleRemoveImage}
                  activeOpacity={0.7}
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
              <View style={styles.photoButtons}>
                <TouchableOpacity
                  style={[styles.photoButton, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}
                  onPress={handleTakePhoto}
                  activeOpacity={0.7}
                >
                  <IconSymbol
                    ios_icon_name="camera.fill"
                    android_material_icon_name="photo_camera"
                    size={32}
                    color={colors.primary}
                  />
                  <Text style={[styles.photoButtonText, { color: isDark ? colors.textDark : colors.text }]}>
                    Take Photo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.photoButton, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}
                  onPress={handlePickImage}
                  activeOpacity={0.7}
                >
                  <IconSymbol
                    ios_icon_name="photo.fill"
                    android_material_icon_name="photo_library"
                    size={32}
                    color={colors.primary}
                  />
                  <Text style={[styles.photoButtonText, { color: isDark ? colors.textDark : colors.text }]}>
                    Choose Photo
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.estimateButton,
              { 
                backgroundColor: colors.primary,
                opacity: (estimating || !mealDescription.trim()) ? 0.5 : 1
              }
            ]}
            onPress={handleEstimate}
            disabled={estimating || !mealDescription.trim()}
            activeOpacity={0.7}
          >
            {estimating ? (
              <View style={styles.estimatingContainer}>
                <ActivityIndicator color="#FFFFFF" />
                <Text style={styles.estimateButtonText}>Analyzing...</Text>
              </View>
            ) : (
              <Text style={styles.estimateButtonText}>Estimate Macros</Text>
            )}
          </TouchableOpacity>

          <View style={styles.infoCard}>
            <IconSymbol
              ios_icon_name="info.circle"
              android_material_icon_name="info"
              size={20}
              color={colors.info}
            />
            <Text style={[styles.infoText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
              Powered by Google Gemini 1.5 Flash AI. Estimates are approximations - you can review and edit results before logging.
            </Text>
          </View>

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
  errorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    ...typography.body,
    lineHeight: 20,
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
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    ...typography.caption,
    marginBottom: spacing.md,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    minHeight: 120,
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
    borderRadius: borderRadius.full,
  },
  photoButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  photoButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  photoButtonText: {
    ...typography.bodyBold,
    fontSize: 14,
  },
  estimateButton: {
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  estimatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  estimateButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  infoText: {
    flex: 1,
    ...typography.caption,
    lineHeight: 18,
  },
  bottomSpacer: {
    height: 100,
  },
});
