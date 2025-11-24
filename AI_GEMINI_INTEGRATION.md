
# Google Gemini AI Integration - Meal Estimator

## Overview

The AI Meal Estimator uses **Google's Gemini 1.5 Flash** model to analyze meal descriptions and photos, providing detailed nutritional estimates including calories and macros.

## Architecture

### Components

1. **Client-Side (React Native)**
   - Screen: `app/ai-meal-estimator.tsx`
   - Utility: `utils/aiMealEstimator.ts`
   - Handles user input, image selection, and result display

2. **Server-Side (Supabase Edge Function)**
   - Function: `gemini-meal-estimate`
   - Uses `@google/genai` npm package
   - Securely calls Google AI API with server-side API key

## Google AI SDK Integration

### Edge Function Implementation

The Edge Function uses the official Google AI SDK:

```typescript
import { GoogleGenAI } from "npm:@google/genai";

// Initialize client
const ai = new GoogleGenAI({ apiKey: Deno.env.get("GOOGLE_AI_API_KEY") });

// Call Gemini
const response = await ai.models.generateContent({
  model: "gemini-1.5-flash",
  contents: [
    {
      role: "user",
      parts: [
        { text: "System instruction and meal description" },
        { inlineData: { data: base64Image, mimeType: "image/jpeg" } } // Optional
      ]
    }
  ]
});
```

### Key Features

- **Model**: `gemini-1.5-flash` (supports both text and vision)
- **SDK**: `@google/genai` npm package
- **API Key**: `GOOGLE_AI_API_KEY` (environment variable)
- **Timeout**: 20 seconds with automatic retry
- **Error Handling**: Comprehensive error messages and retry logic

## Environment Configuration

### Required Environment Variable

Set in Supabase Edge Function secrets:

```bash
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
```

**Note**: The function also supports `GEMINI_API_KEY` for backward compatibility.

### How to Set

1. Go to Supabase Dashboard
2. Navigate to Edge Functions → Settings
3. Add secret: `GOOGLE_AI_API_KEY`
4. Paste your Google AI API key

## API Flow

### Request Format

```typescript
{
  textPrompt: string,      // Meal description
  imageBase64?: string     // Optional base64 image (with data URL prefix)
}
```

### Response Format

```typescript
{
  items: [
    {
      name: string,
      serving: string,
      grams: number | null,
      calories: number,
      protein_g: number,
      carbs_g: number,
      fat_g: number,
      fiber_g: number
    }
  ],
  total: {
    calories: number,
    protein_g: number,
    carbs_g: number,
    fat_g: number,
    fiber_g: number
  },
  assumptions: string[],
  confidence: number,        // 0-1
  follow_up_questions: string[]
}
```

### Error Responses

- **400**: Missing meal description
- **500**: Missing `GOOGLE_AI_API_KEY`
- **502**: Gemini API failure (with details)
- **504**: Request timeout

## Features

### Text + Image Analysis

- Accepts meal descriptions with optional photos
- Uses Gemini's vision capabilities when image provided
- Falls back to text-only analysis without image

### Intelligent Parsing

- Breaks down meals into individual ingredients
- Estimates quantities in grams
- Calculates detailed macros per ingredient
- Provides confidence scores

### Error Handling

- Automatic retry on network failures
- JSON validation with re-prompting
- Timeout protection (20 seconds)
- Detailed error logging

### Response Validation

- Ensures valid JSON structure
- Validates all required fields
- Provides default values for optional fields
- Handles markdown code blocks in responses

## Usage Example

### Client-Side Call

```typescript
import { estimateMealWithGemini } from '@/utils/aiMealEstimator';

const result = await estimateMealWithGemini(
  "chipotle bowl chicken no rice",
  imageUri // optional
);

console.log('Total calories:', result.total.calories);
console.log('Items:', result.items);
console.log('Confidence:', result.confidence);
```

### Edge Function Logs

The function provides comprehensive logging:

```
[AI] ========================================
[AI] function hit
[AI] Request method: POST
[AI] ========================================
[AI] text: chipotle bowl chicken no rice
[AI] has image: true
[AI] ========================================
[AI] calling gemini...
[AI] Model: gemini-1.5-flash
[AI] Has image: true
[AI] ========================================
[AI] ✅ Estimation successful!
[AI] Items: 5
[AI] Total calories: 650
[AI] Confidence: 0.85
[AI] ========================================
```

## Testing

### Test Input

```
Description: "chipotle bowl chicken no rice"
Expected Output:
- Multiple items (chicken, beans, fajita vegetables, salsa, etc.)
- Detailed macros for each item
- Total calories around 600-700
- Confidence score 0.7-0.9
- Assumptions about portion sizes
```

### Verification

1. Check Edge Function logs in Supabase Dashboard
2. Verify API key is configured
3. Confirm Gemini API is being called
4. Validate response structure

## Troubleshooting

### "Missing GOOGLE_AI_API_KEY"

- Set `GOOGLE_AI_API_KEY` in Supabase Edge Function secrets
- Restart the Edge Function after setting

### "Gemini failure"

- Check Google AI API quota
- Verify API key is valid
- Check Edge Function logs for details

### "Request timeout"

- Image may be too large
- Network connectivity issues
- Try again or reduce image size

## Security

- ✅ API key stored server-side only
- ✅ Never exposed to client
- ✅ CORS headers properly configured
- ✅ Input validation on server
- ✅ Error messages don't leak sensitive data

## Performance

- **Average Response Time**: 3-5 seconds
- **Timeout**: 20 seconds
- **Retry**: 1 automatic retry on failure
- **Image Support**: Base64 encoded images

## Future Enhancements

- [ ] Support for multiple images
- [ ] Meal history learning
- [ ] Custom dietary preferences
- [ ] Batch estimation
- [ ] Offline caching

## References

- [Google AI SDK Documentation](https://ai.google.dev/gemini-api/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [@google/genai npm package](https://www.npmjs.com/package/@google/genai)
