import * as React from "react";
import { createContext, useCallback, useContext } from "react";
import { Platform } from "react-native";

// Safely require @bacons/apple-targets — the build/ directory may be absent
// in some install states, so we guard with try/catch to prevent a crash.
let ExtensionStorage: { reloadWidget: () => void } | null = null;
try {
  if (Platform.OS === "ios") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AppleTargets = require("@bacons/apple-targets");
    ExtensionStorage = AppleTargets?.ExtensionStorage ?? null;
  }
} catch {
  // Package not built or not available — widget refresh will be a no-op
}

type WidgetContextType = {
  refreshWidget: () => void;
};

const WidgetContext = createContext<WidgetContextType | null>(null);

export function WidgetProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    if (Platform.OS === "ios" && ExtensionStorage) {
      try {
        ExtensionStorage.reloadWidget();
      } catch (error) {
        console.log("[WidgetContext] Error reloading widget:", error);
      }
    }
  }, []);

  const refreshWidget = useCallback(() => {
    if (Platform.OS === "ios" && ExtensionStorage) {
      try {
        ExtensionStorage.reloadWidget();
      } catch (error) {
        console.log("[WidgetContext] Error refreshing widget:", error);
      }
    }
  }, []);

  return (
    <WidgetContext.Provider value={{ refreshWidget }}>
      {children}
    </WidgetContext.Provider>
  );
}

export const useWidget = () => {
  const context = useContext(WidgetContext);
  if (!context) {
    throw new Error("useWidget must be used within a WidgetProvider");
  }
  return context;
};
