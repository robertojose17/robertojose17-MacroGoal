/**
 * Diagnostic Error Boundary — shows a bright red full-screen crash report.
 * This makes silent blank-screen crashes visible so we can identify the root cause.
 */

import React, { Component, ReactNode } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary] CRASH CAUGHT:", error.message);
    console.error("[ErrorBoundary] Stack:", error.stack);
    console.error("[ErrorBoundary] Component stack:", errorInfo.componentStack);
    this.setState({ error, errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.state.error?.message ?? "Unknown error";
      const errorStack = this.state.error?.stack ?? "";
      const componentStack = this.state.errorInfo?.componentStack ?? "";

      return (
        <View style={{ flex: 1, backgroundColor: "#CC0000", padding: 0 }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 24, paddingTop: 80, paddingBottom: 60 }}
          >
            <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "bold", marginBottom: 8 }}>
              APP CRASH
            </Text>
            <Text style={{ color: "#FFDDDD", fontSize: 13, fontWeight: "bold", marginBottom: 16 }}>
              An error was caught by ErrorBoundary. This screen replaces the blank white screen.
            </Text>

            <Text style={{ color: "#FFEEEE", fontSize: 11, fontWeight: "bold", marginBottom: 4 }}>
              ERROR MESSAGE:
            </Text>
            <Text style={{ color: "#FFFFFF", fontSize: 14, marginBottom: 16, fontFamily: "monospace" }}>
              {errorMessage}
            </Text>

            <Text style={{ color: "#FFEEEE", fontSize: 11, fontWeight: "bold", marginBottom: 4 }}>
              JS STACK:
            </Text>
            <Text style={{ color: "#FFDDDD", fontSize: 11, marginBottom: 16, fontFamily: "monospace" }}>
              {errorStack}
            </Text>

            <Text style={{ color: "#FFEEEE", fontSize: 11, fontWeight: "bold", marginBottom: 4 }}>
              COMPONENT STACK:
            </Text>
            <Text style={{ color: "#FFDDDD", fontSize: 11, marginBottom: 24, fontFamily: "monospace" }}>
              {componentStack}
            </Text>

            <TouchableOpacity
              onPress={this.handleReset}
              style={{ backgroundColor: "#FFFFFF", borderRadius: 8, padding: 14, alignItems: "center" }}
            >
              <Text style={{ color: "#CC0000", fontWeight: "bold", fontSize: 16 }}>
                Try Again
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}
