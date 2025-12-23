
import React, { ReactNode, useCallback } from 'react';
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
  const isDeleting = useSharedValue(false);

  const handleDelete = useCallback(() => {
    console.log('[SwipeToDeleteRow] 🗑️ Delete button pressed - calling onDelete');
    onDelete();
  }, [onDelete]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .onStart(() => {
      'worklet';
      console.log('[SwipeToDeleteRow] 👆 Pan gesture started');
    })
    .onUpdate((event) => {
      'worklet';
      if (isDeleting.value) return;
      
      // Only allow left swipe (negative translation)
      if (event.translationX < 0) {
        translateX.value = Math.max(event.translationX, -DELETE_BUTTON_WIDTH);
      } else {
        translateX.value = 0;
      }
    })
    .onEnd((event) => {
      'worklet';
      if (isDeleting.value) return;
      
      const translation = translateX.value;
      const velocity = event.velocityX;
      
      console.log('[SwipeToDeleteRow] 📊 Gesture ended - translation:', translation, 'velocity:', velocity);
      
      // If swiped far enough or fast enough, show delete button
      if (translation < SWIPE_THRESHOLD || velocity < -500) {
        console.log('[SwipeToDeleteRow] ✅ Threshold reached - showing delete button');
        translateX.value = withTiming(-DELETE_BUTTON_WIDTH, {
          duration: 200,
          easing: Easing.out(Easing.ease),
        });
      } else {
        // Otherwise, snap back
        console.log('[SwipeToDeleteRow] ↩️ Snapping back');
        translateX.value = withTiming(0, {
          duration: 200,
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
      {/* Delete Button (behind the content) */}
      <Animated.View style={[styles.deleteButton, deleteButtonStyle]}>
        <Text style={styles.deleteButtonText}>Delete</Text>
      </Animated.View>

      {/* Swipeable Content */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.content, animatedStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>

      {/* Invisible Delete Trigger Area */}
      <Animated.View 
        style={[styles.deleteTrigger, deleteButtonStyle]}
        onTouchEnd={() => {
          console.log('[SwipeToDeleteRow] 🎯 Delete trigger touched');
          isDeleting.value = true;
          translateX.value = withTiming(0, {
            duration: 200,
            easing: Easing.out(Easing.ease),
          });
          handleDelete();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
    marginBottom: 0,
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
    width: 80,
    backgroundColor: colors.error || '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteTrigger: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    zIndex: 10,
  },
});
