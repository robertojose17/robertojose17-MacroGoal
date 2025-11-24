
# AI Meal Estimator Testing Guide

## ✅ Setup Complete

You've added the `GOOGLE_AI_API_KEY` to Supabase Edge Functions → Settings → Secrets.

## 🧪 How to Test

### Step 1: Open the AI Meal Estimator
1. Open your app
2. Navigate to the Diary/Log screen
3. Tap on any meal (Breakfast, Lunch, Dinner, or Snack)
4. Tap "AI Meal Estimator" button

### Step 2: Test Text-Only Estimation
1. Enter a meal description, for example:
   - "grilled chicken breast with broccoli and brown rice"
   - "chipotle bowl chicken no rice"
   - "2 eggs scrambled with toast and avocado"
2. Tap "Estimate Macros"
3. Wait for the AI to analyze (should take 2-5 seconds)

### Step 3: Test Image + Text Estimation
1. Enter a meal description
2. Tap "Take Photo" or "Choose Photo"
3. Add a photo of your meal
4. Tap "Estimate Macros"
5. Wait for the AI to analyze (may take 5-10 seconds with image)

## 📊 What to Look For

### ✅ Success Indicators
- Loading spinner appears with "Analyzing..." text
- After a few seconds, you're redirected to the results screen
- Results screen shows:
  - Individual ingredients with estimated quantities
  - Calories and macros for each ingredient
  - Total calories and macros
  - Confidence score (0-1)
  - Any assumptions made by the AI
  - Follow-up questions (if any)

### ❌ Error Indicators
If you see an error, it will show:
- An error alert with a specific message
- A red error card at the top of the screen

Common errors and solutions:
1. **"Missing GOOGLE_AI_API_KEY"**
   - The API key is not set in Supabase
   - Go to: Supabase Dashboard → Edge Functions → Settings → Secrets
   - Add: `GOOGLE_AI_API_KEY` with your key from https://aistudio.google.com/app/apikey

2. **"Gemini failure"**
   - The API key might be invalid
   - Check that you copied the full key correctly
   - Try generating a new key from Google AI Studio

3. **"Request timeout"**
   - The request took longer than 20 seconds
   - Try again with a simpler description or smaller image

## 🔍 Checking Production Logs

To verify the Edge Function is being called:

1. Go to Supabase Dashboard
2. Navigate to Edge Functions → gemini-meal-estimate
3. Click on "Logs" tab
4. Look for these log messages when you press "Estimate Macros":
   ```
   [AI] ========================================
   [AI] function hit
   [AI] Request method: POST
   [AI] ========================================
   [AI] Request parsed successfully
   [AI] text: <your meal description>
   [AI] has image: true/false
   [AI] ========================================
   [AI] API key present: true
   [AI] ========================================
   [AI] calling gemini...
   [AI] Model: gemini-1.5-flash
   [AI] ========================================
   [AI] Gemini API response received
   [AI] ========================================
   [AI] ✅ Estimation successful!
   [AI] Items: <number of ingredients>
   [AI] Total calories: <total>
   [AI] Returning 200 response
   [AI] ========================================
   ```

## 🎯 Expected Behavior

### Text-Only Example
**Input:** "grilled chicken breast with broccoli and brown rice"

**Expected Output:**
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
    },
    {
      "name": "Broccoli",
      "serving": "1 cup",
      "grams": 91,
      "calories": 31,
      "protein_g": 3,
      "carbs_g": 6,
      "fat_g": 0,
      "fiber_g": 2
    },
    {
      "name": "Brown Rice",
      "serving": "1 cup cooked",
      "grams": 195,
      "calories": 216,
      "protein_g": 5,
      "carbs_g": 45,
      "fat_g": 2,
      "fiber_g": 4
    }
  ],
  "total": {
    "calories": 495,
    "protein_g": 55,
    "carbs_g": 51,
    "fat_g": 7,
    "fiber_g": 6
  },
  "assumptions": [
    "Assumed standard serving sizes",
    "Chicken breast is skinless",
    "Rice is cooked weight"
  ],
  "confidence": 0.85,
  "follow_up_questions": [
    "Was the chicken breast cooked with oil?",
    "What was the actual weight of the chicken?"
  ]
}
```

### Image + Text Example
When you add an image, the AI will:
- Analyze the visual portion sizes
- Identify ingredients from the image
- Provide more accurate estimates
- Higher confidence score (typically 0.8-0.95)

## 🐛 Troubleshooting

### Issue: "Edge Function returned a non-2xx status code"
**Solution:** Check the Edge Function logs for the specific error message.

### Issue: Loading forever
**Solution:** 
- Check your internet connection
- The function has a 20-second timeout
- Try with a simpler description

### Issue: Inaccurate estimates
**Solution:**
- Be more specific in your description
- Include quantities (e.g., "200g chicken" instead of "chicken")
- Add a photo for better accuracy
- You can edit the results before logging

## 📝 Client-Side Logging

The app logs detailed information to the console. To view:

### iOS Simulator
1. Open the app in Expo
2. Press `Cmd + D` to open developer menu
3. Tap "Debug Remote JS"
4. Open Chrome DevTools Console

### Android Emulator
1. Open the app in Expo
2. Press `Cmd + M` (Mac) or `Ctrl + M` (Windows/Linux)
3. Tap "Debug Remote JS"
4. Open Chrome DevTools Console

### Look for these logs:
```
[AIMealEstimator] ========================================
[AIMealEstimator] User pressed "Estimate Macros"
[AIMealEstimator] Description: <your text>
[AIMealEstimator] Has image: true/false
[AIMealEstimator] ========================================

[AI Estimator] ========================================
[AI Estimator] Starting estimation...
[AI Estimator] AI Model: Google Gemini 1.5 Flash
[AI Estimator] SDK: @google/genai
[AI Estimator] API Key: GOOGLE_AI_API_KEY (server-side only)
[AI Estimator] ========================================

[AI Estimator] Edge Function Details:
[AI Estimator] Function Name: gemini-meal-estimate
[AI Estimator] Full URL: https://esgptfiofoaeguslgvcq.supabase.co/functions/v1/gemini-meal-estimate
[AI Estimator] Method: POST
[AI Estimator] ========================================

[AI Estimator] ✅ Estimation successful!
[AI Estimator] Items count: 3
[AI Estimator] Total calories: 495
[AI Estimator] Confidence: 0.85
[AI Estimator] ========================================
```

## ✨ Features to Test

1. **Text-only estimation** - Simple meal descriptions
2. **Image + text estimation** - Photos with descriptions
3. **Complex meals** - Multiple ingredients
4. **Restaurant meals** - "chipotle bowl chicken no rice"
5. **Specific quantities** - "200g grilled salmon with 150g quinoa"
6. **Editing results** - Adjust quantities before logging
7. **Error handling** - Invalid inputs, network errors

## 🎉 Success Criteria

The integration is working correctly if:
- ✅ You can enter a meal description
- ✅ You can optionally add a photo
- ✅ Pressing "Estimate Macros" shows a loading state
- ✅ After 2-10 seconds, you see results
- ✅ Results include individual ingredients with macros
- ✅ Results include total calories and macros
- ✅ You can edit quantities before logging
- ✅ Production logs show the Edge Function being called
- ✅ Production logs show successful Gemini API calls
- ✅ No "Missing GOOGLE_AI_API_KEY" errors

## 📞 Support

If you encounter issues:
1. Check the production logs in Supabase Dashboard
2. Check the client-side console logs
3. Verify the API key is correctly set in Supabase
4. Try generating a new API key from Google AI Studio
5. Test with a simple text-only description first
