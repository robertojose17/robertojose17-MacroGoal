
# 📋 Subscription System Setup Checklist

Print this checklist and check off each item as you complete it.

---

## ✅ Phase 1: Stripe Account Setup

- [ ] **Create Stripe Account**
  - Go to https://stripe.com
  - Sign up for free account
  - Verify email address
  - **Stay in TEST mode** (toggle in top right)

- [ ] **Access Stripe Dashboard**
  - Log in to https://dashboard.stripe.com
  - Confirm you're in TEST mode
  - Familiarize yourself with the interface

---

## ✅ Phase 2: Create Products & Prices

- [ ] **Create Product**
  - Go to https://dashboard.stripe.com/test/products
  - Click "+ Add product"
  - Name: "Elite Macro Tracker Premium"
  - Description: "Access to AI-powered meal estimation"

- [ ] **Create Monthly Price**
  - Click "Add pricing"
  - Pricing model: Standard pricing
  - Price: $9.99 USD
  - Billing period: Monthly
  - Click "Add price"
  - **Copy Price ID**: `price_________________`

- [ ] **Create Yearly Price**
  - Click "Add another price"
  - Pricing model: Standard pricing
  - Price: $99.99 USD
  - Billing period: Yearly
  - Click "Add price"
  - **Copy Price ID**: `price_________________`

---

## ✅ Phase 3: Get API Keys

- [ ] **Get Secret Key**
  - Go to https://dashboard.stripe.com/test/apikeys
  - Find "Secret key" section
  - Click "Reveal test key"
  - **Copy Secret Key**: `sk_test_________________`

- [ ] **Keep Keys Secure**
  - Don't share keys publicly
  - Don't commit to git
  - Store in password manager

---

## ✅ Phase 4: Set Up Webhook

- [ ] **Create Webhook Endpoint**
  - Go to https://dashboard.stripe.com/test/webhooks
  - Click "+ Add endpoint"
  - Endpoint URL: `https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/stripe-webhook`
  - Description: "Elite Macro Tracker Subscription Webhook"

- [ ] **Select Events**
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `checkout.session.completed`
  - [ ] `invoice.payment_succeeded`
  - [ ] `invoice.payment_failed`

- [ ] **Get Webhook Secret**
  - Click "Add endpoint"
  - Click on the webhook you just created
  - Click "Reveal" under "Signing secret"
  - **Copy Webhook Secret**: `whsec_________________`

---

## ✅ Phase 5: Configure Supabase

- [ ] **Open Supabase Edge Functions Settings**
  - Go to https://supabase.com/dashboard/project/esgptfiofoaeguslgvcq/settings/functions

- [ ] **Add Environment Variables**
  Click "Add new secret" for each:
  
  - [ ] **STRIPE_SECRET_KEY**
    - Value: `sk_test_________________` (from Phase 3)
  
  - [ ] **STRIPE_WEBHOOK_SECRET**
    - Value: `whsec_________________` (from Phase 4)
  
  - [ ] **STRIPE_MONTHLY_PRICE_ID**
    - Value: `price_________________` (from Phase 2)
  
  - [ ] **STRIPE_YEARLY_PRICE_ID**
    - Value: `price_________________` (from Phase 2)

- [ ] **Verify All Secrets Added**
  - Check that all 4 secrets are listed
  - Verify no typos in names
  - Confirm values are correct

---

## ✅ Phase 6: Update App Code

- [ ] **Open stripeConfig.ts**
  - File location: `utils/stripeConfig.ts`

- [ ] **Update Monthly Price ID**
  - Find: `MONTHLY_PRICE_ID: 'price_MONTHLY_TEST_ID_HERE'`
  - Replace with: `MONTHLY_PRICE_ID: 'price_________________'`
  - (Use the monthly Price ID from Phase 2)

