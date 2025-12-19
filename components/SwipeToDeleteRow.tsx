
import React, { ReactNode, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

interface SwipeToDeleteRowProps {
  children: ReactNode;
  onDelete: () => void;
}

const SWIPE_THRESHOLD = 80; // Swipe right 80px to trigger delete
const ANIMATION_DURATION = 200; // Fast animation

export default function SwipeToDeleteRow({
  children,
  onDelete,
}: SwipeToDeleteRowProps) {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const isDeleting = useSharedValue(false);

  // Memoize delete handler to prevent recreation
  const handleDelete = useCallback(() => {
    'worklet';
    if (isDeleting.value) return;
    isDeleting.value = true;
    
    // Animate out
    opacity.value = withTiming(0, {
      duration: ANIMATION_DURATION,
      easing: Easing.out(Easing.ease),
    });
    
    // Call delete after animation
    setTimeout(() => {
      runOnJS(onDelete)();
    }, ANIMATION_DURATION);
  }, [onDelete]);

  // Pan gesture - swipe RIGHT to delete
  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      'worklet';
      if (isDeleting.value) return;
      
      // Only allow RIGHT swipe (positive translation)
      if (event.translationX > 0) {
        translateX.value = Math.min(event.translationX, 200);
      } else {
        translateX.value = 0;
      }
    })
    .onEnd((event) => {
      'worklet';
      if (isDeleting.value) return;
      
      const translation = translateX.value;
      const velocity = event.velocityX;
      
      // If swiped right past threshold OR fast swipe right, delete immediately
      if (translation > SWIPE_THRESHOLD || velocity > 500) {
        handleDelete();
      } else {
        // Not past threshold: snap back
        translateX.value = withTiming(0, {
          duration: 150,
          easing: Easing.out(Easing.ease),
        });
      }
    });

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }), []);

  return (
    <View style={styles.container}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.content, animatedStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  content: {
    width: '100%',
  },
});
