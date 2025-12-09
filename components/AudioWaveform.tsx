
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

interface AudioWaveformProps {
  isRecording: boolean;
  color?: string;
  barCount?: number;
}

export function AudioWaveform({ isRecording, color = '#007AFF', barCount = 5 }: AudioWaveformProps) {
  const bars = Array.from({ length: barCount }, (_, i) => i);

  return (
    <View style={styles.container}>
      {bars.map((index) => (
        <AnimatedBar key={index} isRecording={isRecording} color={color} delay={index * 100} />
      ))}
    </View>
  );
}

interface AnimatedBarProps {
  isRecording: boolean;
  color: string;
  delay: number;
}

function AnimatedBar({ isRecording, color, delay }: AnimatedBarProps) {
  const height = useSharedValue(8);

  useEffect(() => {
    if (isRecording) {
      // Start animation with delay for wave effect
      height.value = withSequence(
        withTiming(8, { duration: delay }),
        withRepeat(
          withSequence(
            withTiming(24, {
              duration: 300 + Math.random() * 200,
              easing: Easing.inOut(Easing.ease),
            }),
            withTiming(8, {
              duration: 300 + Math.random() * 200,
              easing: Easing.inOut(Easing.ease),
            })
          ),
          -1,
          false
        )
      );
    } else {
      // Reset to minimum height
      height.value = withTiming(8, { duration: 200 });
    }
  }, [isRecording, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        {
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 32,
  },
  bar: {
    width: 3,
    borderRadius: 2,
    minHeight: 8,
  },
});
