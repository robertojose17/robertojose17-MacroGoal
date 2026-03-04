
/**
 * Revenue Cap Enforcement
 * 
 * This module enforces a revenue cap (spending limit) for users.
 * The cap is calculated based on total historical spending in USD.
 * 
 * CRITICAL: This is enforced in the frontend BEFORE purchase initiation.
 * The backend (RevenueCat webhook) also logs all purchases for audit.
 */

import { supabase } from '@/lib/supabase/client';

// Revenue cap in USD - adjust this value as needed
export const REVENUE_CAP_USD = 500;

export interface RevenueCapStatus {
  capReached: boolean;
  totalRevenue: number;
  remainingRevenue: number;
  capAmount: number;
}

/**
 * Check if user has reached the revenue cap
 * 
 * @param userId - The user's ID
 * @returns Revenue cap status
 */
export async function checkRevenueCap(userId: string): Promise<RevenueCapStatus> {
  console.log('[RevenueCap] 🔍 Checking revenue cap for user:', userId);

  try {
    // Query all purchase events for this user
    const { data: events, error } = await supabase
      .from('revenuecat_events')
      .select('product_id, purchased_at, raw_event')
      .eq('app_user_id', userId)
      .in('event_type', ['INITIAL_PURCHASE', 'RENEWAL', 'NON_RENEWING_PURCHASE', 'PRODUCT_CHANGE']);

    if (error) {
      console.error('[RevenueCap] ❌ Error fetching revenue events:', error);
      // On error, block purchase for safety
      return {
        capReached: true,
        totalRevenue: 0,
        remainingRevenue: 0,
        capAmount: REVENUE_CAP_USD,
      };
    }

    // Calculate total revenue in USD
    let totalRevenue = 0;

    if (events && events.length > 0) {
      console.log(`[RevenueCap] Found ${events.length} purchase event(s)`);

      for (const event of events) {
        // Extract price from raw_event
        const rawEvent = event.raw_event as any;
        const priceUSD = extractPriceUSD(rawEvent);
        
        if (priceUSD > 0) {
          totalRevenue += priceUSD;
          console.log(`[RevenueCap] Event: ${event.product_id}, Price: $${priceUSD.toFixed(2)}`);
        }
      }
    } else {
      console.log('[RevenueCap] No purchase events found for user');
    }

    const capReached = totalRevenue >= REVENUE_CAP_USD;
    const remainingRevenue = Math.max(0, REVENUE_CAP_USD - totalRevenue);

    console.log('[RevenueCap] ========================================');
    console.log('[RevenueCap] Total Revenue:', `$${totalRevenue.toFixed(2)}`);
    console.log('[RevenueCap] Revenue Cap:', `$${REVENUE_CAP_USD.toFixed(2)}`);
    console.log('[RevenueCap] Remaining:', `$${remainingRevenue.toFixed(2)}`);
    console.log('[RevenueCap] Cap Reached:', capReached ? '❌ YES' : '✅ NO');
    console.log('[RevenueCap] ========================================');

    return {
      capReached,
      totalRevenue,
      remainingRevenue,
      capAmount: REVENUE_CAP_USD,
    };
  } catch (error: any) {
    console.error('[RevenueCap] ❌ Unexpected error:', error);
    // On error, block purchase for safety
    return {
      capReached: true,
      totalRevenue: 0,
      remainingRevenue: 0,
      capAmount: REVENUE_CAP_USD,
    };
  }
}

/**
 * Extract price in USD from RevenueCat event
 * 
 * @param rawEvent - The raw RevenueCat webhook event
 * @returns Price in USD
 */
function extractPriceUSD(rawEvent: any): number {
  try {
    // RevenueCat webhook includes price information in the event
    // The structure is: event.price_in_purchased_currency and event.currency
    const event = rawEvent.event || rawEvent;
    
    // Try to get price from various possible fields
    const priceInPurchasedCurrency = event.price_in_purchased_currency || event.price || 0;
    const currency = event.currency || 'USD';

    // If already in USD, return directly
    if (currency === 'USD') {
      return priceInPurchasedCurrency;
    }

    // For non-USD currencies, we need conversion
    // For now, we'll use approximate conversion rates
    // In production, you should use a real-time currency API
    const conversionRates: { [key: string]: number } = {
      'USD': 1.0,
      'EUR': 1.10,
      'GBP': 1.27,
      'CAD': 0.74,
      'AUD': 0.66,
      'JPY': 0.0068,
      'MXN': 0.050,
      // Add more currencies as needed
    };

    const rate = conversionRates[currency] || 1.0;
    const priceUSD = priceInPurchasedCurrency * rate;

    console.log(`[RevenueCap] Converting ${priceInPurchasedCurrency} ${currency} to $${priceUSD.toFixed(2)} USD (rate: ${rate})`);

    return priceUSD;
  } catch (error) {
    console.error('[RevenueCap] ❌ Error extracting price:', error);
    return 0;
  }
}

/**
 * Format revenue cap status for display
 * 
 * @param status - Revenue cap status
 * @returns Formatted message
 */
export function formatRevenueCapMessage(status: RevenueCapStatus): string {
  if (status.capReached) {
    return `You have reached your spending limit of $${status.capAmount.toFixed(2)}. Further purchases are not allowed.`;
  }

  return `You have $${status.remainingRevenue.toFixed(2)} remaining before reaching your spending limit of $${status.capAmount.toFixed(2)}.`;
}
