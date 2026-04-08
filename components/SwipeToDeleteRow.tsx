
import React, { ReactNode, useCallback, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet } from 'react-native';

interface SwipeToDeleteRowProps {
  children: ReactNode | ((isSwiping: boolean) => ReactNode);
  onDelete: () => void;
}

const SWIPE_THRESHOLD = -80;

export default function SwipeToDeleteRow({
  children,
  onDelete,
}: SwipeToDeleteRowProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isDeleting = useRef(false);
  const currentX = useRef(0);
  const [isSwiping, setIsSwiping] = useState(false);

  const handleDelete = useCallback(() => {
    if (isDeleting.current) return;
    isDeleting.current = true;
    console.log('[SwipeToDeleteRow] Delete triggered - calling onDelete IMMEDIATELY');
    onDelete();
  }, [onDelete]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState;
        return Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy);
      },
      onPanResponderGrant: () => {
        console.log('[SwipeToDeleteRow] Gesture started - setting isSwiping = true');
        currentX.current = 0;
        translateX.setValue(0);
        setIsSwiping(true);
      },
      onPanResponderMove: (_, gestureState) => {
        if (isDeleting.current) return;
        const dx = gestureState.dx;
        if (dx < 0) {
          const clamped = Math.max(dx, -200);
          currentX.current = clamped;
          translateX.setValue(clamped);
        } else {
          currentX.current = 0;
          translateX.setValue(0);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isDeleting.current) return;
        const translation = currentX.current;
        const velocity = gestureState.vx * 1000;

        if (translation < SWIPE_THRESHOLD || velocity < -500) {
          console.log('[SwipeToDeleteRow] Swipe threshold reached - deleting IMMEDIATELY');
          handleDelete();
        } else {
          Animated.timing(translateX, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start(({ finished }) => {
            if (finished) {
              currentX.current = 0;
              setIsSwiping(false);
            }
          });
        }
      },
      onPanResponderTerminate: () => {
        if (!isDeleting.current) {
          Animated.timing(translateX, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            currentX.current = 0;
            setIsSwiping(false);
          });
        }
      },
    })
  ).current;

  const animatedStyle = {
    transform: [{ translateX }],
  };

  return (
    <Animated.View style={[styles.content, animatedStyle]} {...panResponder.panHandlers}>
      {typeof children === 'function' ? children(isSwiping) : children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
  },
});
