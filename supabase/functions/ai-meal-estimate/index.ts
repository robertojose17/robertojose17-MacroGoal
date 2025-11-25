
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

interface MealEstimateResponse {
  food_name: string;
  serving_description: string;
  calories_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  notes?: string;
}

Deno.serve(async (req) => {
  console.log('[AI Meal Estimate] Request received:', req.method);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json", ...CORS_HEADERS }
    });
  }

  try {
    // Get API key from environment
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    // Log key presence (never log the actual key)
    console.log(`[AI Meal Estimate] OPENAI_API_KEY present: ${!!OPENAI_API_KEY}`);
    
    if (!OPENAI_API_KEY) {
      console.error('[AI Meal Estimate] ❌ CRITICAL: OPENAI_API_KEY not configured!');
      return new Response(JSON.stringify({ error: "Missing OPENAI_API_KEY configuration" }), {
        status: 500,
        headers: { "content-type": "application/json", ...CORS_HEADERS }
      });
    }

    // Parse form data
    const formData = await req.formData();
    const text = formData.get("text");
    const imageFile = formData.get("image");

    console.log('[AI Meal Estimate] Text description:', text);
    console.log('[AI Meal Estimate] Has image:', !!imageFile);

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Text description is required" }), {
        status: 400,
        headers: { "content-type": "application/json", ...CORS_HEADERS }
      });
    }

    // Build the system prompt for strict JSON output
    const systemPrompt = `You are a nutrition expert AI. Analyze meal descriptions and/or images to estimate nutritional content.

CRITICAL: Return ONLY valid JSON in this EXACT format (no markdown, no code blocks, no extra text):
{
  "food_name": "descriptive meal name",
  "serving_description": "serving size description (e.g., '1 bowl', '2 slices', '1 serving')",
  "calories_kcal": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "fiber_g": number,
  "notes": "brief assumptions or confidence notes (optional)"
}

Rules:
- All nutrition values must be realistic for human food portions
- Round calories to nearest whole number
- Round macros to 1 decimal place
- If uncertain, provide conservative estimates and note assumptions
- serving_description should be human-readable (e.g., "1 medium bowl", "2 slices", "1 serving")
- If serving size is unknown, use "1 serving"
- Keep notes brief (1-2 sentences max)`;

    const userPrompt = `Estimate the nutrition for this meal: ${text.trim()}`;

    // Prepare content parts for OpenAI
    const userContent: { type: string; text?: string; image_url?: { url: string } }[] = [
      { type: "text", text: userPrompt }
    ];

    // Add image if provided
    if (imageFile && imageFile instanceof File) {
      console.log('[AI Meal Estimate] Processing image...');
      const imageBytes = await imageFile.arrayBuffer();
      const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBytes)));
      const mimeType = imageFile.type || "image/jpeg";
      
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:${mimeType};base64,${base64Image}`
        }
      });
      console.log('[AI Meal Estimate] Image added to request');
    }

    console.log('[AI Meal Estimate] Calling OpenAI API...');

    // Call OpenAI Chat Completions API
    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Vision-capable and cost-effective
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        temperature: 0.7,
        max_tokens: 500,
        response_format: { type: "json_object" } // Force JSON output
      })
    });

    console.log('[AI Meal Estimate] OpenAI response status:', openaiResponse.status);

    // Handle non-OK responses
    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error('[AI Meal Estimate] ❌ OpenAI API error:', openaiResponse.status, errorText);
      
      return new Response(JSON.stringify({
        error: "AI estimate failed — check connection and try again.",
        details: `OpenAI API returned ${openaiResponse.status}`
      }), {
        status: 502,
        headers: { "content-type": "application/json", ...CORS_HEADERS }
      });
    }

    const openaiData = await openaiResponse.json();
    console.log('[AI Meal Estimate] OpenAI response received');

    // Extract text from OpenAI response
    const responseText = openaiData?.choices?.[0]?.message?.content;
    
    if (!responseText) {
      console.error('[AI Meal Estimate] No content in OpenAI response');
      return new Response(JSON.stringify({
        error: "AI estimate failed — no response from AI",
        details: "No content returned"
      }), {
        status: 502,
        headers: { "content-type": "application/json", ...CORS_HEADERS }
      });
    }

    console.log('[AI Meal Estimate] OpenAI response text:', responseText);

    // Parse JSON response
    let jsonResponse: MealEstimateResponse;
    try {
      // Try to parse the response as JSON
      jsonResponse = JSON.parse(responseText);
      console.log('[AI Meal Estimate] ✅ Parsed JSON successfully');
    } catch (parseError) {
      console.error('[AI Meal Estimate] ❌ Failed to parse JSON:', parseError);
      console.error('[AI Meal Estimate] Raw text:', responseText);
      
      // Return a safe default with warning
      return new Response(JSON.stringify({
        food_name: text.trim().substring(0, 50),
        serving_description: "1 serving",
        calories_kcal: 400,
        protein_g: 20.0,
        carbs_g: 40.0,
        fat_g: 15.0,
        fiber_g: 5.0,
        notes: "⚠️ AI could not parse meal. Using default estimates. Please edit values."
      }), {
        status: 200,
        headers: { "content-type": "application/json", ...CORS_HEADERS }
      });
    }

    // Validate response structure
    if (!jsonResponse.food_name || typeof jsonResponse.calories_kcal !== 'number') {
      console.error('[AI Meal Estimate] ⚠️ Invalid response structure:', jsonResponse);
      
      // Return a safe default with warning
      return new Response(JSON.stringify({
        food_name: text.trim().substring(0, 50),
        serving_description: "1 serving",
        calories_kcal: 400,
        protein_g: 20.0,
        carbs_g: 40.0,
        fat_g: 15.0,
        fiber_g: 5.0,
        notes: "⚠️ AI response was incomplete. Using default estimates. Please edit values."
      }), {
        status: 200,
        headers: { "content-type": "application/json", ...CORS_HEADERS }
      });
    }

    // Ensure all required fields have default values and proper formatting
    const finalResponse: MealEstimateResponse = {
      food_name: jsonResponse.food_name || text.trim().substring(0, 50),
      serving_description: jsonResponse.serving_description || "1 serving",
      calories_kcal: Math.round(jsonResponse.calories_kcal || 0),
      protein_g: Math.round((jsonResponse.protein_g || 0) * 10) / 10,
      carbs_g: Math.round((jsonResponse.carbs_g || 0) * 10) / 10,
      fat_g: Math.round((jsonResponse.fat_g || 0) * 10) / 10,
      fiber_g: Math.round((jsonResponse.fiber_g || 0) * 10) / 10,
      notes: jsonResponse.notes || undefined
    };

    console.log('[AI Meal Estimate] ✅ Success! Final response:', finalResponse);

    return new Response(JSON.stringify(finalResponse), {
      status: 200,
      headers: { "content-type": "application/json", ...CORS_HEADERS }
    });

  } catch (error) {
    console.error('[AI Meal Estimate] ❌ Unexpected error:', error);
    
    return new Response(JSON.stringify({
      error: "AI estimate failed — check connection and try again.",
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { "content-type": "application/json", ...CORS_HEADERS }
    });
  }
});
