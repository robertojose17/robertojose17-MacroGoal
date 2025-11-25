
import React from 'react';
import { View, StyleSheet } from 'react-native';

interface MacroBarProps {
  progress: number;
  color: string;
  backgroundColor: string;
}

export function MacroBar({ progress, color, backgroundColor }: MacroBarProps) {
  return (
    <View style={[styles.barBackground, { backgroundColor }]}>
      <View
        style={[
          styles.barFill,
          {
            width: `${Math.min(progress, 100)}%`,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  barBackground: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
});
