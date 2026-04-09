import * as React from "react";
import { createContext, useCallback, useContext } from "react";

// Widget refresh is a no-op in Expo Go — @bacons/apple-targets is stubbed
// via metro.config.js extraNodeModules so the real native module never loads.
// In a production native build with the extension linked, swap this import
// for the real one: import { ExtensionStorage } from '@bacons/apple-targets';
const ExtensionStorage: { reloadWidget: () => void } | null = null;

type WidgetContextType = {
  refreshWidget: () => void;
};

const WidgetContext = createContext<WidgetContextType | null>(null);

export function WidgetProvider({ children }: { children: React.ReactNode }) {
  const refreshWidget = useCallback(() => {
    if (ExtensionStorage) {
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
