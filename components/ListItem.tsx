import React, { useRef } from "react";
import * as Haptics from "expo-haptics";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  useColorScheme,
  View,
  Text,
} from "react-native";
import { appleRed, borderColor } from "@/constants/Colors";
import { IconCircle } from "./IconCircle";
import { IconSymbol } from "./IconSymbol";

const DELETE_WIDTH = 200;
const SWIPE_THRESHOLD = -80;

export default function ListItem({ listId }: { listId: string }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const translateX = useRef(new Animated.Value(0)).current;
  const currentX = useRef(0);
  const isDeleting = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const { dx, dy } = gestureState;
        return Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy);
      },
      onPanResponderGrant: () => {
        currentX.current = 0;
        translateX.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        if (isDeleting.current) return;
        const dx = gestureState.dx;
        if (dx < 0) {
          const clamped = Math.max(dx, -DELETE_WIDTH);
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
          Animated.timing(translateX, {
            toValue: -DELETE_WIDTH,
            duration: 150,
            useNativeDriver: true,
          }).start();
        } else {
          Animated.timing(translateX, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            currentX.current = 0;
          });
        }
      },
      onPanResponderTerminate: () => {
        Animated.timing(translateX, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          currentX.current = 0;
        });
      },
    })
  ).current;

  const handleDelete = () => {
    if (process.env.EXPO_OS === "ios") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    console.log("[ListItem] Delete pressed for:", listId);
  };

  return (
    <View style={styles.rowContainer}>
      {/* Delete action revealed behind */}
      <View style={styles.rightActionContainer}>
        <Pressable onPress={handleDelete} style={styles.rightAction}>
          <IconSymbol
            ios_icon_name="trash.fill"
            android_material_icon_name="delete"
            size={24}
            color="white"
          />
        </Pressable>
      </View>

      {/* Swipeable row */}
      <Animated.View
        style={[
          styles.listItemContainer,
          { backgroundColor: isDark ? "#1c1c1e" : "#ffffff" },
          { transform: [{ translateX }] },
        ]}
        {...panResponder.panHandlers}
      >
        <Text
          style={[
            styles.listItemText,
            { color: isDark ? "#FFFFFF" : "#000000" },
          ]}
        >
          {listId}
        </Text>
      </Animated.View>
    </View>
  );
}

export const NicknameCircle = ({
  nickname,
  color,
  index = 0,
  isEllipsis = false,
}: {
  nickname: string;
  color: string;
  index?: number;
  isEllipsis?: boolean;
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Text
      style={[
        styles.nicknameCircle,
        isEllipsis && styles.ellipsisCircle,
        {
          backgroundColor: color,
          borderColor: isDark ? "#000000" : "#ffffff",
          marginLeft: index > 0 ? -6 : 0,
        },
      ]}
    >
      {isEllipsis ? "..." : nickname[0].toUpperCase()}
    </Text>
  );
};

const styles = StyleSheet.create({
  rowContainer: {
    width: "100%",
    overflow: "hidden",
  },
  rightActionContainer: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_WIDTH,
    backgroundColor: appleRed,
    alignItems: "center",
    justifyContent: "center",
  },
  rightAction: {
    width: DELETE_WIDTH,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  listItemContainer: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: borderColor,
  },
  listItemText: {
    fontSize: 16,
  },
  swipeable: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: borderColor,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  leftContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexShrink: 1,
  },
  textContent: {
    flexShrink: 1,
  },
  productCount: {
    fontSize: 12,
    color: "gray",
  },
  rightContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  nicknameContainer: {
    flexDirection: "row",
    marginRight: 4,
  },
  nicknameCircle: {
    fontSize: 12,
    color: "white",
    borderWidth: 1,
    borderColor: "white",
    borderRadius: 16,
    padding: 1,
    width: 24,
    height: 24,
    textAlign: "center",
    lineHeight: 20,
  },
  ellipsisCircle: {
    lineHeight: 0,
    marginLeft: -6,
  },
});
