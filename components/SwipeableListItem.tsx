
import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { IconSymbol } from './IconSymbol';
import { colors, spacing, borderRadius } from '@/styles/commonStyles';
import { useColorScheme } from '@/hooks/useColorScheme';

interface SwipeableListItemProps {
  children: ReactNode;
  onDelete: () => void;
  deleteButtonText?: string;
  deleteButtonColor?: string;
}

const SWIPE_THRESHOLD = -80;
const DELETE_BUTTON_WIDTH = 80;

export default function SwipeableListItem({
  children,
  onDelete,
  deleteButtonText = 'Delete',
  deleteButtonColor = colors.error,
}: SwipeableListItemProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const translateX = useSharedValue(0);
  const isDeleting = useSharedValue(false);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      // Only allow swiping left (negative translation)
      if (event.translationX < 0) {
        translateX.value = Math.max(event.translationX, -DELETE_BUTTON_WIDTH);
      } else if (translateX.value < 0) {
        // Allow swiping back to close
        translateX.value = Math.min(0, translateX.value + event.translationX);
      }
    })
    .onEnd((event) => {
      if (translateX.value < SWIPE_THRESHOLD) {
        // Swipe threshold reached, show delete button
        translateX.value = withSpring(-DELETE_BUTTON_WIDTH, {
          damping: 20,
          stiffness: 90,
        });
      } else {
        // Snap back to closed position
        translateX.value = withSpring(0, {
          damping: 20,
          stiffness: 90,
        });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const deleteButtonStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < -10 ? 1 : 0,
  }));

  const handleDelete = () => {
    // Animate out before deleting
    translateX.value = withSpring(-300, {
      damping: 20,
      stiffness: 90,
    }, () => {
      runOnJS(onDelete)();
    });
  };

  return (
    <View style={styles.container}>
      {/* Delete button (behind the item) */}
      <Animated.View style={[styles.deleteButtonContainer, deleteButtonStyle]}>
        <TouchableOpacity
          style={[styles.deleteButton, { backgroundColor: deleteButtonColor }]}
          onPress={handleDelete}
          activeOpacity={0.7}
        >
          <IconSymbol
            ios_icon_name="trash.fill"
            android_material_icon_name="delete"
            size={24}
            color="#FFFFFF"
          />
          <Text style={styles.deleteButtonText}>{deleteButtonText}</Text>
        </TouchableOpacity>
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
    overflow: 'hidden',
  },
  deleteButtonContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_BUTTON_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    backgroundColor: 'transparent',
  },
});
