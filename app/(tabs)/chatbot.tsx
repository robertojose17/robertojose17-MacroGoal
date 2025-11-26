
import React, { useState, useRef, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { useChatbot, ChatMessage } from '@/hooks/useChatbot';

type AIEstimate = {
  name: string;
  description?: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  defaultAmount: number;
  defaultUnit: string;
};

export default function ChatbotScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const scrollViewRef = useRef<ScrollView>(null);
  const isMountedRef = useRef(true);

  // Extract context from params (passed from Add Food screen)
  const mode = (params.mode as string) || 'diary';
  const mealType = (params.meal as string) || 'breakfast';
  const date = (params.date as string) || new Date().toISOString().split('T')[0];
  const returnTo = (params.returnTo as string) || undefined;
  const myMealId = (params.mealId as string) || undefined;

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Describe the meal you want me to estimate. The more details you include — ingredients, portions, extras, sauces, or any modifications — the more accurate your calories and macros will be.',
      timestamp: Date.now(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [latestEstimate, setLatestEstimate] = useState<AIEstimate | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string>('');

  const { sendMessage, loading } = useChatbot();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change
    setTimeout(() => {
      if (isMountedRef.current) {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }
    }, 100);
  }, [messages]);

  /**
   * Parse AI response to extract macro estimates
   * Looks for patterns like "Calories: 450" or "Protein: 25g"
   */
  const parseAIEstimate = (content: string, userMessage: string): AIEstimate | null => {
    try {
      if (!content || typeof content !== 'string') {
        console.log('[Chatbot] Invalid content for parsing');
        return null;
      }

      console.log('[Chatbot] Parsing AI response for estimates');
      
      // Look for calorie patterns
      const caloriePatterns = [
        /calories?[:\s]+(\d+)/i,
        /(\d+)\s*cal/i,
        /(\d+)\s*kcal/i,
      ];
      
      // Look for macro patterns
      const proteinPatterns = [
        /protein[:\s]+(\d+\.?\d*)\s*g/i,
        /(\d+\.?\d*)\s*g\s+protein/i,
      ];
      
      const carbsPatterns = [
        /carb(?:ohydrate)?s?[:\s]+(\d+\.?\d*)\s*g/i,
        /(\d+\.?\d*)\s*g\s+carb/i,
      ];
      
      const fatsPatterns = [
        /fats?[:\s]+(\d+\.?\d*)\s*g/i,
        /(\d+\.?\d*)\s*g\s+fat/i,
      ];
      
      const fiberPatterns = [
        /fiber[:\s]+(\d+\.?\d*)\s*g/i,
        /(\d+\.?\d*)\s*g\s+fiber/i,
      ];
      
      // Extract values
      let calories = 0;
      let protein = 0;
      let carbs = 0;
      let fats = 0;
      let fiber = 0;
      
      // Try to find calories
      for (const pattern of caloriePatterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
          const parsed = parseFloat(match[1]);
          if (!isNaN(parsed)) {
            calories = parsed;
            break;
          }
        }
      }
      
      // Try to find protein
      for (const pattern of proteinPatterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
          const parsed = parseFloat(match[1]);
          if (!isNaN(parsed)) {
            protein = parsed;
            break;
          }
        }
      }
      
      // Try to find carbs
      for (const pattern of carbsPatterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
          const parsed = parseFloat(match[1]);
          if (!isNaN(parsed)) {
            carbs = parsed;
            break;
          }
        }
      }
      
      // Try to find fats
      for (const pattern of fatsPatterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
          const parsed = parseFloat(match[1]);
          if (!isNaN(parsed)) {
            fats = parsed;
            break;
          }
        }
      }
      
      // Try to find fiber
      for (const pattern of fiberPatterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
          const parsed = parseFloat(match[1]);
          if (!isNaN(parsed)) {
            fiber = parsed;
            break;
          }
        }
      }
      
      // Only return estimate if we found at least calories
      if (calories > 0) {
        console.log('[Chatbot] Found estimate:', { calories, protein, carbs, fats, fiber });
        
        // Use user's message as the meal name (truncate if too long)
        const mealName = userMessage && userMessage.length > 50 
          ? userMessage.substring(0, 47) + '...' 
          : userMessage || 'AI Estimated Meal';
        
        return {
          name: mealName,
          description: content,
          calories,
          protein,
          carbs,
          fats,
          fiber,
          defaultAmount: 1,
          defaultUnit: 'serving',
        };
      }
      
      console.log('[Chatbot] No valid estimate found in response');
      return null;
    } catch (error) {
      console.error('[Chatbot] Error parsing AI estimate:', error);
      return null;
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputText.trim(),
      timestamp: Date.now(),
    };

    // Store the user message for meal naming
    setLastUserMessage(inputText.trim());

    // Add user message to chat
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');

    try {
      // Prepare messages for API (include system message)
      const apiMessages: ChatMessage[] = [
        {
          role: 'system',
          content: 'You are an AI Meal Estimator. Your primary goal is to estimate calories and macronutrients (protein, carbs, fats, and fiber) for any food or meal the user describes. Always provide clear and structured macro estimates. If the user provides a photo, include it as part of your estimation. Your top priority is accuracy and helpfulness.\n\nStart by asking the user to clearly describe the meal they want to estimate (ingredients, portion sizes, cooking style, etc.).',
        },
        ...messages.filter((m) => m.role !== 'system'),
        userMessage,
      ];

      // Send to chatbot
      const result = await sendMessage({ messages: apiMessages });

      if (!isMountedRef.current) return;

      if (result && result.message) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: result.message,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        
        // Try to parse the estimate from the response
        const estimate = parseAIEstimate(result.message, lastUserMessage);
        if (estimate) {
          console.log('[Chatbot] Setting latest estimate:', estimate);
          setLatestEstimate(estimate);
        }
      } else {
        // Add error message
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('[ChatbotScreen] Error in handleSend:', error);
      if (!isMountedRef.current) return;
      // Add error message
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleLogMeal = () => {
    if (!latestEstimate) return;
    
    try {
      console.log('[Chatbot] Logging meal to diary:', latestEstimate);
      
      // Navigate to Quick Add with pre-filled data
      router.push({
        pathname: '/quick-add',
        params: {
          meal: mealType,
          date: date,
          mode: mode,
          returnTo: returnTo,
          mealId: myMealId,
          // Pre-fill data from AI estimate
          prefillName: latestEstimate.name,
          prefillCalories: latestEstimate.calories.toString(),
          prefillProtein: latestEstimate.protein.toString(),
          prefillCarbs: latestEstimate.carbs.toString(),
          prefillFats: latestEstimate.fats.toString(),
          prefillFiber: latestEstimate.fiber.toString(),
        },
      });
    } catch (error) {
      console.error('[Chatbot] Error logging meal:', error);
    }
  };

  const formatTime = (timestamp: number | undefined) => {
    try {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error('[ChatbotScreen] Error formatting time:', error);
      return '';
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}
      edges={['top']}
    >
      <View style={[styles.header, { borderBottomColor: isDark ? colors.borderDark : colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={24}
            color={isDark ? colors.textDark : colors.text}
          />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <IconSymbol
            ios_icon_name="sparkles"
            android_material_icon_name="auto_awesome"
            size={24}
            color={colors.primary}
          />
          <Text style={[styles.headerTitle, { color: isDark ? colors.textDark : colors.text }]}>
            AI Meal Estimator
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message, index) => {
            // Create stable unique key using timestamp and index
            const key = `msg-${message.timestamp || 0}-${index}`;
            return (
              <View
                key={key}
                style={[
                  styles.messageWrapper,
                  message.role === 'user' ? styles.userMessageWrapper : styles.assistantMessageWrapper,
                ]}
              >
                <View
                  style={[
                    styles.messageBubble,
                    message.role === 'user'
                      ? { backgroundColor: colors.primary }
                      : { backgroundColor: isDark ? colors.cardDark : colors.card },
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      {
                        color: message.role === 'user' ? '#FFFFFF' : isDark ? colors.textDark : colors.text,
                      },
                    ]}
                  >
                    {message.content || ''}
                  </Text>
                  {message.timestamp && (
                    <Text
                      style={[
                        styles.messageTime,
                        {
                          color:
                            message.role === 'user'
                              ? 'rgba(255, 255, 255, 0.7)'
                              : isDark
                              ? colors.textSecondaryDark
                              : colors.textSecondary,
                        },
                      ]}
                    >
                      {formatTime(message.timestamp)}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
          {loading && (
            <View style={styles.loadingWrapper}>
              <View style={[styles.loadingBubble, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                  Thinking...
                </Text>
              </View>
            </View>
          )}
          
          {/* Log this meal button - only show when we have a valid estimate */}
          {latestEstimate && !loading && (
            <View style={styles.logMealButtonWrapper}>
              <TouchableOpacity
                style={[styles.logMealButton, { backgroundColor: colors.primary }]}
                onPress={handleLogMeal}
                activeOpacity={0.7}
              >
                <IconSymbol
                  ios_icon_name="plus.circle.fill"
                  android_material_icon_name="add_circle"
                  size={24}
                  color="#FFFFFF"
                />
                <Text style={styles.logMealButtonText}>Log this meal</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputContainer, { backgroundColor: isDark ? colors.cardDark : colors.card }]}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark ? colors.backgroundDark : colors.background,
                color: isDark ? colors.textDark : colors.text,
              },
            ]}
            placeholder="Type your message..."
            placeholderTextColor={isDark ? colors.textSecondaryDark : colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!loading}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              { backgroundColor: inputText.trim() && !loading ? colors.primary : colors.border },
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || loading}
          >
            <IconSymbol
              ios_icon_name="arrow.up"
              android_material_icon_name="send"
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'android' ? spacing.lg : 0,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerTitle: {
    ...typography.h3,
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  messageWrapper: {
    marginBottom: spacing.md,
    maxWidth: '80%',
  },
  userMessageWrapper: {
    alignSelf: 'flex-end',
  },
  assistantMessageWrapper: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.1)',
    elevation: 1,
  },
  messageText: {
    ...typography.body,
    lineHeight: 20,
  },
  messageTime: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  loadingWrapper: {
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  loadingBubble: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.body,
  },
  logMealButtonWrapper: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  logMealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)',
    elevation: 3,
  },
  logMealButtonText: {
    ...typography.bodyBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    ...typography.body,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
