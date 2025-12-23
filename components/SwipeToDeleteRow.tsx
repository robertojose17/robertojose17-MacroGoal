
import React, { ReactNode, useCallback, useRef } from 'react';
import { StyleSheet } from 'react-native';
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

const SWIPE_THRESHOLD = -80;

export default function SwipeToDeleteRow({
  children,
  onDelete,
}: SwipeToDeleteRowProps) {
  const translateX = useSharedValue(0);
  const isDeleting = useRef(false);

  const handleDelete = useCallback(() => {
    if (isDeleting.current) return;
    isDeleting.current = true;
    console.log('[SwipeToDeleteRow] Delete triggered - calling onDelete IMMEDIATELY');
    // Call onDelete IMMEDIATELY - no delays, no animations
    onDelete();
  }, [onDelete]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onUpdate((event) => {
      'worklet';
      if (isDeleting.current) return;
      
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
      
      if (translation < SWIPE_THRESHOLD || velocity < -500) {
        console.log('[SwipeToDeleteRow] Swipe threshold reached - deleting IMMEDIATELY');
        // Delete IMMEDIATELY - no animation delay
        runOnJS(handleDelete)();
      } else {
        // Only animate back if NOT deleting
        translateX.value = withTiming(0, {
          duration: 200,
          easing: Easing.out(Easing.ease),
        });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
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
