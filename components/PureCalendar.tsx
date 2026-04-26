import React from 'react';
import { View, Text } from 'react-native';

interface Props {
  assignments: Record<string, string>;
  planColors: Record<string, string>;
  onDayPress: (dateStr: string) => void;
  isDark: boolean;
}

export default function PureCalendar(_props: Props) {
  return (
    <View>
      <Text>Calendar not available on this platform.</Text>
    </View>
  );
}
