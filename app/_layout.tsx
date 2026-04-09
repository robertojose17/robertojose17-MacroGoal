import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { AuthProvider } from '@/contexts/AuthContext';
import { AdBannerProvider } from '@/components/AdBannerContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SafeAreaProvider>
        <AuthProvider>
          <AdBannerProvider>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="auth-screen" options={{ headerShown: false }} />
              <Stack.Screen name="auth-popup" options={{ presentation: 'modal', headerShown: false }} />
              <Stack.Screen name="auth-callback" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" options={{ title: 'Not Found' }} />
              <Stack.Screen
                name="food-search"
                options={{
                  title: 'Search Foods',
                  headerLargeTitle: true,
                  headerBackButtonDisplayMode: 'minimal',
                }}
              />
              <Stack.Screen
                name="food-details"
                options={{
                  title: 'Food Details',
                  headerBackButtonDisplayMode: 'minimal',
                }}
              />
              <Stack.Screen
                name="barcode-scanner"
                options={{
                  title: 'Scan Barcode',
                  headerTransparent: true,
                  headerBackButtonDisplayMode: 'minimal',
                }}
              />
              <Stack.Screen
                name="my-foods"
                options={{
                  title: 'My Foods',
                  headerLargeTitle: true,
                  headerBackButtonDisplayMode: 'minimal',
                }}
              />
              <Stack.Screen
                name="my-foods-create"
                options={{
                  title: 'Create Food',
                  presentation: 'formSheet',
                  sheetGrabberVisible: true,
                  headerBackButtonDisplayMode: 'minimal',
                }}
              />
              <Stack.Screen
                name="my-foods-edit"
                options={{
                  title: 'Edit Food',
                  presentation: 'formSheet',
                  sheetGrabberVisible: true,
                  headerBackButtonDisplayMode: 'minimal',
                }}
              />
              <Stack.Screen
                name="my-meals"
                options={{
                  title: 'My Meals',
                  headerLargeTitle: true,
                  headerBackButtonDisplayMode: 'minimal',
                }}
              />
              <Stack.Screen
                name="my-meals-create"
                options={{
                  title: 'Create Meal',
                  headerBackButtonDisplayMode: 'minimal',
                }}
              />
              <Stack.Screen
                name="my-meals-details"
                options={{
                  title: 'Meal Details',
                  headerBackButtonDisplayMode: 'minimal',
                }}
              />
              <Stack.Screen
                name="my-meals-edit"
                options={{
                  title: 'Edit Meal',
                  headerBackButtonDisplayMode: 'minimal',
                }}
              />
              <Stack.Screen
                name="ai-meal-estimator"
                options={{
                  title: 'AI Estimator',
                  headerBackButtonDisplayMode: 'minimal',
                }}
              />
              <Stack.Screen
                name="chatbot"
                options={{
                  title: 'Nutritionist AI',
                  headerBackButtonDisplayMode: 'minimal',
                }}
              />
              <Stack.Screen
                name="edit-goals"
                options={{
                  title: 'Edit Goals',
                  presentation: 'formSheet',
                  sheetGrabberVisible: true,
                  headerBackButtonDisplayMode: 'minimal',
                }}
              />
              <Stack.Screen
                name="check-in-form"
                options={{
                  title: 'New Check-in',
                  presentation: 'formSheet',
                  sheetGrabberVisible: true,
                  headerBackButtonDisplayMode: 'minimal',
                }}
              />
              <Stack.Screen
                name="check-in-details"
                options={{
                  title: 'Check-in Details',
                  headerBackButtonDisplayMode: 'minimal',
                }}
              />
            </Stack>
          </AdBannerProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
