
# QUICK TEST GUIDE - Subscription Payment Fix

## 🚀 Quick Test (5 minutes)

### Prerequisites
- Mobile device (iOS or Android)
- App installed and logged in
- Stripe test card: `4242 4242 4242 4242`

### Test Steps

1. **Open AI Meal Estimator**
   - Should show paywall

2. **Tap "Subscribe Now"**
   - Select Monthly or Yearly
   - Tap "Subscribe Now" button

3. **Complete Stripe Checkout**
   - Enter test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - Tap "Subscribe"

4. **Wait for Browser to Close**
   - Browser should close automatically
   - App returns to previous screen

5. **Wait 10 Seconds**
   - Watch console logs (if connected)
   - Should see: "Premium status confirmed!"

6. **Verify Premium Status**
   - Go to Profile screen
   - Should show "⭐ Premium" badge
   - Try AI Meal Estimator
   - Should work without paywall

7. **Test Persistence**
   - Close app completely
   - Reopen app
   - Verify still Premium

## ✅ Success Criteria

- [ ] Payment completes
- [ ] Browser closes
- [ ] Premium unlocks within 10 seconds
- [ ] Paywall disappears
- [ ] AI features work
- [ ] Premium persists after restart

## ❌ If It Fails

### Check Console Logs
Look for:
```
[useSubscription] ✅ Premium status confirmed!
```

If you see:
```
[useSubscription] ⚠️ Premium status not confirmed after all retries
```

### Manual Fix
1. Go to Profile screen
2. Pull down to refresh
3. Or tap "Manage Subscription"
4. Wait 5 seconds
5. Check if Premium appears

### Check Database
```sql
SELECT user_type FROM users WHERE email = 'your@email.com';
```
Should return: `premium`

### Check Webhook
1. Go to Stripe Dashboard
2. Developers → Webhooks
3. Check recent events
4. Look for `checkout.session.completed`
5. Should show "Succeeded"

## 🐛 Common Issues

### Issue: "Still showing paywall after payment"
**Fix:** Pull-to-refresh on Profile screen

### Issue: "Payment succeeded but no Premium badge"
**Fix:** Check Stripe webhook logs for errors

### Issue: "Browser doesn't close"
**Fix:** Manually close browser, app will sync when you return

## 📊 What to Report

If test fails, report:
1. Device type (iOS/Android)
2. Console logs (if available)
3. Time between payment and return to app
4. Database user_type value
5. Stripe webhook status

## 🎯 Expected Timeline

- Payment: 5-10 seconds
- Browser close: Immediate
- Sync start: Immediate
- Premium unlock: 2-10 seconds
- Total: <20 seconds

---

**Quick Reference:**
- Test card: `4242 4242 4242 4242`
- Max wait time: 10 seconds
- Manual fix: Pull-to-refresh
- Database check: `user_type = 'premium'`
