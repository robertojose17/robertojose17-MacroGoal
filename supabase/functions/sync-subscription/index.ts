
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!STRIPE_SECRET_KEY) {
  console.error("[SyncSubscription] ❌ STRIPE_SECRET_KEY not configured");
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

console.log("[SyncSubscription] ✅ Edge Function initialized");

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("[SyncSubscription] 📥 Processing sync request...");

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[SyncSubscription] ❌ No authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized - No auth header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error("[SyncSubscription] ❌ Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[SyncSubscription] ✅ User authenticated:", user.id);

    // Get user's subscription from database
    const { data: subData, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subError) {
      console.error("[SyncSubscription] ❌ Error fetching subscription:", subError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscription" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subData || !subData.stripe_subscription_id) {
      console.log("[SyncSubscription] ℹ️ No subscription found for user");
      return new Response(
        JSON.stringify({ 
          message: "No subscription found",
          subscription: null
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[SyncSubscription] 📊 Found subscription:", subData.stripe_subscription_id);

    // Fetch latest subscription data from Stripe
    const stripeSubscription = await stripe.subscriptions.retrieve(subData.stripe_subscription_id);
    
    console.log("[SyncSubscription] 💳 Stripe subscription status:", stripeSubscription.status);

    // Update subscription in database
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        status: stripeSubscription.status,
        stripe_price_id: stripeSubscription.items.data[0].price.id,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: stripeSubscription.cancel_at_period_end,
        trial_end: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[SyncSubscription] ❌ Error updating subscription:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update subscription" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[SyncSubscription] ✅ Subscription updated in database");

    // Update user_type based on subscription status
    const isPremium = stripeSubscription.status === 'active' || stripeSubscription.status === 'trialing';
    const newUserType = isPremium ? 'premium' : 'free';

    console.log("[SyncSubscription] 🔄 Updating user_type to:", newUserType);

    const { error: userError } = await supabase
      .from("users")
      .update({
        user_type: newUserType,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (userError) {
      console.error("[SyncSubscription] ❌ Error updating user_type:", userError);
    } else {
      console.log("[SyncSubscription] ✅ User type updated to:", newUserType);
    }

    // Fetch updated subscription
    const { data: updatedSub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    return new Response(
      JSON.stringify({ 
        message: "Subscription synced successfully",
        subscription: updatedSub,
        isPremium: isPremium
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[SyncSubscription] ❌ Error:", error);
    console.error("[SyncSubscription] Error message:", error.message);
    console.error("[SyncSubscription] Error stack:", error.stack);
    
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
