
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
const ANIMATION_DURATION = 150; // Very fast animation for instant feel

export default function SwipeableListItem({
  children,
  onDelete,
}: SwipeableListItemProps) {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const isDeleting = useRef(false);

  // Memoize delete handler to prevent recreation
  const handleDelete = useCallback(() => {
    if (isDeleting.current) return;
    isDeleting.current = true;
    
    console.log('[SwipeableListItem] Delete triggered');
    
    // Call delete immediately for instant feel
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
      
      // If swiped left past threshold OR fast swipe left, delete immediately
      if (translation < SWIPE_THRESHOLD || velocity < -500) {
        // Animate out quickly
        opacity.value = withTiming(0, {
          duration: ANIMATION_DURATION,
          easing: Easing.out(Easing.ease),
        });
        translateX.value = withTiming(-300, {
          duration: ANIMATION_DURATION,
          easing: Easing.out(Easing.ease),
        });
        
        // Trigger delete immediately (don't wait for animation)
        runOnJS(handleDelete)();
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
  }));

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
