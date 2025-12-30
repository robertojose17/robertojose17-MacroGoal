
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// CRITICAL FIX: Hardcode the correct project URL
const CORRECT_PROJECT_URL = "https://esgptfiofoaeguslgvcq.supabase.co";

if (!STRIPE_SECRET_KEY) {
  console.error("[Sync] ❌ STRIPE_SECRET_KEY not configured");
}

const stripe = new Stripe(STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

console.log("[Sync] ✅ Edge Function initialized");
console.log("[Sync] Using project URL:", CORRECT_PROJECT_URL);

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[Sync] 📥 Syncing subscription...");

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[Sync] ❌ No authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized - No auth header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("[Sync] ❌ Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[Sync] ✅ User authenticated:", user.id);

    // Get user's subscription from database
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subError) {
      console.error("[Sync] ❌ Error fetching subscription:", subError);
      return new Response(
        JSON.stringify({ error: "Error fetching subscription" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscription || !subscription.stripe_subscription_id) {
      console.log("[Sync] ℹ️ No active subscription found in database");
      
      // Check if user has a customer ID
      if (subscription?.stripe_customer_id) {
        console.log("[Sync] 🔍 Checking Stripe for subscriptions...");
        
        try {
          // List all subscriptions for this customer
          const subscriptions = await stripe.subscriptions.list({
            customer: subscription.stripe_customer_id,
            limit: 10,
          });

          console.log("[Sync] 📊 Found", subscriptions.data.length, "subscriptions in Stripe");

          // Find the first active or trialing subscription
          const activeSubscription = subscriptions.data.find(
            sub => sub.status === 'active' || sub.status === 'trialing'
          );

          if (activeSubscription) {
            console.log("[Sync] ✅ Found active subscription in Stripe:", activeSubscription.id);
            
            // Update database with the subscription
            const priceId = activeSubscription.items.data[0].price.id;
            const status = activeSubscription.status;
            const isPremium = status === 'active' || status === 'trialing';

            let planType = activeSubscription.metadata?.plan_type || 'monthly';
            if (!activeSubscription.metadata?.plan_type) {
              if (priceId.toLowerCase().includes('year') || priceId.toLowerCase().includes('annual')) {
                planType = 'yearly';
              }
            }

            const { error: updateError } = await supabase
              .from("subscriptions")
              .update({
                stripe_subscription_id: activeSubscription.id,
                stripe_price_id: priceId,
                status: status,
                plan_type: planType,
                current_period_start: new Date(activeSubscription.current_period_start * 1000).toISOString(),
                current_period_end: new Date(activeSubscription.current_period_end * 1000).toISOString(),
                cancel_at_period_end: activeSubscription.cancel_at_period_end,
                trial_end: activeSubscription.trial_end ? new Date(activeSubscription.trial_end * 1000).toISOString() : null,
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", user.id);

            if (updateError) {
              console.error("[Sync] ❌ Error updating subscription:", updateError);
            } else {
              console.log("[Sync] ✅ Subscription updated in database");
            }

            // Update user_type
            const newUserType = isPremium ? 'premium' : 'free';
            const { error: userError } = await supabase
              .from("users")
              .update({
                user_type: newUserType,
                updated_at: new Date().toISOString(),
              })
              .eq("id", user.id);

            if (userError) {
              console.error("[Sync] ❌ Error updating user_type:", userError);
            } else {
              console.log("[Sync] ✅ User type updated to:", newUserType);
            }

            return new Response(
              JSON.stringify({
                success: true,
                subscription: {
                  status: status,
                  plan_type: planType,
                  is_premium: isPremium,
                },
              }),
              {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          } else {
            console.log("[Sync] ℹ️ No active subscriptions found in Stripe");
          }
        } catch (stripeError: any) {
          console.error("[Sync] ❌ Error fetching from Stripe:", stripeError);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          subscription: null,
          message: "No active subscription found",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[Sync] 🔍 Fetching subscription from Stripe:", subscription.stripe_subscription_id);

    // Fetch the latest subscription data from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripe_subscription_id
    );

    console.log("[Sync] ✅ Stripe subscription retrieved");
    console.log("[Sync]   - Status:", stripeSubscription.status);
    console.log("[Sync]   - Current period end:", new Date(stripeSubscription.current_period_end * 1000).toISOString());

    const priceId = stripeSubscription.items.data[0].price.id;
    const status = stripeSubscription.status;
    const isPremium = status === 'active' || status === 'trialing';

    let planType = stripeSubscription.metadata?.plan_type || subscription.plan_type || 'monthly';
    if (!stripeSubscription.metadata?.plan_type && !subscription.plan_type) {
      if (priceId.toLowerCase().includes('year') || priceId.toLowerCase().includes('annual')) {
        planType = 'yearly';
      }
    }

    // Update subscription in database
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        stripe_price_id: priceId,
        status: status,
        plan_type: planType,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: stripeSubscription.cancel_at_period_end,
        trial_end: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[Sync] ❌ Error updating subscription:", updateError);
      throw updateError;
    }

    console.log("[Sync] ✅ Subscription updated in database");

    // Update user_type
    const newUserType = isPremium ? 'premium' : 'free';
    console.log("[Sync] 🔄 Updating user_type to:", newUserType);

    const { error: userError } = await supabase
      .from("users")
      .update({
        user_type: newUserType,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (userError) {
      console.error("[Sync] ❌ Error updating user_type:", userError);
      throw userError;
    }

    console.log("[Sync] ✅ User type updated to:", newUserType);

    return new Response(
      JSON.stringify({
        success: true,
        subscription: {
          status: status,
          plan_type: planType,
          is_premium: isPremium,
          current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[Sync] ❌ Error:", error);
    console.error("[Sync] Error message:", error.message);
    console.error("[Sync] Error stack:", error.stack);

    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
