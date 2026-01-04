
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-11-20.acacia',
})

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Safe date conversion helper
function toISOStringOrNull(value: any): string | null {
  if (!value) return null
  if (typeof value === 'number') {
    return new Date(value * 1000).toISOString()
  }
  if (typeof value === 'string') {
    const date = new Date(value)
    return isNaN(date.getTime()) ? null : date.toISOString()
  }
  return null
}

serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      return new Response('No signature', { status: 400 })
    }

    const body = await req.text()
    
    // ✅ FIX: Use constructEventAsync instead of constructEvent
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)

    console.log('Webhook event:', event.type)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.client_reference_id || session.metadata?.user_id

        if (!userId) {
          console.error('No user_id in session')
          return new Response('No user_id', { status: 400 })
        }

        const { error } = await supabase
          .from('profiles')
          .update({
            is_premium: true,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)

        if (error) {
          console.error('DB update error:', error)
          return new Response('DB error', { status: 500 })
        }

        console.log('✅ User marked premium:', userId)
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.created':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (!profile) {
          console.error('No profile for customer:', customerId)
          return new Response('No profile', { status: 404 })
        }

        const isPremium = subscription.status === 'active' || subscription.status === 'trialing'

        const { error } = await supabase
          .from('profiles')
          .update({
            is_premium: isPremium,
            stripe_subscription_id: subscription.id,
            subscription_status: subscription.status,
            current_period_end: toISOStringOrNull(subscription.current_period_end),
            current_period_start: toISOStringOrNull(subscription.current_period_start),
            updated_at: new Date().toISOString(),
          })
          .eq('id', profile.id)

        if (error) {
          console.error('DB update error:', error)
          return new Response('DB error', { status: 500 })
        }

        console.log('✅ Subscription synced:', profile.id, isPremium)
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('Webhook error:', err.message)
    return new Response(err.message, { status: 400 })
  }
})
