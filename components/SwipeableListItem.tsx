
import React, { ReactNode, useCallback, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

interface SwipeableListItemProps {
  children: ReactNode;
  onDelete: () => void;
}

const SWIPE_THRESHOLD = -80; // Swipe LEFT 80px to trigger delete (negative value)
const ANIMATION_DURATION = 150; // Fast animation for responsive feel

export default function SwipeableListItem({
  children,
  onDelete,
}: SwipeableListItemProps) {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const isDeleting = useRef(false);

  // Memoize delete handler to prevent recreation
  const handleDelete = useCallback(() => {
    if (isDeleting.current) return;
    isDeleting.current = true;
    
    console.log('[SwipeableListItem] Delete triggered');
    
    // Call delete immediately for instant database update
    onDelete();
  }, [onDelete]);

  // Pan gesture - swipe LEFT to delete
  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      'worklet';
      if (isDeleting.current) return;
      
      // Only allow LEFT swipe (negative translation)
      if (event.translationX < 0) {
        translateX.value = Math.max(event.translationX, -200);
      } else {
        translateX.value = 0;
      }
    })
    .onEnd((event) => {
      'worklet';
      if (isDeleting.current) return;
      
      const translation = translateX.value;
      const velocity = event.velocityX;
      
      // If swiped left past threshold OR fast swipe left, delete
      if (translation < SWIPE_THRESHOLD || velocity < -500) {
        // Animate out: slide left, fade out, and scale down
        translateX.value = withTiming(-400, {
          duration: ANIMATION_DURATION,
          easing: Easing.out(Easing.ease),
        });
        opacity.value = withTiming(0, {
          duration: ANIMATION_DURATION,
          easing: Easing.out(Easing.ease),
        });
        scale.value = withTiming(0.8, {
          duration: ANIMATION_DURATION,
          easing: Easing.out(Easing.ease),
        });
        
        // Trigger delete immediately (don't wait for animation)
        runOnJS(handleDelete)();
      } else {
        // Not past threshold: snap back
        translateX.value = withTiming(0, {
          duration: 200,
          easing: Easing.out(Easing.ease),
        });
      }
    });

  // Animated styles
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.content, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
  },
});
