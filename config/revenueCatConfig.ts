
/**
 * RevenueCat Configuration
 * 
 * IMPORTANT: This file contains the PUBLIC SDK KEY only.
 * NEVER include the secret API key (sk_...) in frontend code.
 * 
 * Setup Instructions:
 * 1. Go to RevenueCat Dashboard (https://app.revenuecat.com)
 * 2. Create a new app or select your existing app
 * 3. Go to API Keys and copy the PUBLIC SDK KEY (starts with appl_...)
 * 4. Replace the key below with your actual key
 * 5. Configure your products in App Store Connect
 * 6. Link products to RevenueCat in the dashboard
 */

export const REVENUECAT_CONFIG = {
  // Replace with your actual RevenueCat PUBLIC SDK KEY
  // Get this from: RevenueCat Dashboard > Your App > API Keys
  apiKey: 'appl_TZdEZxwrVNJdRUPcoavoXaVUCSE',
  
  // Entitlement identifier (must match RevenueCat Dashboard)
  entitlementId: 'Macrogoal Pro',
  
  // Product identifiers (must match App Store Connect)
  products: {
    monthly: 'Monthly_MG',
    yearly: 'Yearly_MG',
  },
  
  // Offering identifier (use 'default' or your custom offering)
  offeringId: 'default',
};
