
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
    }

    console.log('[AI Estimator] Calling Supabase Edge Function...');

    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('gemini-meal-estimate', {
      body: requestBody,
    });

    console.log('[AI Estimator] Response received');

    // Check for errors
    if (error) {
      console.error('[AI Estimator] Edge Function error:', error);
      console.error('[AI Estimator] Error details:', JSON.stringify(error, null, 2));
      
      // Extract error message
      let errorMessage = 'AI estimation failed. Please try again.';
      
      // Try to parse error from context
      if (error.context) {
        try {
          const contextData = typeof error.context === 'string' 
            ? JSON.parse(error.context) 
            : error.context;
          
          if (contextData.error) {
            errorMessage = contextData.error;
          }
        } catch (e) {
          console.error('[AI Estimator] Failed to parse error context:', e);
        }
      }
      
      // Use error message if available
      if (error.message) {
        errorMessage = error.message;
      }
      
      console.error('[AI Estimator] Final error message:', errorMessage);
      throw new Error(errorMessage);
    }

    if (!data) {
      console.error('[AI Estimator] No data in response');
      throw new Error('No response from AI service. Please try again.');
    }

    console.log('[AI Estimator] API response received');

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

    console.log('[AI Estimator] Estimation successful');
    console.log('[AI Estimator] Ingredients:', data.ingredients.length);
    console.log('[AI Estimator] AI Model: Google Gemini 2.0 Flash');
    
    return data as EstimationResult;
  } catch (error: any) {
    console.error('[AI Estimator] Error:', error);
    
    // Re-throw with the error message
    if (error.message) {
      throw error;
    }
    
    throw new Error('AI estimation is temporarily unavailable. Please try again or log manually.');
  }
}
