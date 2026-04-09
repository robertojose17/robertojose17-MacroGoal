import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { COLORS } from '@/constants/Colors';
import { apiPost } from '@/utils/api';
import { Send, Bot } from 'lucide-react-native';

const SUPABASE_URL = 'https://esgptfiofoaeguslgvcq.supabase.co';
const API_BASE = `${SUPABASE_URL}/functions/v1`;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const INITIAL_MESSAGE: Message = {
  id: 'init',
  role: 'assistant',
  content: "Hi! I'm your AI nutritionist. I can help you with meal planning, macro targets, food choices, and nutrition advice. What would you like to know?",
  timestamp: new Date(),
};

export default function ChatbotScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    console.log('[Chatbot] Message sent:', text);
    setInput('');

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const data = await apiPost<{ reply: string }>(`${API_BASE}/api/ai/chat`, {
        message: text,
        history,
      });
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply ?? 'Sorry, I could not generate a response.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error('[Chatbot] Send error:', err);
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting right now. Please try again.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View
        style={{
          flexDirection: 'row',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          marginBottom: 12,
          paddingHorizontal: 16,
        }}
      >
        {!isUser && (
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: 'rgba(245,158,11,0.1)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 8,
              marginTop: 4,
            }}
          >
            <Bot size={16} color={COLORS.warning} />
          </View>
        )}
        <View
          style={{
            maxWidth: '75%',
            backgroundColor: isUser ? COLORS.primary : COLORS.surface,
            borderRadius: 18,
            borderBottomRightRadius: isUser ? 4 : 18,
            borderBottomLeftRadius: isUser ? 18 : 4,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderWidth: isUser ? 0 : 1,
            borderColor: COLORS.border,
          }}
        >
          <Text
            style={{
              fontSize: 15,
              color: isUser ? '#fff' : COLORS.text,
              lineHeight: 22,
            }}
          >
            {item.content}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Nutritionist AI' }} />
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        behavior="padding"
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        />

        {loading && (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingBottom: 8, gap: 8 }}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: 'rgba(245,158,11,0.1)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bot size={16} color={COLORS.warning} />
            </View>
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 18,
                borderBottomLeftRadius: 4,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <ActivityIndicator size="small" color={COLORS.textSecondary} />
            </View>
          </View>
        )}

        {/* Input */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-end',
            paddingHorizontal: 16,
            paddingVertical: 12,
            paddingBottom: insets.bottom + 12,
            backgroundColor: COLORS.surface,
            borderTopWidth: 1,
            borderTopColor: COLORS.border,
            gap: 10,
          }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask about nutrition..."
            placeholderTextColor={COLORS.textTertiary}
            multiline
            style={{
              flex: 1,
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 20,
              paddingHorizontal: 16,
              paddingVertical: 10,
              fontSize: 15,
              color: COLORS.text,
              maxHeight: 100,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <AnimatedPressable
            onPress={handleSend}
            disabled={!input.trim() || loading}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: input.trim() && !loading ? COLORS.primary : COLORS.surfaceSecondary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Send size={18} color={input.trim() && !loading ? '#fff' : COLORS.textTertiary} />
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}
