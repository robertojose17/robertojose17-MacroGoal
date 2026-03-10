
/**
 * RevenueCat Webhook Handler
 * 
 * This Edge Function receives webhook events from RevenueCat and syncs
 * subscription status to the Supabase database.
 * 
 * Setup Instructions:
 * 1. Deploy this function: supabase functions deploy revenuecat-webhook --no-verify-jwt
 * 2. Get the function URL from Supabase Dashboard
 * 3. Go to RevenueCat Dashboard > Integrations > Webhooks
 * 4. Add webhook URL: https://YOUR_PROJECT.supabase.co/functions/v1/revenuecat-webhook
 * 5. Set Authorization header: Bearer YOUR_SUPABASE_ANON_KEY
 * 6. Select events to send (recommended: all events)
 * 
 * Webhook Events Handled:
 * - INITIAL_PURCHASE: User makes first purchase
 * - RENEWAL: Subscription renews
 * - CANCELLATION: User cancels (still active until expiration)
 * - UNCANCELLATION: User re-enables auto-renew
 * - NON_RENEWING_PURCHASE: One-time purchase
 * - EXPIRATION: Subscription expires
 * - BILLING_ISSUE: Payment failed
 * - PRODUCT_CHANGE: User switches plans
 */

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RevenueCatEvent {
  event: {
    type: string;
    app_user_id: string;
    original_app_user_id: string;
    product_id: string;
    entitlement_ids: string[];
    period_type: string;
    purchased_at_ms: number;
    expiration_at_ms: number;
    store: string;
    environment: string;
    price_in_purchased_currency?: number;
    currency?: string;
    is_trial_conversion?: boolean;
    cancel_reason?: string;
  };
  api_version: string;
}

// Currency conversion rates (approximate - use real-time API in production)
const CONVERSION_RATES: { [key: string]: number } = {
  'USD': 1.0,
  'EUR': 1.10,
  'GBP': 1.27,
  'CAD': 0.74,
  'AUD': 0.66,
  'JPY': 0.0068,
  'MXN': 0.050,
  'BRL': 0.20,
  'INR': 0.012,
  'CNY': 0.14,
};

