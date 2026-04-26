import React from 'react';
import { View } from 'react-native';

interface Props {
  assignments: Record<string, string>;
  planColors: Record<string, string>;
  onDayPress: (dateStr: string) => void;
  isDark: boolean;
}

// Web/fallback stub — full implementation lives in PureCalendar.native.tsx
export default function PureCalendar(_props: Props) {
  return <View />;
}
