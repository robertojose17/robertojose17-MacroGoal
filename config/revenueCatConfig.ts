
/**
 * RevenueCat Configuration
 * 
 * This file will be used when RevenueCat integration is available.
 * Currently using expo-in-app-purchases as fallback.
 * 
 * SETUP INSTRUCTIONS (When RevenueCat is available):
 * 1. Create account at https://app.revenuecat.com/
 * 2. Create new app in RevenueCat dashboard
 * 3. Add iOS app with Bundle ID: com.robertojose17.macrogoal
 * 4. Add Android app (when ready)
 * 5. Configure products in RevenueCat (use existing product IDs)
 * 6. Get API keys from RevenueCat dashboard
 * 7. Add keys to .env file
 * 8. Uncomment and configure this file
 */

// TODO: Uncomment when RevenueCat is available
// import { Platform } from 'react-native';

export const REVENUECAT_CONFIG = {
  // API Keys (from RevenueCat dashboard)
  // TODO: Add these to .env file when RevenueCat is available
  // apiKey: Platform.select({
  //   ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY || '',
  //   android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || '',
  // }),

  // Product IDs (must match App Store Connect and Google Play Console)
  productIds: {
    monthly: 'Monthly_MG',
    yearly: 'Yearly_MG',
  },

  // Entitlement identifier (configured in RevenueCat dashboard)
  entitlementId: 'premium',

  // App configuration
  appConfig: {
    bundleId: 'com.robertojose17.macrogoal',
    appleId: '6755788871',
    appleTeamId: 'RQ6JHH38HA',
  },
} as const;

// Subscription plan metadata
export const SUBSCRIPTION_PLANS = {
  monthly: {
    id: 'Monthly_MG',
    name: 'Monthly Premium',
    description: 'Full access to all premium features',
    period: 'month',
    features: [
      'Advanced Analytics',
      'Custom Recipes',
      'Multiple Goal Phases',
      'Habit Tracking',
      'Data Export',
      'Smart Suggestions',
    ],
  },
  yearly: {
    id: 'Yearly_MG',
    name: 'Annual Premium',
    description: 'Full access to all premium features',
    period: 'year',
    badge: 'Best Value',
    features: [
      'Advanced Analytics',
      'Custom Recipes',
      'Multiple Goal Phases',
      'Habit Tracking',
      'Data Export',
      'Smart Suggestions',
    ],
  },
} as const;

// Premium features list (for paywall display)
export const PREMIUM_FEATURES = [
  {
    icon: 'trending-up',
    title: 'Advanced Analytics',
    description: '7/30-day charts, trends, and adherence tracking',
  },
  {
    icon: 'restaurant',
    title: 'Custom Recipes',
    description: 'Multi-ingredient recipe builder',
  },
  {
    icon: 'flag',
    title: 'Multiple Goal Phases',
    description: 'Switch between cut, maintain, and bulk',
  },
  {
    icon: 'check-circle',
    title: 'Habit Tracking',
    description: 'Track streaks and completion rates',
  },
  {
    icon: 'download',
    title: 'Data Export',
    description: 'Export your data as CSV',
  },
  {
    icon: 'lightbulb',
    title: 'Smart Suggestions',
    description: 'AI-powered tips and recommendations',
  },
] as const;

export default REVENUECAT_CONFIG;
