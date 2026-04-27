import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, spacing, typography } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';
import { IconSymbol } from '@/components/IconSymbol';
import { supabase } from '@/lib/supabase/client';
import { createMealPlan, addMealPlanItem } from '@/utils/mealPlansApi';

let msgCounter = 0;
const genId = () => `msg-${Date.now()}-${++msgCounter}`;

type Role = 'user' | 'assistant' | 'system';

interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
}

interface PlanFood {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber: number;
  quantity: number;
  serving_description: string;
}

interface GeneratedPlan {
  breakfast: PlanFood[];
  lunch: PlanFood[];
  dinner: PlanFood[];
  snack: PlanFood[];
}

interface UserGoals {
  daily_calories: number;
  daily_protein: number;
  daily_carbs: number;
  daily_fats: number;
}

export default function AIMealPlannerScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const scrollRef = useRef<ScrollView>(null);
  const isMounted = useRef(true);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<GeneratedPlan | null>(null);
  const [planSummary, setPlanSummary] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [planName, setPlanName] = useState('');
  const [userGoals, setUserGoals] = useState<UserGoals | null>(null);

  const bgColor = isDark ? colors.backgroundDark : colors.background;
  const textColor = isDark ? colors.textDark : colors.text;
  const secondaryColor = isDark ? colors.textSecondaryDark : colors.textSecondary;
  const cardBg = isDark ? colors.cardDark : colors.card;

  useEffect(() => {
    isMounted.current = true;
    loadUserGoals();
    return () => { isMounted.current = false; };
  }, []);

  const loadUserGoals = async () => {
    console.log('[AIMealPlanner] loadUserGoals called');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[AIMealPlanner] loadUserGoals: no authenticated user');
        return;
      }
      const { data } = await supabase
        .from('user_goals')
        .select('daily_calories, daily_protein, daily_carbs, daily_fats')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data && isMounted.current) {
        console.log('[AIMealPlanner] loadUserGoals success:', data);
        setUserGoals(data);
        sendToAI([], data, true);
      } else {
        console.log('[AIMealPlanner] loadUserGoals: no goals found');
      }
    } catch (e) {
      console.error('[AIMealPlanner] loadUserGoals error:', e);
    }
  };

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      if (isMounted.current && scrollRef.current) {
        scrollRef.current.scrollToEnd({ animated: true });
      }
    }, 100);
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages.length]);

  const sendToAI = async (history: Message[], goals: UserGoals | null, isInitial = false) => {
    if (!goals) return;
    console.log('[AIMealPlanner] sendToAI called, isInitial:', isInitial, 'history length:', history.length);
    setLoading(true);

    const apiMessages = history
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }));

    if (isInitial) {
      apiMessages.push({ role: 'user', content: 'Please create a meal plan for me based on my goals.' });
    }

    try {
      console.log('[AIMealPlanner] invoking generate-meal-plan function');
      const { data, error } = await supabase.functions.invoke('generate-meal-plan', {
        body: { messages: apiMessages, userGoals: goals },
      });

      if (!isMounted.current) return;
      if (error) throw new Error(error.message);

      console.log('[AIMealPlanner] generate-meal-plan response received, readyToSave:', data?.readyToSave);

      const assistantMsg: Message = {
        id: genId(),
        role: 'assistant',
        content: data.message || 'Here is your meal plan!',
        timestamp: Date.now(),
      };

      setMessages(prev => [...prev, assistantMsg]);

      if (data.readyToSave && data.planData) {
        console.log('[AIMealPlanner] plan ready to save');
        setGeneratedPlan(data.planData);
        setPlanSummary(data.summary || null);
      }
    } catch (e: any) {
      console.error('[AIMealPlanner] sendToAI error:', e?.message || e);
      if (!isMounted.current) return;
      const errMsg: Message = {
        id: genId(),
        role: 'assistant',
        content: 'Sorry, I had trouble generating your plan. Please try again.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || loading || !userGoals) return;

    console.log('[AIMealPlanner] user sent message:', text);
    const userMsg: Message = { id: genId(), role: 'user', content: text, timestamp: Date.now() };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputText('');
    await sendToAI(newHistory, userGoals);
  }, [inputText, loading, messages, userGoals]);

  const handleSavePlan = async () => {
    if (!generatedPlan || !planName.trim()) return;
    console.log('[AIMealPlanner] handleSavePlan called, planName:', planName.trim());
    setSaving(true);
    try {
      const today = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const dateStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

      console.log('[AIMealPlanner] creating meal plan:', planName.trim(), dateStr);
      const newPlan = await createMealPlan({
        name: planName.trim(),
        start_date: dateStr,
        end_date: dateStr,
      });
      console.log('[AIMealPlanner] meal plan created:', newPlan.id);

      const mealTypes: ('breakfast' | 'lunch' | 'dinner' | 'snack')[] = ['breakfast', 'lunch', 'dinner', 'snack'];
      for (const mealType of mealTypes) {
        const foods = generatedPlan[mealType] || [];
        for (const food of foods) {
          console.log('[AIMealPlanner] adding meal plan item:', food.name, 'to', mealType);
          await addMealPlanItem(newPlan.id, {
            date: dateStr,
            meal_type: mealType,
            food_name: food.name,
            quantity: food.quantity || 1,
            serving_description: food.serving_description || '1 serving',
            calories: food.calories || 0,
            protein: food.protein || 0,
            carbs: food.carbs || 0,
            fats: food.fats || 0,
            fiber: food.fiber || 0,
            grams: null,
          });
        }
      }

      console.log('[AIMealPlanner] all items saved, navigating to plan detail:', newPlan.id);
      setNameModalVisible(false);
      router.replace({ pathname: '/meal-plan-detail', params: { planId: newPlan.id } });
    } catch (e: any) {
      console.error('[AIMealPlanner] handleSavePlan error:', e?.message || e);
      Alert.alert('Error', 'Failed to save plan. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenNameModal = () => {
    console.log('[AIMealPlanner] Save This Plan button pressed');
    setPlanName('');
    setNameModalVisible(true);
  };

  const handleBackPress = () => {
    console.log('[AIMealPlanner] back button pressed');
    router.back();
  };

  const formatTime = (ts: number) => {
    try {
      return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  const sendBtnActive = inputText.trim().length > 0 && !loading;
  const sendBtnBg = sendBtnActive ? '#14B8A6' : (isDark ? '#3C3C3E' : '#D1D5DB');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? colors.borderDark : colors.border }]}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backBtn}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="arrow_back" size={24} color={textColor} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <IconSymbol ios_icon_name="sparkles" android_material_icon_name="auto_awesome" size={20} color="#14B8A6" />
          <Text style={[styles.headerTitle, { color: textColor }]}>AI Meal Planner</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.lg }}
          showsVerticalScrollIndicator={false}
        >
          {/* Intro card if no messages yet */}
          {messages.length === 0 && !loading && (
            <View style={[styles.introCard, { backgroundColor: cardBg }]}>
              <Text style={styles.introEmoji}>✨</Text>
              <Text style={[styles.introTitle, { color: textColor }]}>AI Meal Planner</Text>
              <Text style={[styles.introSubtitle, { color: secondaryColor }]}>
                I'll create a personalized meal plan based on your macro goals. You can ask me to swap foods, adjust portions, or change anything you don't like.
              </Text>
              {userGoals && (
                <View style={[styles.goalsRow, { backgroundColor: isDark ? '#2C2C2E' : '#F5F5F5' }]}>
                  <Text style={[styles.goalChip, { color: '#14B8A6' }]}>{userGoals.daily_calories} kcal</Text>
                  <Text style={[styles.goalChip, { color: '#3B82F6' }]}>{userGoals.daily_protein}g P</Text>
                  <Text style={[styles.goalChip, { color: '#F59E0B' }]}>{userGoals.daily_carbs}g C</Text>
                  <Text style={[styles.goalChip, { color: '#EF4444' }]}>{userGoals.daily_fats}g F</Text>
                </View>
              )}
            </View>
          )}

          {/* Messages */}
          {messages.map(msg => {
            const isUser = msg.role === 'user';
            const bubbleBg = isUser ? '#14B8A6' : cardBg;
            const bubbleTextColor = isUser ? '#fff' : textColor;
            const timeColor = isUser ? 'rgba(255,255,255,0.6)' : secondaryColor;
            const timeDisplay = formatTime(msg.timestamp);
            return (
              <View
                key={msg.id}
                style={[styles.msgWrapper, isUser ? styles.userWrapper : styles.assistantWrapper]}
              >
                <View style={[styles.bubble, { backgroundColor: bubbleBg }]}>
                  <Text style={[styles.bubbleText, { color: bubbleTextColor }]}>{msg.content}</Text>
                  <Text style={[styles.bubbleTime, { color: timeColor }]}>{timeDisplay}</Text>
                </View>
              </View>
            );
          })}

          {/* Loading indicator */}
          {loading && (
            <View style={styles.assistantWrapper}>
              <View style={[styles.bubble, { backgroundColor: cardBg }]}>
                <ActivityIndicator size="small" color="#14B8A6" />
                <Text style={[styles.bubbleText, { color: secondaryColor, marginTop: 4 }]}>Creating your plan...</Text>
              </View>
            </View>
          )}

          {/* Save Plan button — appears when AI is ready */}
          {generatedPlan && !loading && (
            <TouchableOpacity
              style={styles.savePlanBtn}
              onPress={handleOpenNameModal}
              activeOpacity={0.8}
            >
              <IconSymbol ios_icon_name="checkmark.circle.fill" android_material_icon_name="check_circle" size={22} color="#fff" />
              <Text style={styles.savePlanBtnText}>Save This Plan</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Input bar */}
        <View style={[styles.inputBar, { backgroundColor: cardBg, borderTopColor: isDark ? colors.borderDark : colors.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: isDark ? '#2C2C2E' : '#F5F5F5', color: textColor }]}
            placeholder={generatedPlan ? 'Ask for changes or say "save"...' : 'Tell me your preferences...'}
            placeholderTextColor={secondaryColor}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            editable={!loading}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: sendBtnBg }]}
            onPress={handleSend}
            disabled={!sendBtnActive}
          >
            <IconSymbol ios_icon_name="arrow.up" android_material_icon_name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Name modal */}
      <Modal
        visible={nameModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNameModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setNameModalVisible(false)}
        />
        <View style={[styles.nameModal, { backgroundColor: isDark ? '#1C1C1E' : '#fff' }]}>
          <View style={styles.modalHandle} />
          <Text style={[styles.modalTitle, { color: textColor }]}>Name Your Plan</Text>
          {planSummary && (
            <Text style={[styles.modalSummary, { color: secondaryColor }]}>{planSummary}</Text>
          )}
          <Text style={[styles.modalLabel, { color: secondaryColor }]}>PLAN NAME</Text>
          <TextInput
            style={[styles.modalInput, { backgroundColor: isDark ? '#2C2C2E' : '#F5F5F5', color: textColor }]}
            value={planName}
            onChangeText={setPlanName}
            placeholder="e.g. Week 1 Bulk"
            placeholderTextColor={secondaryColor}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSavePlan}
          />
          <TouchableOpacity
            style={[styles.modalSaveBtn, { opacity: saving || !planName.trim() ? 0.5 : 1 }]}
            onPress={handleSavePlan}
            disabled={saving || !planName.trim()}
            activeOpacity={0.8}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.modalSaveBtnText}>Save Plan</Text>
            }
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: spacing.xs, width: 40 },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { ...(typography as any).h3, fontSize: 17, fontWeight: '600' },
  introCard: { borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16 },
  introEmoji: { fontSize: 32, marginBottom: 12 },
  introTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  introSubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 16 },
  goalsRow: { flexDirection: 'row', gap: 8, borderRadius: 10, padding: 10 },
  goalChip: { fontSize: 13, fontWeight: '700' },
  msgWrapper: { marginBottom: 12, maxWidth: '82%' },
  userWrapper: { alignSelf: 'flex-end' },
  assistantWrapper: { alignSelf: 'flex-start' },
  bubble: { borderRadius: 16, padding: 12 },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTime: { fontSize: 11, marginTop: 4, textAlign: 'right' },
  savePlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#14B8A6',
  },
  savePlanBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  nameModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  modalSummary: { fontSize: 13, marginBottom: 16, lineHeight: 18 },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  modalInput: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  modalSaveBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#14B8A6',
  },
  modalSaveBtnText: { fontSize: 17, fontWeight: '600', color: '#fff' },
});
