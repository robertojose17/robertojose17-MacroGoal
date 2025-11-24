
# 🎉 AI Meal Estimator Integration - Ready to Test!

## ✅ What's Been Done

### 1. Edge Function Deployed ✅
- **Function Name:** `gemini-meal-estimate`
- **Status:** ACTIVE (version 6)
- **Location:** Supabase Edge Functions
- **SDK:** `@google/genai` npm package
- **Model:** Google Gemini 1.5 Flash

### 2. Client Integration Complete ✅
- **Screen:** `app/ai-meal-estimator.tsx`
- **Utility:** `utils/aiMealEstimator.ts`
- **Features:**
  - Text-only meal estimation
  - Image + text meal estimation
  - Comprehensive error handling
  - Detailed logging (client & server)
  - Loading states and user feedback

### 3. API Key Configuration ✅
- **Key Name:** `GOOGLE_AI_API_KEY`
- **Location:** Supabase Edge Functions → Settings → Secrets
- **Status:** You've added this! ✅

## 🧪 How to Test

### Option 1: Quick Test Screen (Recommended)
1. Navigate to `/test-ai` in your app
2. Enter a meal description (default provided)
3. Press "Run Test"
4. See results immediately with detailed metrics

### Option 2: Full User Flow
1. Open the app
2. Go to Diary/Log screen
3. Tap any meal (Breakfast, Lunch, Dinner, Snack)
4. Tap "AI Meal Estimator"
5. Enter a meal description
6. Optionally add a photo
7. Tap "Estimate Macros"
8. Review results and edit if needed
9. Log to diary

## 📊 What to Expect

### Success Response
```json
{
  "items": [
    {
      "name": "Grilled Chicken Breast",
      "serving": "150g",
      "grams": 150,
      "calories": 248,
      "protein_g": 47,
      "carbs_g": 0,
      "fat_g": 5,
      "fiber_g": 0
    }
  ],
  "total": {
    "calories": 495,
    "protein_g": 55,
    "carbs_g": 51,
    "fat_g": 7,
    "fiber_g": 6
  },
  "assumptions": ["Assumed standard serving sizes"],
  "confidence": 0.85,
  "follow_up_questions": ["Was the chicken cooked with oil?"]
}
```

### Timing
- **Text-only:** 2-5 seconds
- **With image:** 5-10 seconds
- **Timeout:** 20 seconds (with 1 retry)

## 🔍 Verification Steps

### 1. Check Client Logs
Open the console and look for:
```
[AIMealEstimator] User pressed "Estimate Macros"
[AI Estimator] Starting estimation...
[AI Estimator] AI Model: Google Gemini 1.5 Flash
[AI Estimator] Edge Function Details:
[AI Estimator] Function Name: gemini-meal-estimate
[AI Estimator] Full URL: https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/gemini-meal-estimate
[AI Estimator] ✅ Estimation successful!
```

### 2. Check Supabase Logs
Go to: Supabase Dashboard → Edge Functions → gemini-meal-estimate → Logs

Look for:
```
[AI] function hit
[AI] Request method: POST
[AI] text: <your description>
[AI] has image: true/false
[AI] API key present: true
[AI] calling gemini...
[AI] Gemini API response received
[AI] ✅ Estimation successful!
[AI] Returning 200 response
```

### 3. Verify Response
- ✅ Status code: 200
- ✅ Response contains `items` array
- ✅ Response contains `total` object
- ✅ Each item has all required fields
- ✅ Confidence score between 0-1

## ❌ Troubleshooting

### Error: "Missing GOOGLE_AI_API_KEY"
**Cause:** API key not set in Supabase
**Solution:**
1. Go to Supabase Dashboard
2. Navigate to Edge Functions → Settings → Secrets
3. Add secret: `GOOGLE_AI_API_KEY`
4. Value: Your key from https://aistudio.google.com/app/apikey
5. Save and wait 30 seconds for propagation

### Error: "Gemini failure"
**Cause:** Invalid API key or Gemini API error
**Solution:**
1. Verify API key is correct
2. Check API key has not expired
3. Generate a new key from Google AI Studio
4. Check Gemini API status

### Error: "Request timeout"
**Cause:** Request took longer than 20 seconds
**Solution:**
1. Try with a simpler description
2. Use a smaller image (< 2MB)
3. Check internet connection
4. Try again (automatic retry included)

### Error: "Invalid JSON response"
**Cause:** Gemini returned non-JSON text
**Solution:**
- The function automatically retries with a re-prompt
- If it persists, check Supabase logs for the raw response
- May indicate an issue with the Gemini API

## 🎯 Test Cases

### Test Case 1: Simple Text
**Input:** "grilled chicken breast with broccoli"
**Expected:** 2-3 items, ~300-400 calories

### Test Case 2: Complex Meal
**Input:** "chipotle bowl chicken no rice with black beans, fajita veggies, cheese, sour cream, and guacamole"
**Expected:** 6-8 items, ~600-800 calories

### Test Case 3: With Quantities
**Input:** "200g grilled salmon with 150g quinoa and steamed asparagus"
**Expected:** 3 items, accurate grams field, ~500-600 calories

### Test Case 4: With Image
**Input:** Photo of a meal + "what's in this meal?"
**Expected:** Higher confidence (0.8-0.95), accurate visual estimation

### Test Case 5: Restaurant Meal
**Input:** "McDonald's Big Mac with medium fries"
**Expected:** 2 items, ~1000 calories

## 📈 Success Metrics

The integration is working correctly if:
- ✅ Response time < 10 seconds (text-only)
- ✅ Response time < 15 seconds (with image)
- ✅ Success rate > 95%
- ✅ Confidence scores > 0.7
- ✅ Accurate calorie estimates (±20%)
- ✅ Proper error handling and user feedback
- ✅ Logs show successful Gemini API calls

## 🚀 Next Steps

1. **Test the integration** using the test screen or full flow
2. **Check the logs** to verify everything is working
3. **Try different meal types** to test accuracy
4. **Test with images** to see improved estimates
5. **Report any issues** with specific error messages

## 📞 Support

If you encounter any issues:
1. Check the client console logs
2. Check the Supabase Edge Function logs
3. Verify the API key is correctly set
4. Try the test screen for quick debugging
5. Look for specific error messages in alerts

## 🎉 You're Ready!

Everything is set up and ready to test. The AI Meal Estimator should now:
- ✅ Accept meal descriptions
- ✅ Accept optional photos
- ✅ Call Google Gemini 1.5 Flash
- ✅ Return accurate nutritional estimates
- ✅ Handle errors gracefully
- ✅ Provide detailed logging

**Go ahead and test it!** 🚀

Press "Estimate Macros" and watch the magic happen! ✨
