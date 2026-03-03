
/**
 * DEPRECATED: Apple Receipt Verification Edge Function
 * 
 * This function is NO LONGER USED.
 * 
 * The app now uses RevenueCat for all subscription management, which handles:
 * - Receipt validation
 * - Subscription status tracking
 * - Webhook notifications
 * - Cross-platform support
 * 
 * RevenueCat automatically validates receipts with Apple and provides real-time
 * subscription status through their SDK and webhooks.
 * 
 * This function is kept for reference only and will be removed in a future cleanup.
 * 
 * Migration Notes:
 * - All subscription checks now use RevenueCat's CustomerInfo
 * - Entitlement "Macrogoal Pro" is checked via RevenueCat SDK
 * - No manual receipt validation needed
 * - RevenueCat webhooks update subscription status automatically
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  console.warn('[verify-apple-receipt] DEPRECATED: This function is no longer used. App now uses RevenueCat.');

  return new Response(
    JSON.stringify({ 
      success: false, 
      error: 'This endpoint is deprecated. The app now uses RevenueCat for subscription management.',
      migration_info: {
        message: 'Please use RevenueCat SDK for subscription status',
        documentation: 'https://www.revenuecat.com/docs',
      }
    }),
    { 
      status: 410, // 410 Gone - indicates the resource is no longer available
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
});
