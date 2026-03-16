import { forwardRef } from "react";
import { ScrollView, ScrollViewProps } from "react-native";
import { useAdBanner } from "@/components/AdBannerContext";

export const BodyScrollView = forwardRef<any, ScrollViewProps>((props, ref) => {
  const { adBannerHeight } = useAdBanner();

  const existingPaddingBottom =
    (props.contentContainerStyle as any)?.paddingBottom ?? 0;
  const totalPaddingBottom = existingPaddingBottom + adBannerHeight;

  return (
    <ScrollView
      automaticallyAdjustsScrollIndicatorInsets
      contentInsetAdjustmentBehavior="automatic"
      contentInset={{ bottom: 0 }}
      scrollIndicatorInsets={{ bottom: 0 }}
      {...props}
      contentContainerStyle={[
        props.contentContainerStyle,
        totalPaddingBottom > 0 ? { paddingBottom: totalPaddingBottom } : undefined,
      ]}
      ref={ref}
    />
  );
});
