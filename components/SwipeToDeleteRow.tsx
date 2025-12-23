
import React, { ReactNode, useCallback, useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { colors } from '@/styles/commonStyles';

interface SwipeToDeleteRowProps {
  children: ReactNode;
  onDelete: () => void;
}

const SWIPE_THRESHOLD = -100;
const DELETE_BUTTON_WIDTH = 80;

export default function SwipeToDeleteRow({
  children,
  onDelete,
}: SwipeToDeleteRowProps) {
  const translateX = useSharedValue(0);
  const isDeleting = useRef(false);

  const handleDelete = useCallback(() => {
    if (isDeleting.current) return;
    isDeleting.current = true;
    console.log('[SwipeToDeleteRow] 🗑️ Delete triggered - calling onDelete');
    onDelete();
  }, [onDelete]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-5, 5])
    .failOffsetY([-15, 15])
    .onUpdate((event) => {
      'worklet';
      if (isDeleting.current) return;
      
      // Only allow left swipe
      if (event.translationX < 0) {
        translateX.value = Math.max(event.translationX, -DELETE_BUTTON_WIDTH);
      } else {
        translateX.value = 0;
      }
    })
    .onEnd((event) => {
      'worklet';
      if (isDeleting.current) return;
      
      const translation = translateX.value;
      const velocity = event.velocityX;
      
      // Trigger delete if swiped far enough or fast enough
      if (translation < SWIPE_THRESHOLD || velocity < -800) {
        console.log('[SwipeToDeleteRow] ✅ Swipe threshold reached - deleting');
        runOnJS(handleDelete)();
      } else {
        // Snap back if not deleted
        translateX.value = withTiming(0, {
          duration: 250,
          easing: Easing.out(Easing.ease),
        });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const deleteButtonStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < -20 ? 1 : 0,
  }));

  return (
    <View style={styles.container}>
      {/* Delete button background */}
      <Animated.View style={[styles.deleteButton, deleteButtonStyle]}>
        <Text style={styles.deleteText}>Delete</Text>
      </Animated.View>
      
      {/* Swipeable content */}
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
    position: 'relative',
    width: '100%',
  },
  content: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  deleteButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_BUTTON_WIDTH,
    backgroundColor: colors.error || '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
