
# Setup Guide: Google AI API Key

## Quick Start

To enable the AI Meal Estimator, you need to configure the Google AI API key in your Supabase Edge Function.

## Step-by-Step Instructions

### 1. Get Your Google AI API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **"Get API Key"** or **"Create API Key"**
4. Copy the generated API key

### 2. Add to Supabase Edge Functions

#### Option A: Via Supabase Dashboard (Recommended)

1. Open [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `esgptfiofoaeguslgvcq`
3. Navigate to: **Edge Functions** (left sidebar)
4. Click on **Settings** or **Secrets** tab
5. Click **"Add Secret"** or **"New Secret"**
6. Enter:
   - **Name**: `GOOGLE_AI_API_KEY`
   - **Value**: Paste your Google AI API key
7. Click **"Save"** or **"Add"**

#### Option B: Via Supabase CLI

```bash
# Set the secret
supabase secrets set GOOGLE_AI_API_KEY=your_api_key_here

# Verify it's set
supabase secrets list
```

### 3. Verify Configuration

#### Test the Edge Function

1. Open the app
2. Navigate to: **Diary → Add Food → AI Meal Estimator**
3. Enter a meal description: `"chipotle bowl chicken no rice"`
4. Click **"Estimate Macros"**
5. Check for successful response

#### Check Logs

1. Go to Supabase Dashboard
2. Navigate to: **Edge Functions → gemini-meal-estimate**
3. Click **"Logs"** tab
4. Look for:
   ```
   [AI] API key present: true
   [AI] calling gemini...
   [AI] ✅ Estimation successful!
   ```

### 4. Troubleshooting

#### Error: "Missing GOOGLE_AI_API_KEY"

**Cause**: API key not set in environment variables

**Solution**:
1. Follow Step 2 above to add the secret
2. Wait 1-2 minutes for changes to propagate
3. Try again

#### Error: "Gemini failure"

**Cause**: Invalid API key or quota exceeded

**Solution**:
1. Verify API key is correct
2. Check [Google AI Studio](https://aistudio.google.com/) for quota limits
3. Generate a new API key if needed

#### Error: "Request timeout"

**Cause**: Network issues or large image

**Solution**:
1. Check internet connection
2. Try without image first
3. Reduce image size if using photo

## API Key Security

### ✅ Best Practices

- **Never** commit API keys to git
- **Never** expose API keys in client code
- **Always** use environment variables
- **Rotate** keys periodically
- **Monitor** usage in Google AI Studio

### ✅ Current Implementation

- ✅ API key stored in Supabase Edge Function secrets
- ✅ Only accessible server-side
- ✅ Never sent to client
- ✅ Secure HTTPS communication
- ✅ CORS properly configured

## Alternative: GEMINI_API_KEY

For backward compatibility, the Edge Function also accepts `GEMINI_API_KEY`:

```bash
supabase secrets set GEMINI_API_KEY=your_api_key_here
```

**Note**: `GOOGLE_AI_API_KEY` takes precedence if both are set.

## Pricing & Quotas

### Google AI (Gemini 1.5 Flash)

- **Free Tier**: 15 requests per minute
- **Paid Tier**: Higher limits available
- **Cost**: Check [Google AI Pricing](https://ai.google.dev/pricing)

### Monitoring Usage

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Check **"API Usage"** or **"Quotas"**
3. Monitor requests per day/month

## Testing

### Test Commands

```bash
# Test with curl
curl -X POST https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/gemini-meal-estimate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -d '{"textPrompt": "chipotle bowl chicken no rice"}'
```

### Expected Response

```json
{
  "items": [
    {
      "name": "Grilled Chicken",
      "serving": "4 oz",
      "grams": 113,
      "calories": 165,
      "protein_g": 31,
      "carbs_g": 0,
      "fat_g": 3.6,
      "fiber_g": 0
    }
  ],
  "total": {
    "calories": 650,
    "protein_g": 45,
    "carbs_g": 60,
    "fat_g": 20,
    "fiber_g": 12
  },
  "assumptions": ["Assumed standard portion sizes"],
  "confidence": 0.85,
  "follow_up_questions": []
}
```

## Support

### Resources

- [Google AI Documentation](https://ai.google.dev/gemini-api/docs)
- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Project Documentation](./AI_GEMINI_INTEGRATION.md)

### Common Issues

| Issue | Solution |
|-------|----------|
| Missing API key | Set `GOOGLE_AI_API_KEY` in Supabase secrets |
| Invalid key | Generate new key in Google AI Studio |
| Quota exceeded | Wait or upgrade to paid tier |
| Timeout | Reduce image size or check network |

## Next Steps

1. ✅ Set `GOOGLE_AI_API_KEY` in Supabase
2. ✅ Test with sample meal description
3. ✅ Monitor logs for successful calls
4. ✅ Start using AI Meal Estimator!

---

**Need Help?** Check the logs in Supabase Dashboard → Edge Functions → gemini-meal-estimate → Logs