- [ ] **Update Yearly Price ID**
  - Find: `YEARLY_PRICE_ID: 'price_YEARLY_TEST_ID_HERE'`
  - Replace with: `YEARLY_PRICE_ID: 'price_________________'`
  - (Use the yearly Price ID from Phase 2)

- [ ] **Save File**
  - Save `utils/stripeConfig.ts`
  - Restart the app if it's running

---

## ✅ Phase 7: Test Subscription Purchase

- [ ] **Open App**
  - Launch the app on device or simulator

- [ ] **Try to Access AI Feature**
  - Navigate to Food tab
  - Try to open "AI Meal Estimator"
  - Should see premium feature alert

- [ ] **View Paywall**
  - Click "Subscribe" in the alert
  - Should see paywall screen
  - Verify pricing is correct

- [ ] **Select Plan**
  - [ ] Try selecting Monthly plan
  - [ ] Try selecting Yearly plan
  - Verify savings badge shows on yearly

- [ ] **Start Checkout**
  - Click "Subscribe Now"
  - Should open Stripe Checkout in browser
  - Verify correct plan and price shown

- [ ] **Complete Payment**
  - Use test card: `4242 4242 4242 4242`
  - Expiry: Any future date (e.g., `12/34`)
  - CVC: Any 3 digits (e.g., `123`)
  - ZIP: Any 5 digits (e.g., `12345`)
  - Click "Subscribe"

- [ ] **Verify Redirect**
  - Should redirect back to app
  - Wait 5-10 seconds for webhook

- [ ] **Check Subscription Status**
  - Go to Profile tab
  - Should see "Active" subscription badge
  - Should show correct plan type
  - Should show renewal date

---

## ✅ Phase 8: Test AI Feature Access

- [ ] **Access AI Meal Estimator**
  - Navigate to Food tab
  - Click "AI Meal Estimator"
  - Should now have access (no paywall)

- [ ] **Test AI Functionality**
  - Describe a meal
  - Send message
  - Verify AI responds with estimate
  - Verify ingredient breakdown shows
  - Try adjusting quantities
  - Try logging the meal

- [ ] **Verify Meal Logged**
  - Go back to Food tab
  - Check that meal was added
  - Verify calories and macros are correct

---

## ✅ Phase 9: Test Subscription Management

- [ ] **Open Profile**
  - Go to Profile tab
  - Verify subscription card shows

- [ ] **Open Customer Portal**
  - Click "Manage Subscription"
  - Should open Stripe Customer Portal in browser
  - Verify subscription details shown

- [ ] **Test Portal Features**
  - [ ] View billing history
  - [ ] View invoices
  - [ ] Try updating payment method
  - [ ] Try canceling subscription

- [ ] **Cancel Subscription**
  - Click "Cancel subscription"
  - Select reason
  - Confirm cancellation
  - Should show "Cancels on [date]"

- [ ] **Verify Cancellation in App**
  - Go back to app
  - Pull down to refresh Profile
  - Should show cancellation notice
  - Should still have access until period end

---

## ✅ Phase 10: Test Webhook Sync

- [ ] **Check Webhook Deliveries**
  - Go to https://dashboard.stripe.com/test/webhooks
  - Click on your webhook
  - Click "Recent deliveries"
  - Verify events were delivered successfully

- [ ] **Check Supabase Logs**
  - Go to https://supabase.com/dashboard/project/esgptfiofoaeguslgvcq/logs/edge-functions
  - Select `stripe-webhook` function
  - Verify webhook events were processed
  - Check for any errors

- [ ] **Verify Database**
  - Go to https://supabase.com/dashboard/project/esgptfiofoaeguslgvcq/editor
  - Open `subscriptions` table
  - Verify your subscription record exists
  - Check that status is correct

---

## ✅ Phase 11: Test on Multiple Platforms

- [ ] **Test on iOS**
  - [ ] Subscription purchase
  - [ ] AI feature access
  - [ ] Subscription management
  - [ ] Checkout redirect
  - [ ] Portal redirect

