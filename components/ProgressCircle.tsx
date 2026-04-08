
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';

interface ProgressCircleProps {
  current: number;
  target: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  unit?: string;
}

export default function ProgressCircle({
  current,
  target,
  size = 120,
  strokeWidth = 10,
  color = colors.primary,
  label,
  unit = '',
}: ProgressCircleProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const rawProgress = target > 0 ? current / target : 0;
  const clampedProgress = Math.min(Math.max(rawProgress, 0), 1);
  const dashOffset = circumference - clampedProgress * circumference;

  const remaining = target - current;
  const remainingRounded = Math.round(remaining);
  const currentRounded = Math.round(current);
  const targetRounded = Math.round(target);

  const valueColor = remaining >= 0
    ? (isDark ? colors.textDark : colors.text)
    : colors.error;

  const trackColor = isDark ? colors.borderDark : colors.border;
  const labelColor = isDark ? colors.textSecondaryDark : colors.textSecondary;

  const cx = size / 2;
  const cy = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg
        width={size}
        height={size}
        style={StyleSheet.absoluteFill}
        viewBox={`0 0 ${size} ${size}`}
      >
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
        />
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90, ${cx}, ${cy})`}
        />
      </Svg>

      <View style={styles.textContainer}>
        <Text style={[styles.value, { color: valueColor }]}>
          {remainingRounded}
        </Text>
        {label ? (
          <Text style={[styles.label, { color: labelColor }]}>
            {label}
          </Text>
        ) : null}
        <View style={styles.targetRow}>
          <Text style={[styles.target, { color: labelColor }]}>
            {currentRounded}
          </Text>
          <Text style={[styles.target, { color: labelColor }]}>
            {' / '}
          </Text>
          <Text style={[styles.target, { color: labelColor }]}>
            {targetRounded}
          </Text>
          {unit ? (
            <Text style={[styles.target, { color: labelColor }]}>
              {unit}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  target: {
    fontSize: 11,
    fontWeight: '400',
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
