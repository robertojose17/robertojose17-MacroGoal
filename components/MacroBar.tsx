import React from 'react';
import { View, Text } from 'react-native';
import { COLORS } from '@/constants/Colors';

interface MacroBarProps {
  label: string;
  value: number;
  goal: number;
  color: string;
  unit?: string;
}

export function MacroBar({ label, value, goal, color, unit = 'g' }: MacroBarProps) {
  const safeGoal = goal > 0 ? goal : 1;
  const safeValue = Number(value) || 0;
  const pct = Math.min(safeValue / safeGoal, 1);
  const pctDisplay = Math.round(pct * 100);
  const valueDisplay = Math.round(safeValue);
  const goalDisplay = Math.round(safeGoal);

  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.text }}>{label}</Text>
        <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>
          {valueDisplay}{unit} / {goalDisplay}{unit}
        </Text>
      </View>
      <View
        style={{
          height: 8,
          backgroundColor: COLORS.surfaceSecondary,
          borderRadius: 4,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${pctDisplay}%`,
            backgroundColor: color,
            borderRadius: 4,
          }}
        />
      </View>
    </View>
  );
}
