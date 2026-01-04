
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
    })

    const { user_id, plan } = await req.json()

    if (!user_id || !plan) {
      throw new Error('Missing user_id or plan')
    }

    const priceId = plan === 'yearly' 
      ? Deno.env.get('STRIPE_YEARLY_PRICE_ID')
      : Deno.env.get('STRIPE_MONTHLY_PRICE_ID')

    if (!priceId) {
      throw new Error('Price ID not configured')
    }

    console.log('[Checkout] Creating session for user:', user_id, 'plan:', plan)

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      client_reference_id: user_id,
      metadata: {
        user_id: user_id,
      },
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `elitemacrotracker://profile?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `elitemacrotracker://profile?payment_cancelled=true`,
    })

    console.log('[Checkout] Session created:', session.id)

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('[Checkout] Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
