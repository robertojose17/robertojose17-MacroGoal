
/**
 * DEPRECATED: This file has been replaced by useRevenueCat.ts
 * 
 * All in-app purchase functionality now uses RevenueCat SDK.
 * Import useRevenueCat instead:
 * 
 * import { useRevenueCat } from '@/hooks/useRevenueCat';
 * 
 * This file is kept as a stub to prevent import errors during migration.
 * It will be removed in a future cleanup.
 */

import { useRevenueCat } from './useRevenueCat';

/**
 * @deprecated Use useRevenueCat instead
 */
export const useSubscription = () => {
  console.warn('[useSubscription] DEPRECATED: Use useRevenueCat instead');
  
  const revenueCat = useRevenueCat();
  
  // Map RevenueCat interface to old useSubscription interface for backward compatibility
  return {
    products: revenueCat.products.map(p => ({
      productId: p.productId,
      title: p.title,
      description: p.description,
      price: p.price,
      currencyCode: p.currencyCode,
    })),
    purchaseProduct: async (productId: string) => {
      const pkg = revenueCat.offerings?.availablePackages.find(
        p => p.product.identifier === productId
      );
      if (pkg) {
        await revenueCat.purchasePackage(pkg);
      }
    },
    restorePurchases: revenueCat.restorePurchases,
    isSubscribed: revenueCat.isPro,
    loading: revenueCat.loading,
    error: revenueCat.error,
    storeConnected: !revenueCat.loading && !revenueCat.error,
    diagnostics: [
      '[DEPRECATED] This hook uses RevenueCat. Please migrate to useRevenueCat directly.',
    ],
  };
};
