
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.5.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// CRITICAL FIX: Hardcode the correct project URL
const CORRECT_PROJECT_URL = "https://esgptfiofoaeguslgvcq.supabase.co";

if (!STRIPE_SECRET_KEY) {
  console.error("[CheckoutRedirect] ❌ STRIPE_SECRET_KEY not configured");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[CheckoutRedirect] ❌ SUPABASE_SERVICE_ROLE_KEY not configured");
}

// Validate SUPABASE_URL and warn if incorrect
if (SUPABASE_URL && !SUPABASE_URL.includes("esgptfiofoaeguslgvcq")) {
  console.warn("[CheckoutRedirect] ⚠️ WARNING: SUPABASE_URL environment variable has incorrect project ref!");
  console.warn("[CheckoutRedirect] ⚠️ Expected: https://esgptfiofoaeguslgvcq.supabase.co");
  console.warn("[CheckoutRedirect] ⚠️ Got:", SUPABASE_URL);
  console.warn("[CheckoutRedirect] ⚠️ Using hardcoded correct URL instead");
}

const stripe = new Stripe(STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

// CRITICAL: Use SERVICE_ROLE_KEY to bypass RLS
const supabase = createClient(CORRECT_PROJECT_URL, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

console.log("[CheckoutRedirect] ✅ Edge Function initialized (PUBLIC - NO AUTH REQUIRED)");
console.log("[CheckoutRedirect] Using project URL:", CORRECT_PROJECT_URL);

/**
 * CRITICAL: This function is PUBLIC and does NOT require authentication
 * It's called by Stripe after checkout, which happens in a browser/webview
 * Browser redirects NEVER include Authorization headers
 * 
 * NEW: Returns 302 redirect instead of HTML to avoid raw code display
 */
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[CheckoutRedirect] 📥 Processing redirect...");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    const url = new URL(req.url);
    const success = url.searchParams.get("success");
    const cancelled = url.searchParams.get("cancelled");
    const sessionId = url.searchParams.get("session_id");

    console.log("[CheckoutRedirect] Params:", { success, cancelled, sessionId });

    let userId: string | null = null;
    let premiumActivated = false;

    // CRITICAL: If checkout was successful, verify with Stripe and update database
    if (success === "true" && sessionId) {
      console.log("[CheckoutRedirect] ✅ Checkout successful, verifying with Stripe...");
      
      try {
        // STEP 1: Retrieve session from Stripe using SECRET KEY (server-side verification)
        console.log("[CheckoutRedirect] 🔍 Retrieving session from Stripe:", sessionId);
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        
        console.log("[CheckoutRedirect] 📦 Session retrieved:");
        console.log("[CheckoutRedirect]   - Payment status:", session.payment_status);
        console.log("[CheckoutRedirect]   - Customer:", session.customer);
        console.log("[CheckoutRedirect]   - Subscription:", session.subscription);
        console.log("[CheckoutRedirect]   - Metadata:", session.metadata);

        // STEP 2: Verify payment was successful
        if (session.payment_status !== "paid") {
          console.error("[CheckoutRedirect] ❌ Payment not completed:", session.payment_status);
          throw new Error(`Payment not completed: ${session.payment_status}`);
        }

        console.log("[CheckoutRedirect] ✅ Payment verified as PAID");

        // STEP 3: Identify user from metadata or customer lookup
        const customerId = session.customer as string;
        
        // Try to get user_id from session metadata first (most reliable)
        if (session.metadata?.supabase_user_id) {
          userId = session.metadata.supabase_user_id;
          console.log("[CheckoutRedirect] ✅ Found user_id in session metadata:", userId);
        } 
        // Fallback: Look up user by customer_id
        else if (customerId) {
          console.log("[CheckoutRedirect] 🔍 Looking up user by customer_id:", customerId);
          
          // Try user_stripe_customers table first
          const { data: mapping } = await supabase
            .from("user_stripe_customers")
            .select("user_id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();

          if (mapping?.user_id) {
            userId = mapping.user_id;
            console.log("[CheckoutRedirect] ✅ Found user_id in mapping table:", userId);
          } else {
            // Try subscriptions table
            const { data: subscription } = await supabase
              .from("subscriptions")
              .select("user_id")
              .eq("stripe_customer_id", customerId)
              .maybeSingle();

            if (subscription?.user_id) {
              userId = subscription.user_id;
              console.log("[CheckoutRedirect] ✅ Found user_id in subscriptions table:", userId);
            }
          }
        }

        if (!userId) {
          console.error("[CheckoutRedirect] ❌ CRITICAL: Could not identify user!");
          console.error("[CheckoutRedirect] Session ID:", sessionId);
          console.error("[CheckoutRedirect] Customer ID:", customerId);
          console.error("[CheckoutRedirect] Metadata:", session.metadata);
          throw new Error("Could not identify user from session");
        }

        // STEP 4: Retrieve subscription details from Stripe
        const subscriptionId = session.subscription as string;
        console.log("[CheckoutRedirect] 🔍 Retrieving subscription from Stripe:", subscriptionId);
        
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0].price.id;
        const status = subscription.status;
        const isPremium = status === 'active' || status === 'trialing';

        console.log("[CheckoutRedirect] 📦 Subscription retrieved:");
        console.log("[CheckoutRedirect]   - Status:", status);
        console.log("[CheckoutRedirect]   - Price ID:", priceId);
        console.log("[CheckoutRedirect]   - Is Premium:", isPremium);

        // Determine plan type
        let planType = subscription.metadata?.plan_type || 'monthly';
        if (!subscription.metadata?.plan_type) {
          if (priceId.toLowerCase().includes('year') || priceId.toLowerCase().includes('annual')) {
            planType = 'yearly';
          }
        }

        // STEP 5: Update Supabase using SERVICE_ROLE_KEY (bypasses RLS)
        console.log("[CheckoutRedirect] 💾 Updating database with SERVICE_ROLE_KEY...");
        console.log("[CheckoutRedirect]   - User ID:", userId);
        console.log("[CheckoutRedirect]   - Customer ID:", customerId);
        console.log("[CheckoutRedirect]   - Subscription ID:", subscriptionId);
        console.log("[CheckoutRedirect]   - Status:", status);
        console.log("[CheckoutRedirect]   - Plan Type:", planType);

        // Update subscriptions table
        const { error: subError } = await supabase
          .from("subscriptions")
          .upsert(
            {
              user_id: userId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              stripe_price_id: priceId,
              status: status,
              plan_type: planType,
              current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end,
              trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );

        if (subError) {
          console.error("[CheckoutRedirect] ❌ Error updating subscriptions table:", subError);
          throw subError;
        }

        console.log("[CheckoutRedirect] ✅ Subscriptions table updated");

        // Update users table - set user_type to premium
        const newUserType = isPremium ? 'premium' : 'free';
        console.log("[CheckoutRedirect] 🔄 Updating user_type to:", newUserType);

        const { error: userError } = await supabase
          .from("users")
          .update({
            user_type: newUserType,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        if (userError) {
          console.error("[CheckoutRedirect] ❌ Error updating users table:", userError);
          throw userError;
        }

        console.log("[CheckoutRedirect] ✅ Users table updated - user is now PREMIUM");

        // Ensure customer mapping exists
        const { error: mappingError } = await supabase
          .from("user_stripe_customers")
          .upsert({
            user_id: userId,
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

        if (mappingError) {
          console.error("[CheckoutRedirect] ⚠️ Error updating customer mapping:", mappingError);
          // Don't throw - this is not critical
        } else {
          console.log("[CheckoutRedirect] ✅ Customer mapping updated");
        }

        premiumActivated = true;
        console.log("[CheckoutRedirect] 🎉 PREMIUM SUCCESSFULLY ACTIVATED!");

      } catch (error: any) {
        console.error("[CheckoutRedirect] ❌ Error processing successful checkout:", error);
        console.error("[CheckoutRedirect] Error message:", error.message);
        console.error("[CheckoutRedirect] Error stack:", error.stack);
        // Continue to redirect even if there's an error
        // The webhook should handle this as a fallback
      }
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Build deep link URL - FIXED: Use correct app scheme "macrogoal"
    let deepLinkUrl = "macrogoal://";
    
    if (success === "true") {
      console.log("[CheckoutRedirect] ✅ Redirecting to app with success...");
      deepLinkUrl += `profile?subscription_success=true&premium_activated=${premiumActivated}&session_id=${sessionId || ''}`;
    } else if (cancelled === "true") {
      console.log("[CheckoutRedirect] ❌ Redirecting to app with cancellation...");
      deepLinkUrl += "paywall?subscription_cancelled=true";
    } else {
      console.log("[CheckoutRedirect] ⚠️ Unknown redirect type, redirecting to profile...");
      deepLinkUrl += "profile";
    }

    console.log("[CheckoutRedirect] 🔗 Deep link URL:", deepLinkUrl);
    console.log("[CheckoutRedirect] 📄 Returning HTML page with auto-redirect");

    // CRITICAL FIX: Return HTML page that auto-opens the app
    // Safari blocks 302 redirects to custom URL schemes, so we use JavaScript instead
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redirecting...</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: linear-gradient(135deg, #0F4C81 0%, #1a5f9e 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      text-align: center;
      max-width: 400px;
    }
    .icon {
      font-size: 64px;
      margin-bottom: 24px;
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.1); opacity: 0.8; }
    }
    h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 16px;
    }
    p {
      font-size: 16px;
      opacity: 0.9;
      margin-bottom: 32px;
      line-height: 1.5;
    }
    .button {
      display: inline-block;
      background: white;
      color: #0F4C81;
      padding: 16px 32px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }
    .button:active {
      transform: translateY(0);
    }
    .spinner {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s linear infinite;
      margin-right: 8px;
      vertical-align: middle;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">${success === "true" ? "✅" : cancelled === "true" ? "❌" : "🔄"}</div>
    <h1>${success === "true" ? "Payment Successful!" : cancelled === "true" ? "Checkout Cancelled" : "Processing..."}</h1>
    <p id="message">
      ${success === "true" 
        ? premiumActivated 
          ? "Your premium subscription is now active! Opening the app..." 
          : "Payment processed successfully. Opening the app..."
        : cancelled === "true"
          ? "You can subscribe anytime. Opening the app..."
          : "Redirecting you back to the app..."}
    </p>
    <div style="margin-bottom: 24px;">
      <span class="spinner"></span>
      <span style="opacity: 0.8;">Redirecting...</span>
    </div>
    <a href="${deepLinkUrl}" class="button" id="openButton">Open App Manually</a>
  </div>

  <script>
    // Attempt to open the app immediately
    console.log('[CheckoutRedirect] Attempting to open app:', '${deepLinkUrl}');
    
    // Try to open the app
    window.location.href = '${deepLinkUrl}';
    
    // Fallback: If the app doesn't open within 2 seconds, show the manual button more prominently
    setTimeout(function() {
      document.getElementById('message').textContent = 'If the app doesn\\'t open automatically, tap the button below:';
      document.getElementById('openButton').style.animation = 'pulse 2s ease-in-out infinite';
    }, 2000);
    
    // Make the button work
    document.getElementById('openButton').addEventListener('click', function(e) {
      e.preventDefault();
      console.log('[CheckoutRedirect] Manual button clicked');
      window.location.href = '${deepLinkUrl}';
    });
  </script>
</body>
</html>
    `;

    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });

  } catch (error: any) {
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("[CheckoutRedirect] ❌ CRITICAL ERROR");
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.error("[CheckoutRedirect] Error:", error);
    console.error("[CheckoutRedirect] Error message:", error.message);
    console.error("[CheckoutRedirect] Error stack:", error.stack);
    console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    
    // Even on error, redirect to app with error flag using HTML page
    const deepLinkUrl = "macrogoal://profile?subscription_error=true";
    
    console.log("[CheckoutRedirect] 🔗 Error redirect URL:", deepLinkUrl);
    console.log("[CheckoutRedirect] 📄 Returning HTML error page");
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: linear-gradient(135deg, #0F4C81 0%, #1a5f9e 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      text-align: center;
      max-width: 400px;
    }
    .icon {
      font-size: 64px;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 16px;
    }
    p {
      font-size: 16px;
      opacity: 0.9;
      margin-bottom: 32px;
      line-height: 1.5;
    }
    .button {
      display: inline-block;
      background: white;
      color: #0F4C81;
      padding: 16px 32px;
      border-radius: 12px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">⚠️</div>
    <h1>Processing Issue</h1>
    <p>There was an issue processing your payment. Opening the app to check your subscription status...</p>
    <a href="${deepLinkUrl}" class="button" id="openButton">Open App</a>
  </div>

  <script>
    // Attempt to open the app immediately
    window.location.href = '${deepLinkUrl}';
    
    // Make the button work
    document.getElementById('openButton').addEventListener('click', function(e) {
      e.preventDefault();
      window.location.href = '${deepLinkUrl}';
    });
  </script>
</body>
</html>
    `;
    
    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  }
});
