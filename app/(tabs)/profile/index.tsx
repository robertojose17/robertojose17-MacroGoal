import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { COLORS } from '@/constants/Colors';
import { apiGet } from '@/utils/api';
import { Goals } from '@/types';
import {
  User,
  Target,
  UtensilsCrossed,
  ChefHat,
  Bot,
  MessageCircle,
  LogOut,
  ChevronRight,
  Edit,
} from 'lucide-react-native';

const SUPABASE_URL = 'https://esgptfiofoaeguslgvcq.supabase.co';
const API_BASE = `${SUPABASE_URL}/functions/v1`;

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [goals, setGoals] = useState<Goals | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchGoals = useCallback(async () => {
    console.log('[Profile] Fetching goals');
    try {
      const data = await apiGet<Goals>(`${API_BASE}/api/goals`);
      setGoals(data);
    } catch (err) {
      console.error('[Profile] Fetch goals error:', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchGoals();
  };

  const handleSignOut = () => {
    console.log('[Profile] Sign out pressed');
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/auth-screen');
        },
      },
    ]);
  };

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() ?? 'MG';

  const nameDisplay = user?.name ?? 'User';
  const emailDisplay = user?.email ?? '';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 120 }}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
        <Text style={{ fontSize: 28, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 }}>Profile</Text>
      </View>

      {/* User Card */}
      <View
        style={{
          marginHorizontal: 20,
          backgroundColor: COLORS.surface,
          borderRadius: 20,
          padding: 20,
          marginBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
          borderWidth: 1,
          borderColor: COLORS.border,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}
      >
        <View
          style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: COLORS.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.primary }}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text }}>{nameDisplay}</Text>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary, marginTop: 2 }}>{emailDisplay}</Text>
        </View>
      </View>

      {/* Goals Section */}
      <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text }}>Macro Goals</Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[Profile] Edit goals pressed');
              router.push('/edit-goals');
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: COLORS.primaryMuted,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 6,
            }}
          >
            <Edit size={14} color={COLORS.primary} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.primary }}>Edit</Text>
          </AnimatedPressable>
        </View>
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          {goals ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {[
                { label: 'Calories', value: `${goals.calories}`, unit: 'kcal', color: COLORS.primary },
                { label: 'Protein', value: `${goals.protein}`, unit: 'g', color: COLORS.protein },
                { label: 'Carbs', value: `${goals.carbs}`, unit: 'g', color: COLORS.carbs },
                { label: 'Fat', value: `${goals.fat}`, unit: 'g', color: COLORS.fat },
              ].map(item => (
                <View key={item.label} style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 20, fontWeight: '700', color: item.color }}>{item.value}</Text>
                  <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>{item.unit}</Text>
                  <Text style={{ fontSize: 11, color: COLORS.textTertiary }}>{item.label}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={{ color: COLORS.textSecondary, textAlign: 'center' }}>Loading goals...</Text>
          )}
        </View>
      </View>

      {/* Tools Section */}
      <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 10 }}>Tools</Text>
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            overflow: 'hidden',
          }}
        >
          {[
            { label: 'My Foods', icon: <UtensilsCrossed size={20} color={COLORS.primary} />, route: '/my-foods' },
            { label: 'My Meals', icon: <ChefHat size={20} color={COLORS.accent} />, route: '/my-meals' },
            { label: 'AI Meal Estimator', icon: <Bot size={20} color={COLORS.warning} />, route: '/ai-meal-estimator' },
            { label: 'Nutritionist Chatbot', icon: <MessageCircle size={20} color={COLORS.textSecondary} />, route: '/chatbot' },
          ].map((item, idx) => (
            <AnimatedPressable
              key={item.label}
              onPress={() => {
                console.log('[Profile] Tool pressed:', item.label);
                router.push(item.route as never);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                borderTopWidth: idx > 0 ? 1 : 0,
                borderTopColor: COLORS.divider,
                gap: 12,
              }}
            >
              {item.icon}
              <Text style={{ flex: 1, fontSize: 15, color: COLORS.text, fontWeight: '500' }}>{item.label}</Text>
              <ChevronRight size={18} color={COLORS.textTertiary} />
            </AnimatedPressable>
          ))}
        </View>
      </View>

      {/* Account Section */}
      <View style={{ marginHorizontal: 20, marginBottom: 16 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 10 }}>Account</Text>
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            overflow: 'hidden',
          }}
        >
          <AnimatedPressable
            onPress={handleSignOut}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              gap: 12,
            }}
          >
            <LogOut size={20} color={COLORS.danger} />
            <Text style={{ flex: 1, fontSize: 15, color: COLORS.danger, fontWeight: '500' }}>Sign Out</Text>
          </AnimatedPressable>
        </View>
      </View>
    </ScrollView>
  );
}
