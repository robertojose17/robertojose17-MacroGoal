
/**
 * AI Meal Estimator Utility
 * 
 * This utility calls a Supabase Edge Function to estimate nutritional information
 * from a meal description and optional photo using Google's Gemini AI.
 * 
 * AI Model: Google Gemini 1.5 Flash
 * API Key: GOOGLE_AI_API_KEY (stored in Supabase Edge Function environment variables)
 * SDK: @google/genai npm package
 */

import { supabase } from '@/app/integrations/supabase/client';

interface Ingredient {
  name: string;
  serving: string;
  grams: number | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

interface EstimationResult {
  items: Ingredient[];
  total: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
  };
  assumptions: string[];
  confidence: number;
  follow_up_questions: string[];
}

/**
 * Convert image URI to base64 data URL
 */
async function imageUriToBase64(uri: string): Promise<string> {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        resolve(base64data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('[AI Estimator] Error converting image to base64:', error);
    throw new Error('Failed to process image');
  }
}

/**
 * Estimate meal nutrition using Supabase Edge Function with Google Gemini AI
 * 
 * AI Model: Google Gemini 1.5 Flash
 */
export async function estimateMealWithGemini(
  description: string,
  imageUri: string | null = null
): Promise<EstimationResult> {
  console.log('[AI Estimator] ========================================');
  console.log('[AI Estimator] Starting estimation...');
  console.log('[AI Estimator] Description:', description);
  console.log('[AI Estimator] Has image:', !!imageUri);
  console.log('[AI Estimator] AI Model: Google Gemini 1.5 Flash');
  console.log('[AI Estimator] SDK: @google/genai');
  console.log('[AI Estimator] API Key: GOOGLE_AI_API_KEY (server-side only)');

  try {
    // Prepare request body
    const requestBody: any = {
      textPrompt: description,
      imageBase64: null,
    };

    // Add image if provided
    if (imageUri) {
      console.log('[AI Estimator] Converting image to base64...');
      const base64Image = await imageUriToBase64(imageUri);
      requestBody.imageBase64 = base64Image;
      console.log('[AI Estimator] Image converted, size:', base64Image.length, 'chars');
    }

    // Get project URL
    const projectRef = 'esgptfiofoaeguslgvcq';
    const projectUrl = `https://${projectRef}.supabase.co`;
    const functionName = 'gemini-meal-estimate';
    const fullUrl = `${projectUrl}/functions/v1/${functionName}`;
    
    console.log('[AI Estimator] ========================================');
    console.log('[AI Estimator] Edge Function Details:');
    console.log('[AI Estimator] Function Name:', functionName);
    console.log('[AI Estimator] Full URL:', fullUrl);
    console.log('[AI Estimator] Method: POST');
    console.log('[AI Estimator] Request Body:', JSON.stringify({
      textPrompt: requestBody.textPrompt.substring(0, 50) + '...',
      hasImage: !!requestBody.imageBase64
    }));
    console.log('[AI Estimator] ========================================');

    console.log('[AI Estimator] Calling Supabase Edge Function...');

    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: requestBody,
    });

    console.log('[AI Estimator] ========================================');
    console.log('[AI Estimator] Response received from Edge Function');
    console.log('[AI Estimator] Has error:', !!error);
    console.log('[AI Estimator] Has data:', !!data);
    
    if (error) {
      console.log('[AI Estimator] Error object:', JSON.stringify(error, null, 2));
    }
    if (data) {
      console.log('[AI Estimator] Data:', JSON.stringify(data, null, 2));
    }
    console.log('[AI Estimator] ========================================');

    // Check for errors
    if (error) {
      console.error('[AI Estimator] ========================================');
      console.error('[AI Estimator] Edge Function error detected');
      console.error('[AI Estimator] Error object:', JSON.stringify(error, null, 2));
      console.error('[AI Estimator] Error message:', error.message);
      console.error('[AI Estimator] ========================================');
      
      // Extract error message
      let errorMessage = 'AI estimation failed. Please try again.';
      
      // The error message from the Edge Function
      if (error.message) {
        errorMessage = error.message;
      }
      
      console.error('[AI Estimator] Final error message:', errorMessage);
      throw new Error(errorMessage);
    }

    // Check if data contains an error field (for non-2xx responses)
    if (data && data.error) {
      console.error('[AI Estimator] ========================================');
      console.error('[AI Estimator] Error in response data');
      console.error('[AI Estimator] Error message:', data.error);
      console.error('[AI Estimator] ========================================');
      throw new Error(data.error);
    }

    if (!data) {
      console.error('[AI Estimator] No data in response');
      throw new Error('No response from AI service. Please try again.');
    }

    console.log('[AI Estimator] ========================================');
    console.log('[AI Estimator] API response received successfully');
    console.log('[AI Estimator] Response keys:', Object.keys(data));
    console.log('[AI Estimator] ========================================');

    // Validate the response structure
    if (!data.items || !Array.isArray(data.items) || !data.total) {
      console.error('[AI Estimator] Invalid response structure:', data);
      throw new Error('Invalid response from AI service. Please try again.');
    }

    // Validate each item
    for (const item of data.items) {
      if (
        !item.name ||
        !item.serving ||
        typeof item.calories !== 'number' ||
        typeof item.protein_g !== 'number' ||
        typeof item.carbs_g !== 'number' ||
        typeof item.fat_g !== 'number' ||
        typeof item.fiber_g !== 'number'
      ) {
        console.error('[AI Estimator] Invalid item structure:', item);
        throw new Error('Invalid item data from AI service. Please try again.');
      }
    }

    // Ensure assumptions and follow_up_questions are arrays
    if (!Array.isArray(data.assumptions)) {
      data.assumptions = [];
    }
    if (!Array.isArray(data.follow_up_questions)) {
      data.follow_up_questions = [];
    }

    console.log('[AI Estimator] ========================================');
    console.log('[AI Estimator] ✅ Estimation successful!');
    console.log('[AI Estimator] Items count:', data.items.length);
    console.log('[AI Estimator] Total calories:', data.total.calories);
    console.log('[AI Estimator] Confidence:', data.confidence);
    console.log('[AI Estimator] AI Model: Google Gemini 1.5 Flash');
    console.log('[AI Estimator] SDK: @google/genai');
    console.log('[AI Estimator] ========================================');
    
    return data as EstimationResult;
  } catch (error: any) {
    console.error('[AI Estimator] ========================================');
    console.error('[AI Estimator] Caught error in estimateMealWithGemini');
    console.error('[AI Estimator] Error type:', error.constructor.name);
    console.error('[AI Estimator] Error message:', error.message);
    console.error('[AI Estimator] Error stack:', error.stack);
    console.error('[AI Estimator] ========================================');
    
    // Re-throw with the error message
    if (error.message) {
      throw error;
    }
    
    throw new Error('AI estimation is temporarily unavailable. Please try again or log manually.');
  }
}
