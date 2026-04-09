import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/Colors';
import { CheckIn } from '@/types';
import { Scale, TrendingUp, Calendar, FileText } from 'lucide-react-native';

function formatDateDisplay(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

export default function CheckInDetailsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; data: string }>();
  const checkIn: CheckIn = params.data ? JSON.parse(params.data) : null;

  if (!checkIn) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: COLORS.danger }}>Check-in data not found</Text>
      </View>
    );
  }

  const dateDisplay = formatDateDisplay(checkIn.date);
  const weightDisplay = Number(checkIn.weight).toFixed(1);
  const bodyFatDisplay = checkIn.body_fat != null ? Number(checkIn.body_fat).toFixed(1) : null;

  return (
    <>
      <Stack.Screen options={{ title: 'Check-in Details' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        {/* Date */}
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Calendar size={18} color={COLORS.primary} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary }}>Date</Text>
          </View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text }}>{dateDisplay}</Text>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
          <View
            style={{
              flex: 1,
              backgroundColor: COLORS.primaryMuted,
              borderRadius: 16,
              padding: 20,
              alignItems: 'center',
            }}
          >
            <Scale size={22} color={COLORS.primary} />
            <Text style={{ fontSize: 32, fontWeight: '800', color: COLORS.text, marginTop: 8 }}>
              {weightDisplay}
            </Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>kg</Text>
          </View>

          {bodyFatDisplay != null && (
            <View
              style={{
                flex: 1,
                backgroundColor: 'rgba(52,211,153,0.1)',
                borderRadius: 16,
                padding: 20,
                alignItems: 'center',
              }}
            >
              <TrendingUp size={22} color={COLORS.accent} />
              <Text style={{ fontSize: 32, fontWeight: '800', color: COLORS.text, marginTop: 8 }}>
                {bodyFatDisplay}
              </Text>
              <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>% body fat</Text>
            </View>
          )}
        </View>

        {/* Notes */}
        {checkIn.notes ? (
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 16,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <FileText size={16} color={COLORS.textSecondary} />
              <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textSecondary }}>Notes</Text>
            </View>
            <Text style={{ fontSize: 15, color: COLORS.text, lineHeight: 22 }}>{checkIn.notes}</Text>
          </View>
        ) : null}
      </ScrollView>
    </>
  );
}
