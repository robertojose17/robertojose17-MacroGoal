
/**
 * DEPRECATED: This file has been replaced by revenueCatConfig.ts
 * 
 * All in-app purchase configuration now uses RevenueCat.
 * Import from revenueCatConfig instead:
 * 
 * import { PRODUCT_IDS, ENTITLEMENT_ID } from '@/config/revenueCatConfig';
 * 
 * This file is kept as a stub to prevent import errors during migration.
 * It will be removed in a future cleanup.
 */

import { PRODUCT_IDS, APP_CONFIG } from './revenueCatConfig';

/**
 * @deprecated Use PRODUCT_IDS from revenueCatConfig.ts instead
 */
export const IAP_PRODUCT_IDS = {
  MONTHLY: PRODUCT_IDS.MONTHLY,
  YEARLY: PRODUCT_IDS.YEARLY,
} as const;

/**
 * @deprecated Use APP_CONFIG from revenueCatConfig.ts instead
 */
export const IAP_CONFIG = {
  bundleId: APP_CONFIG.bundleId,
  appleId: APP_CONFIG.appleId,
  appleTeamId: APP_CONFIG.appleTeamId,
  scheme: APP_CONFIG.scheme,
} as const;

console.warn('[iapConfig] DEPRECATED: Use revenueCatConfig.ts instead');
