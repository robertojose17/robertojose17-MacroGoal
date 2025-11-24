
import * as React from "react";
import { createContext, useCallback, useContext } from "react";
import { ExtensionStorage } from "@bacons/apple-targets";

// Initialize storage with your group ID
const storage = new ExtensionStorage(
  "group.com.<user_name>.<app_name>"
);

type WidgetContextType = {
  refreshWidget: () => void;
};

const WidgetContext = createContext<WidgetContextType | null>(null);

export function WidgetProvider({ children }: { children: React.ReactNode }) {
  console.log('[WidgetProvider] Mounting...');
  
  // Update widget state whenever what we want to show changes
  React.useEffect(() => {
    try {
      console.log('[WidgetProvider] Initializing widget...');
      
      // set widget_state to null if we want to reset the widget
      // storage.set("widget_state", null);

      // Refresh widget - wrapped in try/catch to prevent blocking
      ExtensionStorage.reloadWidget();
      
      console.log('[WidgetProvider] ✅ Widget initialized');
    } catch (error) {
      console.error('[WidgetProvider] ⚠️ Widget initialization failed (non-blocking):', error);
      // Don't throw - widget failure should not block app startup
    }
  }, []);

  const refreshWidget = useCallback(() => {
    try {
      console.log('[WidgetProvider] Refreshing widget...');
      ExtensionStorage.reloadWidget();
      console.log('[WidgetProvider] ✅ Widget refreshed');
    } catch (error) {
      console.error('[WidgetProvider] ⚠️ Widget refresh failed:', error);
      // Don't throw - widget failure should not block app
    }
  }, []);

  console.log('[WidgetProvider] ✅ Mounted successfully');

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