function convertToUSD(amount: number, currency: string): number {
  const rate = CONVERSION_RATES[currency] || 1.0;
  return amount * rate;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('[RevenueCat Webhook] 📨 Received webhook request');

    // Parse webhook payload
    const payload: RevenueCatEvent = await req.json();
    console.log('[RevenueCat Webhook] Event type:', payload.event.type);
    console.log('[RevenueCat Webhook] App user ID:', payload.event.app_user_id);
    console.log('[RevenueCat Webhook] Environment:', payload.event.environment);
    console.log('[RevenueCat Webhook] Full payload:', JSON.stringify(payload, null, 2));

    // Initialize Supabase client with service role key (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const event = payload.event;
    const userId = event.app_user_id;
    const isTestEnvironment = event.environment === 'SANDBOX' || event.environment === 'sandbox';

    // CRITICAL: Verify user exists in auth.users before proceeding
    console.log('[RevenueCat Webhook] 🔍 Verifying user exists:', userId);
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
    
    if (authError || !authUser) {
      console.error('[RevenueCat Webhook] ❌ User not found in auth.users:', userId);
      console.error('[RevenueCat Webhook] Auth error:', authError);
      
      // Still log the event for debugging, but with null user_id
      const { error: eventError } = await supabase
        .from('revenuecat_events')
        .insert({
          user_id: null, // Don't violate foreign key constraint
          event_type: event.type,
          event_data: payload,
          app_user_id: event.app_user_id,
          product_id: event.product_id,
          entitlement_ids: event.entitlement_ids,
          revenue_usd: 0,
        });

      if (eventError) {
        console.error('[RevenueCat Webhook] ❌ Error storing orphaned event:', eventError);
      } else {
        console.log('[RevenueCat Webhook] ✅ Orphaned event logged for debugging');
      }

      // For test/sandbox environments, return 200 to acknowledge receipt
      // This prevents RevenueCat from marking the webhook as failing during testing
      if (isTestEnvironment) {
        console.log('[RevenueCat Webhook] ⚠️ Test environment - accepting event despite missing user');
        return new Response(
          JSON.stringify({ 
            success: true,
            warning: 'User not found in database (test event accepted)',
            user_id: userId,
            environment: event.environment,
            message: 'Test event logged. For production, use a real user ID from your Supabase auth.users table. You can get your real user ID from the "Test RevenueCat" screen in the app Profile tab.',
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      // For production, return 400 error
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'User not found in database',
          user_id: userId,
          environment: event.environment,
          message: 'The app_user_id from RevenueCat does not match any user in Supabase auth.users. Make sure you are setting the correct user ID when configuring RevenueCat in your app. You can get your real user ID from the "Test RevenueCat" screen in the app Profile tab.',
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[RevenueCat Webhook] ✅ User verified:', authUser.user.email);

    // Extract price information
    const priceInPurchasedCurrency = event.price_in_purchased_currency || 0;
    const currency = event.currency || 'USD';
    const amountUSD = convertToUSD(priceInPurchasedCurrency, currency);

    console.log('[RevenueCat Webhook] Price:', priceInPurchasedCurrency, currency);
    console.log('[RevenueCat Webhook] Amount USD:', amountUSD.toFixed(2));

    // Store raw event for audit trail (matching actual schema)
    const { error: eventError } = await supabase
      .from('revenuecat_events')
      .insert({
        user_id: userId,
        event_type: event.type,
        event_data: payload,
        app_user_id: event.app_user_id,
        product_id: event.product_id,
        entitlement_ids: event.entitlement_ids,
        revenue_usd: amountUSD,
      });

    if (eventError) {
      console.error('[RevenueCat Webhook] ❌ Error storing event:', eventError);
      // Don't fail the webhook if event logging fails
    } else {
      console.log('[RevenueCat Webhook] ✅ Event stored successfully');
    }

    // Update subscription status based on event type
    const now = new Date().toISOString();
    const expirationDate = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;
    const purchasedDate = event.purchased_at_ms ? new Date(event.purchased_at_ms).toISOString() : null;

    // Determine plan_type from product_id
    let planType: 'monthly' | 'yearly' | null = null;
    if (event.product_id) {
      const productLower = event.product_id.toLowerCase();
      if (productLower.includes('month')) {
        planType = 'monthly';
      } else if (productLower.includes('year') || productLower.includes('annual')) {
        planType = 'yearly';
      }
    }

    let subscriptionUpdate: any = {
      entitlement_ids: event.entitlement_ids,
      updated_at: now,
    };

    // Add plan_type if determined
    if (planType) {
      subscriptionUpdate.plan_type = planType;
    }

    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'UNCANCELLATION':
        console.log('[RevenueCat Webhook] 🎉 Activating subscription');
        subscriptionUpdate.status = 'active';
        subscriptionUpdate.current_period_start = purchasedDate;
        subscriptionUpdate.current_period_end = expirationDate;
        subscriptionUpdate.cancel_at_period_end = false;
        break;

      case 'CANCELLATION':
        console.log('[RevenueCat Webhook] ⚠️ Subscription cancelled (still active until expiration)');
        subscriptionUpdate.cancel_at_period_end = true;
        // Keep status as 'active' until expiration
        subscriptionUpdate.status = 'active';
        break;

      case 'EXPIRATION':
        console.log('[RevenueCat Webhook] ❌ Subscription expired');
        subscriptionUpdate.status = 'inactive';
        subscriptionUpdate.current_period_end = expirationDate;
        break;

      case 'BILLING_ISSUE':
        console.log('[RevenueCat Webhook] ⚠️ Billing issue detected');
        subscriptionUpdate.status = 'past_due';
        break;

      case 'PRODUCT_CHANGE':
        console.log('[RevenueCat Webhook] 🔄 Product changed');
        subscriptionUpdate.status = 'active';
        subscriptionUpdate.current_period_start = purchasedDate;
        subscriptionUpdate.current_period_end = expirationDate;
        break;

      case 'NON_RENEWING_PURCHASE':
        console.log('[RevenueCat Webhook] 💰 One-time purchase');
        subscriptionUpdate.status = 'active';
        subscriptionUpdate.current_period_start = purchasedDate;
        subscriptionUpdate.current_period_end = expirationDate;
        subscriptionUpdate.cancel_at_period_end = true;
        break;

      default:
        console.log('[RevenueCat Webhook] ℹ️ Unhandled event type:', event.type);
    }

    console.log('[RevenueCat Webhook] 📝 Upserting subscription with data:', subscriptionUpdate);

    // Upsert subscription record
    const { data: upsertData, error: upsertError } = await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: userId,
          ...subscriptionUpdate,
        },
        {
          onConflict: 'user_id',
        }
      )
      .select();

    if (upsertError) {
      console.error('[RevenueCat Webhook] ❌ Error updating subscription:', upsertError);
      console.error('[RevenueCat Webhook] Error details:', JSON.stringify(upsertError, null, 2));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: upsertError.message,
          details: upsertError,
          user_id: userId,
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[RevenueCat Webhook] ✅ Subscription updated successfully');
    console.log('[RevenueCat Webhook] Updated data:', upsertData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processed successfully',
        event_type: event.type,
        user_id: userId,
        user_email: authUser.user.email,
        amount_usd: amountUSD.toFixed(2),
        subscription_status: subscriptionUpdate.status,
        environment: event.environment,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('[RevenueCat Webhook] ❌ Error processing webhook:', error);
    console.error('[RevenueCat Webhook] Error stack:', error.stack);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error',
        stack: error.stack,
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
