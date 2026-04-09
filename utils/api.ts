
/**
 * API Utilities
 * 
 * Centralized API configuration and helper functions
 */

import Constants from "expo-constants";
import { Platform } from "react-native";

// Get backend URL from app config
export const API_URL = Constants.expoConfig?.extra?.backendUrl || "";

// Lazy accessor — never import expo-secure-store at module scope on iOS
// (native modules must not be evaluated before AppRegistry.registerComponent)
// eslint-disable-next-line @typescript-eslint/no-require-imports
function getSecureStore() { return require("expo-secure-store"); }

/**
 * Get stored auth token
 */
export async function getAuthToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return localStorage.getItem("auth_token");
  }
  return await getSecureStore().getItemAsync("auth_token");
}

/**
 * Store auth token securely
 */
export async function setAuthToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.setItem("auth_token", token);
  } else {
    await getSecureStore().setItemAsync("auth_token", token);
  }
}

/**
 * Remove auth token
 */
export async function removeAuthToken(): Promise<void> {
  if (Platform.OS === "web") {
    localStorage.removeItem("auth_token");
  } else {
    await getSecureStore().deleteItemAsync("auth_token");
  }
}

/**
 * Make authenticated API request
 */
export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });
}
