
import { useRouter, useLocalSearchParams } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AudioWaveform } from '@/components/AudioWaveform';
import { addToDraft } from '@/utils/myMealsDraft';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { supabase } from '@/app/integrations/supabase/client';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChatbot, ChatMessage } from '@/hooks/useChatbot';
import { transcribeAudioLocally } from '@/utils/localSpeechRecognition';
import {
  useAudioRecorder,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
  useAudioRecorderState,
} from 'expo-audio';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useColorScheme } from '@/hooks/useColorScheme';

type MessageWithId = ChatMessage & { id: string };

type Ingredient = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  serving_amount: number;
  serving_unit: string;
};

type AIEstimate = {
  meal_name: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fats: number;
  total_fiber: number;
  ingredients: Ingredient[];
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    padding: spacing.md,
  },
  messageRow: {
    marginBottom: spacing.md,
    flexDirection: 'row',
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  assistantMessageRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  userBubble: {
    backgroundColor: colors.primary,
  },
  assistantBubble: {
    backgroundColor: colors.cardBackground,
  },
  messageText: {
    ...typography.body,
    color: colors.text,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 40,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
    minHeight: 40,
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
  },
  imageButton: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
    minHeight: 40,
  },
  micButton: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
    minHeight: 40,
  },
  micButtonRecording: {
    backgroundColor: colors.error,
  },
  loadingContainer: {
    padding: spacing.md,
    alignItems: 'center',
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    padding: spacing.sm,
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    position: 'relative',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: colors.error,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  estimateCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  estimateTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  macroLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  macroValue: {
    ...typography.bodyBold,
    color: colors.text,
  },
  ingredientsTitle: {
    ...typography.bodyBold,
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  ingredientItem: {
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  ingredientName: {
    ...typography.bodyBold,
    color: colors.text,
  },
  ingredientServing: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ingredientMacros: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: 2,
  },
  addToMealButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.md,
    alignItems: 'center',
  },
  addToMealButtonText: {
    ...typography.bodyBold,
    color: '#FFFFFF',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
    marginRight: spacing.sm,
  },
  recordingText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  waveformContainer: {
    height: 40,
    marginLeft: spacing.sm,
  },
});