- [ ] **Test on Android**
  - [ ] Subscription purchase
  - [ ] AI feature access
  - [ ] Subscription management
  - [ ] Checkout redirect
  - [ ] Portal redirect

- [ ] **Test on Web** (if applicable)
  - [ ] Subscription purchase
  - [ ] AI feature access
  - [ ] Subscription management
  - [ ] Checkout redirect
  - [ ] Portal redirect

---

## ✅ Phase 12: Final Verification

- [ ] **Configuration Check**
  - [ ] All Stripe Price IDs updated in app
  - [ ] All Supabase secrets set correctly
  - [ ] Webhook endpoint created and active
  - [ ] No placeholder values remaining

- [ ] **Functionality Check**
  - [ ] Paywall shows for non-subscribers
  - [ ] Subscription purchase works
  - [ ] AI features unlock after subscribing
  - [ ] Subscription management works
  - [ ] Cancellation works
  - [ ] Webhook sync works

- [ ] **UI/UX Check**
  - [ ] Paywall looks professional
  - [ ] Pricing is clear
  - [ ] Loading states work
  - [ ] Error messages are helpful
  - [ ] Dark mode works

- [ ] **Security Check**
  - [ ] No API keys in client code
  - [ ] Webhook signatures verified
  - [ ] RLS policies active
  - [ ] HTTPS connections only

---

## ✅ Phase 13: Documentation Review

- [ ] **Read Documentation**
  - [ ] QUICK_START_SUBSCRIPTION.md
  - [ ] STRIPE_SETUP_GUIDE.md
  - [ ] SUBSCRIPTION_IMPLEMENTATION_SUMMARY.md

- [ ] **Understand Architecture**
  - [ ] How webhooks work
  - [ ] How access control works
  - [ ] How subscription sync works

- [ ] **Know Troubleshooting Steps**
  - [ ] Where to check logs
  - [ ] How to verify configuration
  - [ ] Common issues and solutions

---

## ✅ Phase 14: Production Preparation (When Ready)

- [ ] **Switch to Live Mode**
  - [ ] Create LIVE products in Stripe
  - [ ] Get LIVE API keys
  - [ ] Create LIVE webhook
  - [ ] Update Supabase secrets with LIVE keys
  - [ ] Update app config with LIVE Price IDs

- [ ] **Test with Real Payment**
  - [ ] Use real credit card
  - [ ] Verify charge appears in Stripe
  - [ ] Verify subscription activates
  - [ ] Test full flow end-to-end

- [ ] **Monitor Production**
  - [ ] Set up Stripe email notifications
  - [ ] Monitor webhook deliveries
  - [ ] Check Supabase logs regularly
  - [ ] Monitor subscription metrics

---

## 🎉 Completion

- [ ] **All Phases Complete**
  - All checkboxes above are checked
  - Subscription system fully tested
  - Ready for production use

- [ ] **Launch Checklist**
  - [ ] Tested on all platforms
  - [ ] Documentation reviewed
  - [ ] Team trained (if applicable)
  - [ ] Support process defined
  - [ ] Monitoring set up

---

## 📊 Quick Reference

### Test Card Numbers
- **Success**: `4242 4242 4242 4242`
- **Requires Auth**: `4000 0025 0000 3155`
- **Declined**: `4000 0000 0000 9995`

### Important URLs
- **Stripe Dashboard**: https://dashboard.stripe.com/test
- **Supabase Dashboard**: https://supabase.com/dashboard/project/esgptfiofoaeguslgvcq
- **Webhook Endpoint**: https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/stripe-webhook

### Support
- **Stripe Docs**: https://stripe.com/docs
- **Supabase Docs**: https://supabase.com/docs

---

**Status**: [ ] Complete [ ] In Progress [ ] Not Started

**Date Started**: _______________

**Date Completed**: _______________

**Notes**:
_____________________________________________
_____________________________________________
_____________________________________________
_____________________________________________

---

*Print this checklist and check off items as you complete them!*
