
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
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { useChatbot, ChatMessage } from '@/hooks/useChatbot';

export default function ChatbotScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const scrollViewRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your nutrition assistant. I can help you with meal planning, nutrition advice, and answer questions about your fitness goals. How can I help you today?',
      timestamp: Date.now(),
    },
  ]);
  const [inputText, setInputText] = useState('');

  const { sendMessage, loading } = useChatbot();

  useEffect(() => {
    // Scroll to bottom when messages change
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputText.trim(),
      timestamp: Date.now(),
    };

    // Add user message to chat
    setMessages((prev) => [...prev, userMessage]);
    setInputText('');

    // Prepare messages for API (include system message)
    const apiMessages: ChatMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful nutrition and fitness assistant for Elite Macro Tracker app. Provide concise, accurate advice about nutrition, meal planning, macros, and fitness. Be friendly and supportive.',
      },
      ...messages.filter((m) => m.role !== 'system'),
      userMessage,
    ];

    // Send to chatbot
    const result = await sendMessage({ messages: apiMessages });

    if (result) {
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: result.message,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } else {
      // Add error message
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: isDark ? colors.backgroundDark : colors.background }]}
      edges={['top']}
    >
      <View style={[styles.header, { borderBottomColor: isDark ? colors.borderDark : colors.border }]}>
        <View style={styles.headerTitleContainer}>
          <IconSymbol
            ios_icon_name="sparkles"
            android_material_icon_name="auto_awesome"
            size={24}
            color={colors.primary}
          />
          <Text style={[styles.headerTitle, { color: isDark ? colors.textDark : colors.text }]}>
            AI Assistant
          </Text>
        </View>
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
          {messages.map((message, index) => (
            <View
              key={index}
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
                  {message.content}
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
          ))}
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
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'android' ? spacing.lg : 0,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
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
