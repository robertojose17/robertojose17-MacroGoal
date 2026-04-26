import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { IconSymbol } from '@/components/IconSymbol';

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEK_DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── PureCalendar ─────────────────────────────────────────────────────────────

interface PureCalendarProps {
  isDark: boolean;
}

export default function PureCalendar({ isDark }: PureCalendarProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const bg = isDark ? '#1C1C1E' : '#FFFFFF';
  const textColor = isDark ? '#FFFFFF' : '#000000';
  const subColor = isDark ? '#8E8E93' : '#6B7280';
  const chevronColor = isDark ? '#FFFFFF' : '#000000';

  const todayD = new Date();
  const todayYear = todayD.getFullYear();
  const todayMonth = todayD.getMonth();
  const todayDate = todayD.getDate();
  const todayStr = `${todayYear}-${String(todayMonth + 1).padStart(2, '0')}-${String(todayDate).padStart(2, '0')}`;

  const handlePrev = () => {
    console.log('[PureCalendar] Prev month pressed');
    if (month === 0) {
      setMonth(11);
      setYear(y => y - 1);
    } else {
      setMonth(m => m - 1);
    }
  };

  const handleNext = () => {
    console.log('[PureCalendar] Next month pressed');
    if (month === 11) {
      setMonth(0);
      setYear(y => y + 1);
    } else {
      setMonth(m => m + 1);
    }
  };

  const firstDow = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const monthLabel = `${MONTH_NAMES[month]} ${year}`;

  return (
    <View style={{ backgroundColor: bg, borderRadius: 16, padding: 16, marginBottom: 16 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <TouchableOpacity onPress={handlePrev} style={{ padding: 8 }} activeOpacity={0.7}>
          <IconSymbol ios_icon_name="chevron.left" android_material_icon_name="chevron-left" size={18} color={chevronColor} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '700', color: textColor }}>{monthLabel}</Text>
        <TouchableOpacity onPress={handleNext} style={{ padding: 8 }} activeOpacity={0.7}>
          <IconSymbol ios_icon_name="chevron.right" android_material_icon_name="chevron-right" size={18} color={chevronColor} />
        </TouchableOpacity>
      </View>

      {/* Day-of-week headers */}
      <View style={{ flexDirection: 'row', marginBottom: 4 }}>
        {WEEK_DAYS_SHORT.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '600', color: subColor }}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Day grid */}
      {weeks.map((week, ri) => (
        <View key={ri} style={{ flexDirection: 'row' }}>
          {week.map((day, ci) => {
            if (!day) {
              return <View key={ci} style={{ flex: 1, height: 40 }} />;
            }
            const mm = String(month + 1).padStart(2, '0');
            const dd = String(day).padStart(2, '0');
            const dateStr = `${year}-${mm}-${dd}`;
            const isToday = dateStr === todayStr;
            const dayBg = isToday ? '#14B8A6' : 'transparent';
            const dayFontWeight = isToday ? '700' : '400';
            const dayColor = isToday ? '#FFFFFF' : textColor;
            return (
              <View key={ci} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', height: 40 }}>
                <View style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: dayBg,
                }}>
                  <Text style={{ fontSize: 14, fontWeight: dayFontWeight, color: dayColor }}>
                    {day}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
