
import React, { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';

interface SwipeToDeleteRowProps {
  children: ReactNode | ((isSwiping: boolean) => ReactNode);
  onDelete: () => void;
}

// Web stub — swipe-to-delete is not supported on web.
// Children always receive isSwiping=false.
export default function SwipeToDeleteRow({ children }: SwipeToDeleteRowProps) {
  return (
    <View style={styles.content}>
      {typeof children === 'function' ? children(false) : children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    width: '100%',
  },
});
