
/**
 * AI Meal Estimator Utility
 * 
 * This utility calls a Supabase Edge Function to estimate nutritional information
 * from a meal description and optional photo using Google's Gemini AI.
 * 
 * AI Model: Google Gemini 2.0 Flash
 * The Gemini API key is stored in Supabase Edge Function environment variables.
 */

import { supabase } from '@/app/integrations/supabase/client';

interface Ingredient {
  name: string;
  quantity: string;
  grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

interface EstimationResult {
  meal_name: string;
  assumptions: string[];
  questions: string[];
  ingredients: Ingredient[];
  totals: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
  };
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
 * AI Model: Google Gemini 2.0 Flash
 */
export async function estimateMealWithGemini(
  description: string,
  imageUri: string | null = null
): Promise<EstimationResult> {
  console.log('[AI Estimator] ========================================');
  console.log('[AI Estimator] Starting estimation...');
  console.log('[AI Estimator] Description:', description);
  console.log('[AI Estimator] Has image:', !!imageUri);
  console.log('[AI Estimator] AI Model: Google Gemini 2.0 Flash');

  try {
    // Prepare request body
    const requestBody: any = {
      text: description,
      imageBase64: null,
    };

    // Add image if provided
    if (imageUri) {
      console.log('[AI Estimator] Converting image to base64...');
      const base64Image = await imageUriToBase64(imageUri);
      requestBody.imageBase64 = base64Image;
      console.log('[AI Estimator] Image converted, size:', base64Image.length, 'chars');
    }

    // Log the exact Edge Function URL being called
    const functionName = 'gemini-meal-estimate';
    const projectRef = 'esgptfiofoaeguslgvcq';
    const projectUrl = `https://${projectRef}.supabase.co`;
    const fullUrl = `${projectUrl}/functions/v1/${functionName}`;
    
    console.log('[AI Estimator] ========================================');
    console.log('[AI Estimator] Edge Function Details:');
    console.log('[AI Estimator] Function Name:', functionName);
    console.log('[AI Estimator] Project Ref:', projectRef);
    console.log('[AI Estimator] Project URL:', projectUrl);
    console.log('[AI Estimator] Full URL:', fullUrl);
    console.log('[AI Estimator] Method: POST');
    console.log('[AI Estimator] Request Body Keys:', Object.keys(requestBody));
    console.log('[AI Estimator] Text length:', requestBody.text.length);
    console.log('[AI Estimator] Has image:', !!requestBody.imageBase64);
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
      console.log('[AI Estimator] Data keys:', Object.keys(data));
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
    if (!data.meal_name || !data.ingredients || !Array.isArray(data.ingredients) || !data.totals) {
      console.error('[AI Estimator] Invalid response structure:', data);
      throw new Error('Invalid response from AI service. Please try again.');
    }

    // Validate each ingredient
    for (const ingredient of data.ingredients) {
      if (
        !ingredient.name ||
        !ingredient.quantity ||
        typeof ingredient.grams !== 'number' ||
        typeof ingredient.calories !== 'number' ||
        typeof ingredient.protein_g !== 'number' ||
        typeof ingredient.carbs_g !== 'number' ||
        typeof ingredient.fat_g !== 'number' ||
        typeof ingredient.fiber_g !== 'number'
      ) {
        console.error('[AI Estimator] Invalid ingredient structure:', ingredient);
        throw new Error('Invalid ingredient data from AI service. Please try again.');
      }
    }

    // Ensure assumptions and questions are arrays
    if (!Array.isArray(data.assumptions)) {
      data.assumptions = [];
    }
    if (!Array.isArray(data.questions)) {
      data.questions = [];
    }

    console.log('[AI Estimator] ========================================');
    console.log('[AI Estimator] Estimation successful!');
    console.log('[AI Estimator] Meal name:', data.meal_name);
    console.log('[AI Estimator] Ingredients count:', data.ingredients.length);
    console.log('[AI Estimator] Total calories:', data.totals.calories);
    console.log('[AI Estimator] AI Model: Google Gemini 2.0 Flash');
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
