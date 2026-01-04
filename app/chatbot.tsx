
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { transcribeAudioLocally } from '@/utils/localSpeechRecognition';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { AudioWaveform } from '@/components/AudioWaveform';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  useAudioRecorder,
  RecordingPresets,
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
  useAudioRecorderState,
} from 'expo-audio';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/app/integrations/supabase/client';
import { addToDraft } from '@/utils/myMealsDraft';
import { useChatbot, ChatMessage } from '@/hooks/useChatbot';
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
  ingredients: Ingredient[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fats: number;
  total_fiber: number;
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
    maxWidth: '80%',
  },
  userMessageRow: {
    alignSelf: 'flex-end',
  },
  assistantMessageRow: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  userBubble: {
    backgroundColor: colors.primary,
  },
  assistantBubble: {
    backgroundColor: colors.light.card,
  },
  assistantBubbleDark: {
    backgroundColor: colors.dark.card,
  },
  messageText: {
    fontSize: typography.sizes.md,
    lineHeight: typography.sizes.md * 1.5,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  assistantMessageText: {
    color: colors.light.text,
  },
  assistantMessageTextDark: {
    color: colors.dark.text,
  },
  imagePreview: {
    width: 200,
    height: 200,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    borderTopWidth: 1,
    alignItems: 'center',
    gap: spacing.sm,
  },
  inputContainerLight: {
    borderTopColor: colors.light.border,
    backgroundColor: colors.light.background,
  },
  inputContainerDark: {
    borderTopColor: colors.dark.border,
    backgroundColor: colors.dark.background,
  },
  textInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    fontSize: typography.sizes.md,
  },
  textInputLight: {
    backgroundColor: colors.light.card,
    color: colors.light.text,
  },
  textInputDark: {
    backgroundColor: colors.dark.card,
    color: colors.dark.text,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButton: {
    backgroundColor: colors.primary,
  },
  recordingButton: {
    backgroundColor: colors.error,
  },
  disabledButton: {
    opacity: 0.5,
  },
  selectedImageContainer: {
    padding: spacing.md,
    borderTopWidth: 1,
  },
  selectedImageContainerLight: {
    borderTopColor: colors.light.border,
    backgroundColor: colors.light.background,
  },
  selectedImageContainerDark: {
    borderTopColor: colors.dark.border,
    backgroundColor: colors.dark.background,
  },
  selectedImageWrapper: {
    position: 'relative',
  },
  selectedImage: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    padding: spacing.md,
    alignItems: 'center',
  },
  estimateCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  estimateCardLight: {
    backgroundColor: colors.light.card,
    borderColor: colors.light.border,
  },
  estimateCardDark: {
    backgroundColor: colors.dark.card,
    borderColor: colors.dark.border,
  },
  estimateTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.sm,
  },
  estimateTitleLight: {
    color: colors.light.text,
  },
  estimateTitleDark: {
    color: colors.dark.text,
  },
  ingredientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
  },
  ingredientRowLight: {
    borderBottomColor: colors.light.border,
  },
  ingredientRowDark: {
    borderBottomColor: colors.dark.border,
  },
  ingredientName: {
    fontSize: typography.sizes.md,
    flex: 1,
  },
  ingredientNameLight: {
    color: colors.light.text,
  },
  ingredientNameDark: {
    color: colors.dark.text,
  },
  ingredientMacros: {
    fontSize: typography.sizes.sm,
  },
  ingredientMacrosLight: {
    color: colors.light.textSecondary,
  },
  ingredientMacrosDark: {
    color: colors.dark.textSecondary,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: 2,
  },
  totalRowLight: {
    borderTopColor: colors.light.border,
  },
  totalRowDark: {
    borderTopColor: colors.dark.border,
  },
  totalLabel: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  totalLabelLight: {
    color: colors.light.text,
  },
  totalLabelDark: {
    color: colors.dark.text,
  },
  addButton: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
  },
  recordingIndicatorLight: {
    backgroundColor: colors.light.card,
  },
  recordingIndicatorDark: {
    backgroundColor: colors.dark.card,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.error,
  },
  recordingText: {
    fontSize: typography.sizes.md,
  },
  recordingTextLight: {
    color: colors.light.text,
  },
  recordingTextDark: {
    color: colors.dark.text,
  },
});

