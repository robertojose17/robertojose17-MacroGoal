
/**
 * RevenueCat Configuration
 * 
 * Complete setup for RevenueCat SDK integration with StoreKit 2
 * Bundle ID: com.robertojose17.macrogoal
 * Apple ID: 6755788871
 * Team ID: RQ6JHH38HA
 */

import { Platform } from 'react-native';

// RevenueCat API Key (provided by user)
export const REVENUECAT_API_KEY = 'test_occIMDaPJIrXQAMTrAgFTrDnKJS';

// Entitlement ID configured in RevenueCat dashboard
export const ENTITLEMENT_ID = 'Macrogoal Pro';

// Product IDs (must match App Store Connect and RevenueCat dashboard)
export const PRODUCT_IDS = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
} as const;

// App configuration
export const APP_CONFIG = {
  bundleId: 'com.robertojose17.macrogoal',
  appleId: '6755788871',
  appleTeamId: 'RQ6JHH38HA',
  scheme: 'macrogoal',
} as const;

// Subscription plan metadata for UI display
export const SUBSCRIPTION_PLANS = {
  monthly: {
    id: 'monthly',
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
    id: 'yearly',
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

export default {
  apiKey: REVENUECAT_API_KEY,
  entitlementId: ENTITLEMENT_ID,
  productIds: PRODUCT_IDS,
  appConfig: APP_CONFIG,
};
