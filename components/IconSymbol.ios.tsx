// iOS version — uses MaterialIcons (same as base) so it works in Expo Go
// without requiring native linking for expo-symbols.

import React from "react";
import {
  OpaqueColorValue,
  StyleProp,
  TextStyle,
  ViewStyle,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export function IconSymbol({
  android_material_icon_name,
  size = 24,
  color,
  style,
}: {
  ios_icon_name?: string | undefined;
  android_material_icon_name: keyof typeof MaterialIcons.glyphMap;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
  weight?: string;
}) {
  return (
    <MaterialIcons
      color={color}
      size={size}
      name={android_material_icon_name}
      style={style as StyleProp<TextStyle>}
    />
  );
}
