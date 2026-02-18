
/**
 * In-App Purchase Configuration
 * 
 * IMPORTANT: These product IDs MUST match EXACTLY what you configured in App Store Connect.
 * 
 * To update these:
 * 1. Go to App Store Connect (https://appstoreconnect.apple.com)
 * 2. Select your app
 * 3. Go to "In-App Purchases" section
 * 4. Copy the EXACT Product ID from each subscription
 * 5. Update the values below
 * 
 * Example Product IDs:
 * - com.yourapp.premium.monthly
 * - com.yourapp.premium.yearly
 * - yourapp_premium_monthly
 * - yourapp_premium_yearly
 */

export const IAP_PRODUCT_IDS = {
  monthly: 'macrogoal_premium_monthly',
  yearly: 'macrogoal_premium_yearly',
} as const;

/**
 * Display pricing (fallback if App Store prices aren't loaded)
 * Update these to match your actual subscription prices
 */
export const IAP_PRICING = {
  monthly: 9.99,
  yearly: 49.99,
} as const;

/**
 * App Store Connect Configuration
 * Bundle ID must match what's in app.json and App Store Connect
 */
export const APP_STORE_CONFIG = {
  bundleId: 'com.robertojose17.macrogoal',
  appName: 'Macro Goal',
} as const;

/**
 * Validation: Check if product IDs follow Apple's naming conventions
 */
export function validateProductId(productId: string): { valid: boolean; message: string } {
  // Apple product IDs must be alphanumeric with dots, underscores, or hyphens
  const validPattern = /^[a-zA-Z0-9._-]+$/;
  
  if (!validPattern.test(productId)) {
    return {
      valid: false,
      message: 'Product ID contains invalid characters. Use only letters, numbers, dots, underscores, or hyphens.',
    };
  }
  
  if (productId.length < 3 || productId.length > 255) {
    return {
      valid: false,
      message: 'Product ID must be between 3 and 255 characters.',
    };
  }
  
  return {
    valid: true,
    message: 'Product ID format is valid.',
  };
}

/**
 * Get all product IDs as an array
 */
export function getAllProductIds(): string[] {
  return Object.values(IAP_PRODUCT_IDS);
}

/**
 * Get product ID by plan type
 */
export function getProductId(planType: 'monthly' | 'yearly'): string {
  return IAP_PRODUCT_IDS[planType];
}
