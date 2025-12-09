
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface AudioWaveformProps {
  isRecording: boolean;
  audioLevel?: number; // 0 to 1, representing audio input level
  color?: string;
  barCount?: number;
}

export function AudioWaveform({ 
  isRecording, 
  audioLevel = 0.5, 
  color = '#007AFF', 
  barCount = 5 
}: AudioWaveformProps) {
  const bars = Array.from({ length: barCount }, (_, i) => i);

  return (
    <View style={styles.container}>
      {bars.map((index) => (
        <AnimatedBar 
          key={index} 
          isRecording={isRecording} 
          audioLevel={audioLevel}
          color={color} 
          delay={index * 50} 
        />
      ))}
    </View>
  );
}

interface AnimatedBarProps {
  isRecording: boolean;
  audioLevel: number;
  color: string;
  delay: number;
}

function AnimatedBar({ isRecording, audioLevel, color, delay }: AnimatedBarProps) {
  const height = useSharedValue(8);

  useEffect(() => {
    if (isRecording) {
      // Calculate target height based on audio level
      // Map audioLevel (0-1) to height range (8-28)
      const minHeight = 8;
      const maxHeight = 28;
      const targetHeight = minHeight + (audioLevel * (maxHeight - minHeight));
      
      // Animate to target height with spring for natural feel
      height.value = withSpring(targetHeight, {
        damping: 10,
        stiffness: 100,
        mass: 0.5,
      });
    } else {
      // Reset to minimum height when not recording
      height.value = withTiming(8, { duration: 200 });
    }
  }, [isRecording, audioLevel]);

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
