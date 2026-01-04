
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  
  if (!signature) {
    console.error('[Webhook] No signature header')
    return new Response('No signature', { status: 400 })
  }

  try {
    // Get RAW body BEFORE any parsing
    const body = await req.text()
    
    // Use ASYNC verification for Supabase Edge runtime
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret
    )

    console.log('[Webhook] Event received:', event.type, 'ID:', event.id)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id || session.metadata?.user_id

        if (!userId) {
          console.error('[Webhook] No user_id found in session')
          break
        }

        console.log('[Webhook] Processing checkout.session.completed for user:', userId)

        // First, ensure subscription record exists
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle()

        if (!existingSub) {
          // Create new subscription record
          const { error: insertError } = await supabase
            .from('subscriptions')
            .insert({
              user_id: userId,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              status: 'active',
              updated_at: new Date().toISOString(),
            })

          if (insertError) {
            console.error('[Webhook] Error inserting subscription:', insertError)
            throw insertError
          }
        } else {
          // Update existing subscription record
          const { error: updateError } = await supabase
            .from('subscriptions')
            .update({
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)

          if (updateError) {
            console.error('[Webhook] Error updating subscription:', updateError)
            throw updateError
          }
        }

        // Update user_type to premium
        const { error: userError } = await supabase
          .from('users')
          .update({
            user_type: 'premium',
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        if (userError) {
          console.error('[Webhook] Error updating user:', userError)
          throw userError
        }

        console.log('[Webhook] User', userId, 'upgraded to premium')
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const isPremium = ['active', 'trialing'].includes(subscription.status)

        console.log('[Webhook] Processing subscription update:', subscription.id, 'status:', subscription.status)

        // Convert timestamps safely (Stripe uses Unix seconds)
        const currentPeriodStart = subscription.current_period_start 
          ? new Date(subscription.current_period_start * 1000).toISOString()
          : null

        const currentPeriodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null

        const trialEnd = subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null

        // Update subscription record
        const { error: subError } = await supabase
          .from('subscriptions')
          .update({
            stripe_subscription_id: subscription.id,
            status: subscription.status,
            current_period_start: currentPeriodStart,
            current_period_end: currentPeriodEnd,
            cancel_at_period_end: subscription.cancel_at_period_end,
            trial_end: trialEnd,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId)

        if (subError) {
          console.error('[Webhook] Error updating subscription:', subError)
          throw subError
        }

        // Update user_type based on subscription status
        const newUserType = isPremium ? 'premium' : 'free'
        
        const { error: userError } = await supabase
          .from('users')
          .update({
            user_type: newUserType,
            updated_at: new Date().toISOString(),
          })
          .eq('id', (await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', customerId)
            .single()
          ).data?.user_id)

        if (userError) {
          console.error('[Webhook] Error updating user_type:', userError)
        }

        console.log('[Webhook] Subscription', subscription.id, 'updated to:', subscription.status)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        console.log('[Webhook] Processing subscription deletion:', subscription.id)

        // Update subscription status
        const { error: subError } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId)

        if (subError) {
          console.error('[Webhook] Error updating subscription:', subError)
          throw subError
        }

        // Downgrade user to free
        const { error: userError } = await supabase
          .from('users')
          .update({
            user_type: 'free',
            updated_at: new Date().toISOString(),
          })
          .eq('id', (await supabase
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_customer_id', customerId)
            .single()
          ).data?.user_id)

        if (userError) {
          console.error('[Webhook] Error downgrading user:', userError)
        }

        console.log('[Webhook] Subscription', subscription.id, 'canceled')
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('[Webhook] Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400 }
    )
  }
})
