
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Animated,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { colors, spacing, borderRadius, typography } from '@/styles/commonStyles';
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
} from '@react-native-voice/voice';

type Message = {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  result?: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    fiber: number;
  };
  timestamp: Date;
};

const INITIAL_MESSAGE: Message = {
  id: 'init',
  role: 'assistant',
  text: 'Describe your meal or take a photo! You can use text or a photo for the most accurate estimate.',
  timestamp: new Date(),
};

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function AIMealEstimatorScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const inputTextRef = useRef(inputText);
  const scrollViewRef = useRef<ScrollView>(null);

  const bgColor = isDark ? '#1A1C2E' : colors.background;
  const cardColor = isDark ? '#252740' : colors.card;
  const textColor = isDark ? colors.textDark : colors.text;
  const borderColor = isDark ? '#3A3C52' : colors.border;
  const inputBg = isDark ? '#252740' : '#fff';
  const mutedColor = isDark ? '#A0A2B8' : colors.textSecondary;

  useEffect(() => {
    inputTextRef.current = inputText;
  }, [inputText]);

  useEffect(() => {
    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      const recognized = e.value?.[0] ?? '';
      console.log('[AIMealEstimator] Speech recognized:', recognized);
      if (recognized) {
        const current = inputTextRef.current;
        const separator = current.trim().length > 0 ? ' ' : '';
        setInputText(current + separator + recognized);
      }
    };

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      console.error('[AIMealEstimator] Speech error:', e.error);
      stopListening();
      const code = e.error?.code;
      if (code === '5' || String(code) === '5') return;
      if (
        String(e.error?.message ?? '').toLowerCase().includes('permission') ||
        code === '9' ||
        String(code) === '9'
      ) {
        Alert.alert('Permission Denied', 'Microphone permission is required. Please enable it in Settings.');
      } else {
        Alert.alert('Speech Error', 'Could not recognize speech. Please try again.');
      }
    };

    Voice.onSpeechEnd = () => {
      console.log('[AIMealEstimator] Speech ended');
      stopListening();
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  const startPulse = () => {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    pulseLoop.current.start();
  };

  const stopPulse = () => {
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
  };

  const stopListening = async () => {
    try { await Voice.stop(); } catch (_) {}
    setIsListening(false);
    stopPulse();
  };

  const handleMicPress = async () => {
    if (isListening) {
      console.log('[AIMealEstimator] Mic button pressed — stopping listening');
      await stopListening();
      return;
    }
    console.log('[AIMealEstimator] Mic button pressed — starting listening');
    try {
      await Voice.start('en-US');
      setIsListening(true);
      startPulse();
    } catch (e: any) {
      console.error('[AIMealEstimator] Failed to start voice recognition:', e);
      const msg = String(e?.message ?? '').toLowerCase();
      if (msg.includes('permission')) {
        Alert.alert('Permission Denied', 'Microphone permission is required. Please enable it in Settings.');
      } else {
        Alert.alert('Error', 'Could not start voice recognition. Please try again.');
      }
    }
  };

  const handleCameraPress = () => {
    console.log('[AIMealEstimator] Camera button pressed');
    Alert.alert('Camera', 'Photo capture coming soon!');
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;

    console.log('[AIMealEstimator] Send button pressed, message:', text);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsAnalyzing(true);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      console.log('[AIMealEstimator] Sending meal analysis request for:', text);
      await new Promise(resolve => setTimeout(resolve, 1500));

      const result = { calories: 450, protein: 25, carbs: 45, fats: 15, fiber: 5 };
      console.log('[AIMealEstimator] Meal analysis complete:', result);

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: 'Here is the estimated nutrition breakdown for your meal:',
        result,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error('[AIMealEstimator] Error analyzing meal:', error);
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: 'Sorry, I could not analyze your meal. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const hasInput = inputText.trim().length > 0;

  const micBgColor = isListening ? '#ef4444' : 'transparent';
  const micBorderColor = isListening ? '#ef4444' : borderColor;
  const micIconColor = isListening ? '#fff' : colors.primary;
  const micIconName = isListening ? 'mic.fill' : 'mic';
  const micAndroidIcon = isListening ? 'mic' : 'mic-none';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: cardColor, borderBottomColor: borderColor }]}>
        <TouchableOpacity
          onPress={() => {
            console.log('[AIMealEstimator] Back button pressed');
            router.back();
          }}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow-back"
            size={22}
            color={textColor}
          />
        </TouchableOpacity>
        <View style={styles.headerTitleRow}>
          <IconSymbol
            ios_icon_name="sparkles"
            android_material_icon_name="auto-awesome"
            size={18}
            color={colors.primary}
          />
          <Text style={[styles.headerTitle, { color: textColor }]}>AI Meal Estimator</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.flex}
          contentContainerStyle={styles.messagesContent}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.map(msg => {
            const isUser = msg.role === 'user';
            const timeText = formatTime(msg.timestamp);
            return (
              <View
                key={msg.id}
                style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAssistant]}
              >
                <View
                  style={[
                    styles.bubble,
                    isUser
                      ? [styles.bubbleUser, { backgroundColor: colors.primary }]
                      : [styles.bubbleAssistant, { backgroundColor: cardColor, borderColor }],
                  ]}
                >
                  <Text style={[styles.bubbleText, { color: isUser ? '#fff' : textColor }]}>
                    {msg.text}
                  </Text>
                  {msg.result && (
                    <View style={[styles.resultGrid, { borderTopColor: isDark ? '#3A3C52' : '#e5e7eb' }]}>
                      <View style={styles.resultRow}>
                        <View style={styles.resultItem}>
                          <Text style={[styles.resultValue, { color: colors.calories }]}>
                            {msg.result.calories}
                          </Text>
                          <Text style={[styles.resultLabel, { color: isDark ? '#A0A2B8' : '#6B7280' }]}>
                            kcal
                          </Text>
                        </View>
                        <View style={styles.resultItem}>
                          <Text style={[styles.resultValue, { color: colors.protein }]}>
                            {msg.result.protein}
                            <Text style={styles.resultUnit}>g</Text>
                          </Text>
                          <Text style={[styles.resultLabel, { color: isDark ? '#A0A2B8' : '#6B7280' }]}>
                            Protein
                          </Text>
                        </View>
                        <View style={styles.resultItem}>
                          <Text style={[styles.resultValue, { color: colors.carbs }]}>
                            {msg.result.carbs}
                            <Text style={styles.resultUnit}>g</Text>
                          </Text>
                          <Text style={[styles.resultLabel, { color: isDark ? '#A0A2B8' : '#6B7280' }]}>
                            Carbs
                          </Text>
                        </View>
                        <View style={styles.resultItem}>
                          <Text style={[styles.resultValue, { color: colors.fats }]}>
                            {msg.result.fats}
                            <Text style={styles.resultUnit}>g</Text>
                          </Text>
                          <Text style={[styles.resultLabel, { color: isDark ? '#A0A2B8' : '#6B7280' }]}>
                            Fats
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                  <Text style={[styles.bubbleTime, { color: isUser ? 'rgba(255,255,255,0.65)' : mutedColor }]}>
                    {timeText}
                  </Text>
                </View>
              </View>
            );
          })}

          {isAnalyzing && (
            <View style={[styles.bubbleRow, styles.bubbleRowAssistant]}>
              <View style={[styles.bubble, styles.bubbleAssistant, { backgroundColor: cardColor, borderColor }]}>
                <View style={styles.typingRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[styles.typingText, { color: mutedColor }]}>Analyzing...</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Pinned bottom input bar */}
        <View style={[styles.inputBar, { backgroundColor: cardColor, borderTopColor: borderColor }]}>
          {/* Camera button */}
          <TouchableOpacity
            onPress={handleCameraPress}
            style={styles.iconButton}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <IconSymbol
              ios_icon_name="camera"
              android_material_icon_name="camera-alt"
              size={22}
              color={colors.primary}
            />
          </TouchableOpacity>

          {/* Text input */}
          <TextInput
            style={[styles.textInput, { backgroundColor: inputBg, color: textColor, borderColor }]}
            placeholder="Describe your meal..."
            placeholderTextColor={mutedColor}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            returnKeyType="default"
          />

          {/* Mic button */}
          <TouchableOpacity
            onPress={handleMicPress}
            style={[
              styles.micButton,
              {
                backgroundColor: micBgColor,
                borderColor: micBorderColor,
              },
            ]}
            activeOpacity={0.7}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <IconSymbol
                ios_icon_name={micIconName}
                android_material_icon_name={micAndroidIcon}
                size={20}
                color={micIconColor}
              />
            </Animated.View>
          </TouchableOpacity>

          {/* Send button */}
          <TouchableOpacity
            onPress={handleSend}
            style={[
              styles.sendButton,
              {
                backgroundColor: hasInput ? colors.primary : (isDark ? '#3A3C52' : '#E5E7EB'),
              },
            ]}
            activeOpacity={0.7}
            disabled={!hasInput || isAnalyzing}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <IconSymbol
              ios_icon_name="arrow.up"
              android_material_icon_name="arrow-upward"
              size={18}
              color={hasInput ? '#fff' : mutedColor}
            />
          </TouchableOpacity>
        </View>

        <SafeAreaView edges={['bottom']} style={{ backgroundColor: cardColor }} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
    }),
  },
  backButton: {
    width: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  messagesContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  bubbleRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bubbleRowUser: {
    justifyContent: 'flex-end',
  },
  bubbleRowAssistant: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 6,
  },
  bubbleUser: {
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    borderBottomLeftRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleTime: {
    fontSize: 11,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 4,
  },
  typingText: {
    fontSize: 14,
  },
  resultGrid: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  resultItem: {
    alignItems: 'center',
    flex: 1,
  },
  resultValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  resultUnit: {
    fontSize: 12,
    fontWeight: '400',
  },
  resultLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.xl,
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 9 : 7,
    paddingBottom: Platform.OS === 'ios' ? 9 : 7,
    fontSize: 15,
    maxHeight: 100,
    minHeight: 36,
  },
  micButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1,
  },
});
