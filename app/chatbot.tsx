
import React, { useState, useRef, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { useChatbot, ChatMessage } from '@/hooks/useChatbot';

// Generate a unique ID for each message
let messageIdCounter = 0;
const generateMessageId = () => {
  messageIdCounter += 1;
  return `msg-${Date.now()}-${messageIdCounter}-${Math.random().toString(36).substr(2, 9)}`;
};

// Extended message type with guaranteed ID
type MessageWithId = ChatMessage & { id: string };

export default function ChatbotScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const scrollViewRef = useRef<ScrollView>(null);
  const isMountedRef = useRef(true);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const mode = (params.mode as string) || 'diary';
  const mealType = (params.meal as string) || 'breakfast';
  const date = (params.date as string) || new Date().toISOString().split('T')[0];
  const returnTo = (params.returnTo as string) || undefined;
  const myMealId = (params.mealId as string) || undefined;

  const [messages, setMessages] = useState<MessageWithId[]>([
    {
      id: generateMessageId(),
      role: 'assistant',
      content: 'Describe the meal you want me to estimate. The more details you include — ingredients, portions, extras, sauces, or any modifications — the more accurate your calories and macros will be.',
      timestamp: Date.now(),
    },
  ]);
  const [inputText, setInputText] = useState('');

  const { sendMessage, loading } = useChatbot();

  // Setup and cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Scroll to bottom when messages change
  const scrollToBottom = useCallback(() => {
    if (!isMountedRef.current) return;
    
    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Set new timeout
    scrollTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && scrollViewRef.current) {
        try {
          scrollViewRef.current.scrollToEnd({ animated: true });
        } catch (error) {
          console.warn('[ChatbotScreen] Error scrolling to bottom:', error);
        }
      }
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const handleSend = async () => {
    const trimmedInput = inputText.trim();
    if (!trimmedInput || loading) return;

    const userMessage: MessageWithId = {
      id: generateMessageId(),
      role: 'user',
      content: trimmedInput,
      timestamp: Date.now(),
    };

    // Add user message to chat
    if (isMountedRef.current) {
      setMessages((prev) => [...prev, userMessage]);
      setInputText('');
    }

    try {
      // Prepare messages for API (include system message)
      const systemMessage: ChatMessage = {
        role: 'system',
        content: 'You are an AI Meal Estimator. Your primary goal is to estimate calories and macronutrients (protein, carbs, fats, and fiber) for any food or meal the user describes. Always provide clear and structured macro estimates. If the user provides a photo, include it as part of your estimation. Your top priority is accuracy and helpfulness. Start by asking the user to clearly describe the meal they want to estimate (ingredients, portion sizes, cooking style, etc.).',
      };

      // Filter and validate messages before sending
      const validMessages = messages.filter((m) => {
        return m && typeof m === 'object' && m.role && m.content && m.role !== 'system';
      });

      const apiMessages: ChatMessage[] = [
        systemMessage,
        ...validMessages.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        })),
        {
          role: userMessage.role,
          content: userMessage.content,
          timestamp: userMessage.timestamp,
        },
      ];

      // Send to chatbot
      const result = await sendMessage({ messages: apiMessages });

      if (!isMountedRef.current) return;

      if (result && result.message && typeof result.message === 'string') {
        const assistantMessage: MessageWithId = {
          id: generateMessageId(),
          role: 'assistant',
          content: result.message,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Check if the response contains macro estimates
        // If it does, offer to log it
        const hasCalories = /\d+\s*(cal|kcal|calories)/i.test(result.message);
        const hasProtein = /protein[:\s]+\d+/i.test(result.message);
        
        if (hasCalories && hasProtein) {
          console.log('[ChatbotScreen] Response contains macro estimates');
          // Show option to log this meal
          setTimeout(() => {
            if (isMountedRef.current) {
              Alert.alert(
                'Log This Meal?',
                'Would you like to add this meal estimate to your diary?',
                [
                  {
                    text: 'Not Now',
                    style: 'cancel',
                  },
                  {
                    text: 'Log It',
                    onPress: () => handleLogMeal(result.message),
                  },
                ]
              );
            }
          }, 500);
        }
      } else {
        // Add error message
        const errorMessage: MessageWithId = {
          id: generateMessageId(),
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
      const errorMessage: MessageWithId = {
        id: generateMessageId(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleLogMeal = (aiResponse: string) => {
    console.log('[ChatbotScreen] Logging meal from AI response');
    
    // Parse the AI response to extract macros
    // This is a simple parser - in production you'd want more robust parsing
    const caloriesMatch = aiResponse.match(/(\d+)\s*(cal|kcal|calories)/i);
    const proteinMatch = aiResponse.match(/protein[:\s]+(\d+\.?\d*)/i);
    const carbsMatch = aiResponse.match(/carb(?:s|ohydrate)?[:\s]+(\d+\.?\d*)/i);
    const fatsMatch = aiResponse.match(/fat[:\s]+(\d+\.?\d*)/i);
    const fiberMatch = aiResponse.match(/fiber[:\s]+(\d+\.?\d*)/i);
    
    const calories = caloriesMatch ? caloriesMatch[1] : '0';
    const protein = proteinMatch ? proteinMatch[1] : '0';
    const carbs = carbsMatch ? carbsMatch[1] : '0';
    const fats = fatsMatch ? fatsMatch[1] : '0';
    const fiber = fiberMatch ? fiberMatch[1] : '0';
    
    // Extract meal name from the user's last message
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    const mealName = lastUserMessage ? lastUserMessage.content.substring(0, 50) : 'AI Estimated Meal';
    
    console.log('[ChatbotScreen] Parsed macros:', { calories, protein, carbs, fats, fiber });
    
    // Navigate to Quick Add with pre-filled data
    router.push({
      pathname: '/quick-add',
      params: {
        mode: mode,
        meal: mealType,
        date: date,
        returnTo: returnTo,
        mealId: myMealId,
        prefillName: mealName,
        prefillCalories: calories,
        prefillProtein: protein,
        prefillCarbs: carbs,
        prefillFats: fats,
        prefillFiber: fiber,
      },
    });
  };

  const formatTime = useCallback((timestamp: number | undefined): string => {
    try {
      if (!timestamp || typeof timestamp !== 'number' || isNaN(timestamp)) {
        return '';
      }
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return '';
      }
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.warn('[ChatbotScreen] Error formatting time:', error);
      return '';
    }
  }, []);

  // Filter valid messages before rendering
  const validMessages = messages.filter((message) => {
    return message && typeof message === 'object' && message.content && message.id;
  });

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
          {validMessages.length > 0 ? (
            validMessages.map((message) => {
              const isUser = message.role === 'user';

              return (
                <View
                  key={message.id}
                  style={[
                    styles.messageWrapper,
                    isUser ? styles.userMessageWrapper : styles.assistantMessageWrapper,
                  ]}
                >
                  <View
                    style={[
                      styles.messageBubble,
                      isUser
                        ? { backgroundColor: colors.primary }
                        : { backgroundColor: isDark ? colors.cardDark : colors.card },
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        {
                          color: isUser ? '#FFFFFF' : isDark ? colors.textDark : colors.text,
                        },
                      ]}
                    >
                      {message.content}
                    </Text>
                    {message.timestamp && (
                      <Text
                        style={[
                          styles.messageTime,
                          {
                            color:
                              isUser
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
            })
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: isDark ? colors.textSecondaryDark : colors.textSecondary }]}>
                No messages yet
              </Text>
            </View>
          )}
          
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    ...typography.body,
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