function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default function ChatbotScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const params = useLocalSearchParams();
  const scrollViewRef = useRef<ScrollView>(null);

  const [inputText, setInputText] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const { messages, isLoading, sendMessage } = useChatbot();

  const messagesWithIds: MessageWithId[] = messages.map((msg, index) => ({
    ...msg,
    id: `${msg.role}-${index}`,
  }));

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    if (recorderState.isRecording) {
      const interval = setInterval(() => {
        setRecordingDuration(Math.floor(recorderState.durationMillis / 1000));
      }, 100);
      return () => clearInterval(interval);
    } else {
      setRecordingDuration(0);
    }
  }, [recorderState.isRecording, recorderState.durationMillis]);

  const handleSend = async () => {
    if ((!inputText.trim() && selectedImages.length === 0) || isLoading) return;

    const textToSend = inputText.trim();
    const imagesToSend = [...selectedImages];

    setInputText('');
    setSelectedImages([]);

    await sendMessage(textToSend, imagesToSend);
    scrollToBottom();
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets
          .filter((asset) => asset.base64)
          .map((asset) => `data:image/jpeg;base64,${asset.base64}`);
        setSelectedImages((prev) => [...prev, ...newImages]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleRemoveImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStartRecording = async () => {
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission Required', 'Microphone permission is required to record audio.');
        return;
      }

      await setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      await recorder.record();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const handleStopRecording = async () => {
    try {
      const uri = await recorder.stop();
      setIsRecording(false);

      if (uri) {
        console.log('Recording saved to:', uri);
        const transcription = await transcribeAudioLocally(uri);
        if (transcription) {
          setInputText((prev) => (prev ? `${prev} ${transcription}` : transcription));
        } else {
          Alert.alert('Transcription Failed', 'Could not transcribe the audio. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      Alert.alert('Error', 'Failed to stop recording');
      setIsRecording(false);
    }
  };

  const handleAddToMeal = async (estimate: AIEstimate) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to add meals');
        return;
      }

      for (const ingredient of estimate.ingredients) {
        await addToDraft({
          name: ingredient.name,
          brand: 'AI Estimate',
          serving_amount: ingredient.serving_amount,
          serving_unit: ingredient.serving_unit,
          calories: ingredient.calories,
          protein: ingredient.protein,
          carbs: ingredient.carbs,
          fats: ingredient.fats,
          fiber: ingredient.fiber,
          barcode: null,
          user_created: false,
        });
      }

      Alert.alert(
        'Success',
        `Added ${estimate.ingredients.length} ingredient(s) to your meal draft. Go to Add Food to review and save.`,
        [
          {
            text: 'Review Now',
            onPress: () => router.push('/add-food'),
          },
          {
            text: 'Continue Chatting',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Error adding to meal:', error);
      Alert.alert('Error', 'Failed to add ingredients to meal');
    }
  };

  const renderMessage = (msg: MessageWithId) => {
    const isUser = msg.role === 'user';
    const estimate = msg.mealData as AIEstimate | undefined;

    return (
      <View
        key={msg.id}
        style={[styles.messageRow, isUser ? styles.userMessageRow : styles.assistantMessageRow]}
      >
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>{msg.content}</Text>

          {estimate && (
            <View style={styles.estimateCard}>
              <Text style={styles.estimateTitle}>{estimate.meal_name}</Text>

              <View style={styles.macroRow}>
                <Text style={styles.macroLabel}>Calories</Text>
                <Text style={styles.macroValue}>{Math.round(estimate.total_calories)} kcal</Text>
              </View>
              <View style={styles.macroRow}>
                <Text style={styles.macroLabel}>Protein</Text>
                <Text style={styles.macroValue}>{Math.round(estimate.total_protein)}g</Text>
              </View>
              <View style={styles.macroRow}>
                <Text style={styles.macroLabel}>Carbs</Text>
                <Text style={styles.macroValue}>{Math.round(estimate.total_carbs)}g</Text>
              </View>
              <View style={styles.macroRow}>
                <Text style={styles.macroLabel}>Fats</Text>
                <Text style={styles.macroValue}>{Math.round(estimate.total_fats)}g</Text>
              </View>
              <View style={styles.macroRow}>
                <Text style={styles.macroLabel}>Fiber</Text>
                <Text style={styles.macroValue}>{Math.round(estimate.total_fiber)}g</Text>
              </View>

              {estimate.ingredients && estimate.ingredients.length > 0 && (
                <>
                  <Text style={styles.ingredientsTitle}>Ingredients:</Text>
                  {estimate.ingredients.map((ing, idx) => (
                    <View key={idx} style={styles.ingredientItem}>
                      <Text style={styles.ingredientName}>{ing.name}</Text>
                      <Text style={styles.ingredientServing}>
                        {ing.serving_amount} {ing.serving_unit}
                      </Text>
                      <Text style={styles.ingredientMacros}>
                        {Math.round(ing.calories)} cal • {Math.round(ing.protein)}g protein •{' '}
                        {Math.round(ing.carbs)}g carbs • {Math.round(ing.fats)}g fats
                      </Text>
                    </View>
                  ))}
                </>
              )}

              <TouchableOpacity style={styles.addToMealButton} onPress={() => handleAddToMeal(estimate)}>
                <Text style={styles.addToMealButtonText}>Add to Meal</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.background : '#FFFFFF' }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={{ paddingBottom: spacing.lg }}
          keyboardShouldPersistTaps="handled"
        >
          {messagesWithIds.map(renderMessage)}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          )}
        </ScrollView>

        {isRecording && (
          <View style={styles.recordingIndicator}>
            <View style={styles.recordingDot} />
            <Text style={styles.recordingText}>Recording... {recordingDuration}s</Text>
            <View style={styles.waveformContainer}>
              <AudioWaveform isRecording={isRecording} />
            </View>
          </View>
        )}

        {selectedImages.length > 0 && (
          <View style={styles.imagePreviewContainer}>
            {selectedImages.map((uri, index) => (
              <View key={index} style={styles.imagePreview}>
                <Image source={{ uri }} style={{ width: '100%', height: '100%', borderRadius: borderRadius.md }} />
                <TouchableOpacity style={styles.removeImageButton} onPress={() => handleRemoveImage(index)}>
                  <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={[styles.inputContainer, { backgroundColor: isDark ? colors.background : '#FFFFFF' }]}>
          <TouchableOpacity style={styles.imageButton} onPress={handlePickImage}>
            <IconSymbol ios_icon_name="photo" android_material_icon_name="image" size={24} color={colors.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.micButton, isRecording && styles.micButtonRecording]}
            onPress={isRecording ? handleStopRecording : handleStartRecording}
          >
            <IconSymbol
              ios_icon_name={isRecording ? 'stop.circle.fill' : 'mic.fill'}
              android_material_icon_name={isRecording ? 'stop' : 'mic'}
              size={24}
              color={isRecording ? '#FFFFFF' : colors.text}
            />
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask about nutrition, log meals..."
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={1000}
          />

          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() && selectedImages.length === 0) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={(!inputText.trim() && selectedImages.length === 0) || isLoading}
          >
            <IconSymbol ios_icon_name="arrow.up" android_material_icon_name="send" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
