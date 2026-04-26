import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LABELS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

interface Props {
  assignments: Record<string, string>;   // { 'YYYY-MM-DD': planId }
  planColors: Record<string, string>;    // { planId: '#hexcolor' }
  onDayPress: (dateStr: string) => void;
  isDark: boolean;
}

export default function PureCalendar({ assignments, planColors, onDayPress, isDark }: Props) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()); // 0-indexed

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const pad = (n: number) => String(n).padStart(2, '0');

  // Build grid: array of day numbers (1-based) or null for empty cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const textColor = isDark ? '#FFFFFF' : '#000000';
  const subTextColor = isDark ? '#8E8E93' : '#6B7280';
  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';

  const monthLabel = MONTH_NAMES[month];

  return (
    <View style={[s.card, { backgroundColor: cardBg }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={prevMonth} style={s.navBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[s.navArrow, { color: '#14B8A6' }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[s.monthTitle, { color: textColor }]}>{monthLabel} {year}</Text>
        <TouchableOpacity onPress={nextMonth} style={s.navBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={[s.navArrow, { color: '#14B8A6' }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Day labels */}
      <View style={s.row}>
        {DAY_LABELS.map(d => (
          <View key={d} style={s.cell}>
            <Text style={[s.dayLabel, { color: subTextColor }]}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Grid */}
      {Array.from({ length: cells.length / 7 }, (_, rowIdx) => (
        <View key={rowIdx} style={s.row}>
          {cells.slice(rowIdx * 7, rowIdx * 7 + 7).map((day, colIdx) =>
            day == null ? (
              <View key={`empty-${rowIdx}-${colIdx}`} style={s.cell} />
            ) : (
              (() => {
                const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
                const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
                const assignedPlanId = assignments[dateStr];
                const highlightColor = assignedPlanId ? (planColors[assignedPlanId] ?? null) : null;

                const circleStyle = [
                  s.dayCircle,
                  isToday && !highlightColor ? { backgroundColor: '#14B8A620', borderWidth: 1.5, borderColor: '#14B8A6' } : null,
                  highlightColor ? { backgroundColor: highlightColor } : null,
                ];

                const dayTextColor = highlightColor ? '#FFFFFF' : isToday ? '#14B8A6' : textColor;

                return (
                  <TouchableOpacity
                    key={`day-${rowIdx}-${colIdx}`}
                    style={s.cell}
                    onPress={() => {
                      console.log('[PureCalendar] Day pressed:', dateStr);
                      onDayPress(dateStr);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={circleStyle}>
                      <Text style={[s.dayText, { color: dayTextColor }]}>
                        {day}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })()
            )
          )}
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 16, padding: 16, marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { padding: 4 },
  navArrow: { fontSize: 28, fontWeight: '300', lineHeight: 32 },
  monthTitle: { fontSize: 17, fontWeight: '700' },
  row: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  dayLabel: { fontSize: 12, fontWeight: '600' },
  dayCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 15, fontWeight: '500' },
});
