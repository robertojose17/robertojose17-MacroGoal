
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET) {
  console.error("[Webhook] ❌ Missing Stripe configuration");
}

const stripe = new Stripe(STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

console.log("[Webhook] ✅ Edge Function initialized");

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    console.error("[Webhook] ❌ No signature header");
    return new Response("No signature", { status: 400 });
  }

  try {
    const body = await req.text();
    console.log("[Webhook] 📥 Received webhook");

    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      STRIPE_WEBHOOK_SECRET!,
      undefined,
      Stripe.createSubtleCryptoProvider()
    );

    console.log("[Webhook] 📦 Event type:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("[Webhook] ✅ Checkout completed:", session.id);

        const userId = session.metadata?.supabase_user_id;
        const planType = session.metadata?.plan_type;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!userId) {
          console.error("[Webhook] ❌ No user ID in metadata");
          break;
        }

        // Fetch subscription details from Stripe
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0].price.id;

        console.log("[Webhook] 💾 Upserting subscription:", {
          userId,
          customerId,
          subscriptionId,
          priceId,
          planType,
        });

        // Upsert subscription in database
        const { error } = await supabase
          .from("subscriptions")
          .upsert(
            {
              user_id: userId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              stripe_price_id: priceId,
              status: subscription.status,
              plan_type: planType,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
              trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );

        if (error) {
          console.error("[Webhook] ❌ Error upserting subscription:", error);
        } else {
          console.log("[Webhook] ✅ Subscription upserted successfully");
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("[Webhook] 🔄 Subscription updated:", subscription.id);

        const userId = subscription.metadata?.supabase_user_id;
        const priceId = subscription.items.data[0].price.id;

        if (!userId) {
          console.error("[Webhook] ❌ No user ID in metadata");
          break;
        }

        const { error } = await supabase
          .from("subscriptions")
          .update({
            stripe_price_id: priceId,
            status: subscription.status,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (error) {
          console.error("[Webhook] ❌ Error updating subscription:", error);
        } else {
          console.log("[Webhook] ✅ Subscription updated successfully");
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        console.log("[Webhook] 🗑️ Subscription deleted:", subscription.id);

        const userId = subscription.metadata?.supabase_user_id;

        if (!userId) {
          console.error("[Webhook] ❌ No user ID in metadata");
          break;
        }

        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        if (error) {
          console.error("[Webhook] ❌ Error canceling subscription:", error);
        } else {
          console.log("[Webhook] ✅ Subscription canceled successfully");
        }
        break;
      }

      default:
        console.log("[Webhook] ℹ️ Unhandled event type:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Webhook] ❌ Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
