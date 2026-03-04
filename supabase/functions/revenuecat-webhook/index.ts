
/**
 * RevenueCat Webhook Handler
 * 
 * This Edge Function receives webhook events from RevenueCat and syncs
 * subscription status to the Supabase database.
 * 
 * Setup Instructions:
 * 1. Deploy this function: supabase functions deploy revenuecat-webhook
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

    // Initialize Supabase client with service role key (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const event = payload.event;
    const userId = event.app_user_id;

    // Extract price information
    const priceInPurchasedCurrency = event.price_in_purchased_currency || 0;
    const currency = event.currency || 'USD';
    const amountUSD = convertToUSD(priceInPurchasedCurrency, currency);

    console.log('[RevenueCat Webhook] Price:', priceInPurchasedCurrency, currency);
    console.log('[RevenueCat Webhook] Amount USD:', amountUSD.toFixed(2));

    // Store raw event for audit trail
    const { error: eventError } = await supabase
      .from('revenuecat_events')
      .insert({
        event_type: event.type,
        app_user_id: event.app_user_id,
        original_app_user_id: event.original_app_user_id,
        product_id: event.product_id,
        entitlement_ids: event.entitlement_ids,
        period_type: event.period_type,
        purchased_at: event.purchased_at_ms ? new Date(event.purchased_at_ms).toISOString() : null,
        expiration_at: event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null,
        store: event.store,
        environment: event.environment,
        price_in_purchased_currency: priceInPurchasedCurrency,
        currency: currency,
        amount_usd: amountUSD,
        raw_event: payload,
      });

    if (eventError) {
      console.error('[RevenueCat Webhook] ❌ Error storing event:', eventError);
    } else {
      console.log('[RevenueCat Webhook] ✅ Event stored successfully');
    }

    // Update subscription status based on event type
    const now = new Date().toISOString();
    const expirationDate = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;
    const purchasedDate = event.purchased_at_ms ? new Date(event.purchased_at_ms).toISOString() : null;

    let subscriptionUpdate: any = {
      revenuecat_app_user_id: event.app_user_id,
      revenuecat_original_app_user_id: event.original_app_user_id,
      entitlement_ids: event.entitlement_ids,
      store: event.store,
      environment: event.environment,
      product_id: event.product_id,
      period_type: event.period_type,
      purchased_at: purchasedDate,
      expiration_at: expirationDate,
      updated_at: now,
    };

    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'UNCANCELLATION':
        console.log('[RevenueCat Webhook] 🎉 Activating subscription');
        subscriptionUpdate.status = 'active';
        subscriptionUpdate.plan_name = event.product_id;
        subscriptionUpdate.will_renew = true;
        subscriptionUpdate.unsubscribe_detected_at = null;
        subscriptionUpdate.billing_issues_detected_at = null;
        subscriptionUpdate.current_period_start = purchasedDate;
        subscriptionUpdate.current_period_end = expirationDate;
        break;

      case 'CANCELLATION':
        console.log('[RevenueCat Webhook] ⚠️ Subscription cancelled (still active until expiration)');
        subscriptionUpdate.will_renew = false;
        subscriptionUpdate.unsubscribe_detected_at = now;
        // Keep status as 'active' until expiration
        subscriptionUpdate.status = 'active';
        break;

      case 'EXPIRATION':
        console.log('[RevenueCat Webhook] ❌ Subscription expired');
        subscriptionUpdate.status = 'inactive';
        subscriptionUpdate.will_renew = false;
        break;

      case 'BILLING_ISSUE':
        console.log('[RevenueCat Webhook] ⚠️ Billing issue detected');
        subscriptionUpdate.billing_issues_detected_at = now;
        subscriptionUpdate.status = 'past_due';
        break;

      case 'PRODUCT_CHANGE':
        console.log('[RevenueCat Webhook] 🔄 Product changed');
        subscriptionUpdate.status = 'active';
        subscriptionUpdate.plan_name = event.product_id;
        subscriptionUpdate.current_period_start = purchasedDate;
        subscriptionUpdate.current_period_end = expirationDate;
        break;

      case 'NON_RENEWING_PURCHASE':
        console.log('[RevenueCat Webhook] 💰 One-time purchase');
        subscriptionUpdate.status = 'active';
        subscriptionUpdate.plan_name = event.product_id;
        subscriptionUpdate.will_renew = false;
        subscriptionUpdate.current_period_start = purchasedDate;
        subscriptionUpdate.current_period_end = expirationDate;
        break;

      default:
        console.log('[RevenueCat Webhook] ℹ️ Unhandled event type:', event.type);
    }

    // Upsert subscription record
    const { error: upsertError } = await supabase
      .from('subscriptions')
      .upsert(
        {
          user_id: userId,
          ...subscriptionUpdate,
        },
        {
          onConflict: 'user_id',
        }
      );

    if (upsertError) {
      console.error('[RevenueCat Webhook] ❌ Error updating subscription:', upsertError);
      return new Response(
        JSON.stringify({ success: false, error: upsertError.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[RevenueCat Webhook] ✅ Subscription updated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook processed successfully',
        event_type: event.type,
        user_id: userId,
        amount_usd: amountUSD.toFixed(2),
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('[RevenueCat Webhook] ❌ Error processing webhook:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
