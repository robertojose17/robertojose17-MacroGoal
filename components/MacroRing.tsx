import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { COLORS } from '@/constants/Colors';

interface MacroRingProps {
  calories: number;
  calorieGoal: number;
  size?: number;
}

export function MacroRing({ calories, calorieGoal, size = 140 }: MacroRingProps) {
  const safeGoal = calorieGoal > 0 ? calorieGoal : 1;
  const safeCalories = Number(calories) || 0;
  const pct = Math.min(safeCalories / safeGoal, 1);
  const remaining = Math.max(safeGoal - safeCalories, 0);
  const caloriesDisplay = Math.round(safeCalories);
  const remainingDisplay = Math.round(remaining);
  const pctDisplay = Math.round(pct * 100);

  const animWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animWidth, {
      toValue: pct,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [pct, animWidth]);

  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', width: size, height: size }}>
      {/* Background ring */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: COLORS.surfaceSecondary,
        }}
      />
      {/* Progress arc using border trick */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: 'transparent',
          borderTopColor: pct > 0 ? COLORS.primary : 'transparent',
          borderRightColor: pct > 0.25 ? COLORS.primary : 'transparent',
          borderBottomColor: pct > 0.5 ? COLORS.primary : 'transparent',
          borderLeftColor: pct > 0.75 ? COLORS.primary : 'transparent',
          transform: [{ rotate: '-90deg' }],
        }}
      />
      {/* Center content */}
      <View style={{ alignItems: 'center' }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: '700',
            color: COLORS.text,
            letterSpacing: -0.5,
          }}
        >
          {caloriesDisplay}
        </Text>
        <Text style={{ fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' }}>
          kcal eaten
        </Text>
        <Text style={{ fontSize: 13, color: COLORS.primary, fontWeight: '600', marginTop: 2 }}>
          {remainingDisplay} left
        </Text>
      </View>
    </View>
  );
}
