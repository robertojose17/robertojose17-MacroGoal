
import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';

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
  const currentX = useRef(0);
  const [isSwiping, setIsSwiping] = useState(false);

  // Store latest onDelete in a ref so PanResponder (created once) always calls the latest version
  const onDeleteRef = useRef(onDelete);
  useEffect(() => {
    onDeleteRef.current = onDelete;
  }, [onDelete]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState;
        // Require clearly horizontal swipe to avoid conflicting with ScrollView
        return Math.abs(dx) > 5 && Math.abs(dx) > Math.abs(dy) * 2;
      },
      onPanResponderGrant: () => {
        console.log('[SwipeToDeleteRow] Gesture started');
        currentX.current = 0;
        translateX.setValue(0);
        setIsSwiping(true);
      },
      onPanResponderMove: (_, gestureState) => {
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
        const translation = currentX.current;
        const velocity = gestureState.vx * 1000;

        if (translation < SWIPE_THRESHOLD || velocity < -500) {
          console.log('[SwipeToDeleteRow] Swipe threshold met — calling onDelete immediately');
          onDeleteRef.current();
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
        if (currentX.current < SWIPE_THRESHOLD) {
          onDeleteRef.current();
        } else {
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
    <View style={styles.container}>
      {/* Red delete background revealed as the row slides left */}
      <View style={styles.deleteBackground}>
        <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
      </View>

      <Animated.View style={[styles.content, animatedStyle]} {...panResponder.panHandlers}>
        {typeof children === 'function' ? children(isSwiping) : children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    width: '100%',
  },
  deleteBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FF3B30',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 20,
  },
  content: {
    width: '100%',
  },
});