function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default function ChatbotScreen() {
  const scrollViewRef = useRef<ScrollView>(null);
  const colorScheme = useColorScheme();
  const params = useLocalSearchParams();
  const { sendMessage, loading, error: chatbotError } = useChatbot();
  const [messages, setMessages] = useState<MessageWithId[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentEstimate, setCurrentEstimate] = useState<AIEstimate | null>(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [isRecording, setIsRecording] = useState(false);
  const recorderState = useAudioRecorderState(audioRecorder);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const router = useRouter();

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  // Update recording duration
  useEffect(() => {
    if (isRecording && recorderState.isRecording) {
      setRecordingDuration(Math.floor(recorderState.durationMillis / 1000));
    }
  }, [isRecording, recorderState.isRecording, recorderState.durationMillis]);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64 = result.assets[0].base64;
      const dataUrl = `data:image/jpeg;base64,${base64}`;
      setSelectedImage(dataUrl);
    }
  };

  const handleTakePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64 = result.assets[0].base64;
      const dataUrl = `data:image/jpeg;base64,${base64}`;
      setSelectedImage(dataUrl);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
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

      await audioRecorder.record();
      setIsRecording(true);
      setRecordingDuration(0);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording. Please try again.');
    }
  };

  const handleStopRecording = async () => {
    try {
      const uri = await audioRecorder.stop();
      setIsRecording(false);
      setRecordingDuration(0);

      if (uri) {
        // Transcribe the audio locally
        const transcription = await transcribeAudioLocally(uri);
        if (transcription) {
          setInputText(transcription);
        } else {
          Alert.alert('Transcription Failed', 'Could not transcribe the audio. Please try again.');
        }
      }
    } catch (error) {
      console.error('Failed to stop recording:', error);
      Alert.alert('Error', 'Failed to stop recording. Please try again.');
      setIsRecording(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() && !selectedImage) {
      return;
    }

    const userMessage: MessageWithId = {
      id: generateMessageId(),
      role: 'user',
      content: inputText.trim() || 'Analyze this image',
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    const imageToSend = selectedImage;
    setSelectedImage(null);
    setCurrentEstimate(null);

    // Build messages array for API
    const apiMessages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a nutrition expert assistant. When a user describes a meal or sends a photo of food, provide:
1. A friendly, natural response about the meal
2. A detailed breakdown in JSON format with this structure:
{
  "ingredients": [
    {
      "name": "ingredient name",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fats": number,
      "fiber": number,
      "serving_amount": number,
      "serving_unit": "g/ml/oz/etc"
    }
  ],
  "total_calories": number,
  "total_protein": number,
  "total_carbs": number,
  "total_fats": number,
  "total_fiber": number
}

Provide reasonable estimates based on typical serving sizes. Be helpful and encouraging.`,
      },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage.content },
    ];

    try {
      const result = await sendMessage({
        messages: apiMessages,
        images: imageToSend ? [imageToSend] : [],
      });

      if (result) {
        const assistantMessage: MessageWithId = {
          id: generateMessageId(),
          role: 'assistant',
          content: result.message,
          timestamp: Date.now(),
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // If we got meal data, store it
        if (result.mealData) {
          setCurrentEstimate(result.mealData);
        }
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', error.message || 'Failed to send message. Please try again.');
    }
  };

  const handleAddToDraft = async () => {
    if (!currentEstimate) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to add meals.');
        return;
      }

      // Add each ingredient to the draft
      for (const ingredient of currentEstimate.ingredients) {
        await addToDraft({
          userId: user.id,
          mealType: (params.mealType as string) || 'snack',
          date: (params.date as string) || new Date().toISOString().split('T')[0],
          foodName: ingredient.name,
          brand: 'AI Estimate',
          servingAmount: ingredient.serving_amount,
          servingUnit: ingredient.serving_unit,
          servingsCount: 1,
          calories: ingredient.calories,
          protein: ingredient.protein,
          carbs: ingredient.carbs,
          fats: ingredient.fats,
          fiber: ingredient.fiber,
        });
      }

      Alert.alert(
        'Success',
        `Added ${currentEstimate.ingredients.length} ingredient(s) to your meal!`,
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error adding to draft:', error);
      Alert.alert('Error', 'Failed to add ingredients. Please try again.');
    }
  };

  const isDark = colorScheme === 'dark';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? colors.dark.background : colors.light.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={{ paddingBottom: spacing.lg }}
        >
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageRow,
                message.role === 'user' ? styles.userMessageRow : styles.assistantMessageRow,
              ]}
            >
              <View
                style={[
                  styles.messageBubble,
                  message.role === 'user'
                    ? styles.userBubble
                    : isDark
                    ? styles.assistantBubbleDark
                    : styles.assistantBubble,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.role === 'user'
                      ? styles.userMessageText
                      : isDark
                      ? styles.assistantMessageTextDark
                      : styles.assistantMessageText,
                  ]}
                >
                  {message.content}
                </Text>
              </View>
            </View>
          ))}

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}

          {currentEstimate && (
            <View style={[styles.estimateCard, isDark ? styles.estimateCardDark : styles.estimateCardLight]}>
              <Text style={[styles.estimateTitle, isDark ? styles.estimateTitleDark : styles.estimateTitleLight]}>
                Meal Breakdown
              </Text>

              {currentEstimate.ingredients.map((ingredient, index) => (
                <View
                  key={index}
                  style={[
                    styles.ingredientRow,
                    isDark ? styles.ingredientRowDark : styles.ingredientRowLight,
                  ]}
                >
                  <Text style={[styles.ingredientName, isDark ? styles.ingredientNameDark : styles.ingredientNameLight]}>
                    {ingredient.name}
                  </Text>
                  <Text style={[styles.ingredientMacros, isDark ? styles.ingredientMacrosDark : styles.ingredientMacrosLight]}>
                    {ingredient.calories}cal • P:{ingredient.protein}g • C:{ingredient.carbs}g • F:{ingredient.fats}g
                  </Text>
                </View>
              ))}

              <View style={[styles.totalRow, isDark ? styles.totalRowDark : styles.totalRowLight]}>
                <Text style={[styles.totalLabel, isDark ? styles.totalLabelDark : styles.totalLabelLight]}>Total</Text>
                <Text style={[styles.totalLabel, isDark ? styles.totalLabelDark : styles.totalLabelLight]}>
                  {currentEstimate.total_calories}cal • P:{currentEstimate.total_protein}g • C:{currentEstimate.total_carbs}g • F:{currentEstimate.total_fats}g
                </Text>
              </View>

              <TouchableOpacity style={styles.addButton} onPress={handleAddToDraft}>
                <Text style={styles.addButtonText}>Add to Meal</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {selectedImage && (
          <View style={[styles.selectedImageContainer, isDark ? styles.selectedImageContainerDark : styles.selectedImageContainerLight]}>
            <View style={styles.selectedImageWrapper}>
              <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
              <TouchableOpacity style={styles.removeImageButton} onPress={handleRemoveImage}>
                <IconSymbol ios_icon_name="xmark" android_material_icon_name="close" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isRecording && (
          <View style={[styles.recordingIndicator, isDark ? styles.recordingIndicatorDark : styles.recordingIndicatorLight]}>
            <View style={styles.recordingDot} />
            <Text style={[styles.recordingText, isDark ? styles.recordingTextDark : styles.recordingTextLight]}>
              Recording... {recordingDuration}s
            </Text>
            <AudioWaveform isRecording={isRecording} />
          </View>
        )}

        <View style={[styles.inputContainer, isDark ? styles.inputContainerDark : styles.inputContainerLight]}>
          <TouchableOpacity style={styles.iconButton} onPress={handlePickImage} disabled={loading}>
            <IconSymbol ios_icon_name="photo" android_material_icon_name="image" size={24} color={isDark ? colors.dark.text : colors.light.text} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.iconButton} onPress={handleTakePhoto} disabled={loading}>
            <IconSymbol ios_icon_name="camera" android_material_icon_name="camera" size={24} color={isDark ? colors.dark.text : colors.light.text} />
          </TouchableOpacity>

          <TextInput
            style={[styles.textInput, isDark ? styles.textInputDark : styles.textInputLight]}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Describe your meal..."
            placeholderTextColor={isDark ? colors.dark.textSecondary : colors.light.textSecondary}
            multiline
            editable={!loading && !isRecording}
          />

          {isRecording ? (
            <TouchableOpacity
              style={[styles.iconButton, styles.recordingButton]}
              onPress={handleStopRecording}
            >
              <IconSymbol ios_icon_name="stop.fill" android_material_icon_name="stop" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handleStartRecording}
                disabled={loading}
              >
                <IconSymbol ios_icon_name="mic" android_material_icon_name="mic" size={24} color={isDark ? colors.dark.text : colors.light.text} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.iconButton, styles.sendButton, (loading || (!inputText.trim() && !selectedImage)) && styles.disabledButton]}
                onPress={handleSend}
                disabled={loading || (!inputText.trim() && !selectedImage)}
              >
                <IconSymbol ios_icon_name="arrow.up" android_material_icon_name="send" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
