
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

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
    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    
    // Log key presence (never log the actual key)
    console.log(`[AI Meal Estimate] key_present: ${!!GOOGLE_AI_API_KEY}`);
    
    if (!GOOGLE_AI_API_KEY) {
      console.error('[AI Meal Estimate] ❌ CRITICAL: GOOGLE_AI_API_KEY not configured!');
      return new Response(JSON.stringify({ error: "Missing GOOGLE_AI_API_KEY" }), {
        status: 500,
        headers: { "content-type": "application/json", ...CORS_HEADERS }
      });
    }

    // Parse form data
    const formData = await req.formData();
    const description = formData.get("description");
    const imageFile = formData.get("image");

    console.log('[AI Meal Estimate] Description:', description);
    console.log('[AI Meal Estimate] Has image:', !!imageFile);

    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Description is required" }), {
        status: 400,
        headers: { "content-type": "application/json", ...CORS_HEADERS }
      });
    }

    // Build the Gemini API URL with the API key
    const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_AI_API_KEY}`;

    // Build the system prompt
    const systemPrompt = `You are a nutrition expert. Analyze the meal description and estimate its nutritional content.

Return ONLY valid JSON in this exact format (no markdown, no extra text):
{
  "name": "Meal name from description",
  "servings": 1,
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "fiber_g": number,
  "notes": "Brief assumptions or notes (optional)"
}

Rules:
- All nutrition values are per serving
- Be realistic with portion sizes
- If unsure, provide conservative estimates
- Keep notes brief (1-2 sentences max)`;

    const userPrompt = `${systemPrompt}\n\nEstimate the nutrition for this meal: ${description.trim()}`;

    // Prepare content parts
    const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [
      { text: userPrompt }
    ];

    // Add image if provided
    if (imageFile && imageFile instanceof File) {
      console.log('[AI Meal Estimate] Processing image...');
      const imageBytes = await imageFile.arrayBuffer();
      const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBytes)));
      
      parts.push({
        inline_data: {
          mime_type: imageFile.type || "image/jpeg",
          data: base64Image
        }
      });
      console.log('[AI Meal Estimate] Image added to request');
    }

    // Build the request body
    const requestBody = {
      contents: [
        {
          role: "user",
          parts: parts
        }
      ]
    };

    console.log('[AI Meal Estimate] Calling Gemini API...');

    // Call Gemini API directly
    const geminiResponse = await fetch(geminiApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody)
    });

    console.log('[AI Meal Estimate] Gemini response status:', geminiResponse.status);

    // Handle non-OK responses
    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('[AI Meal Estimate] ❌ Gemini API error:', geminiResponse.status, errorText);
      
      return new Response(JSON.stringify({
        error: "AI estimate failed — check connection and try again.",
        details: `Gemini API returned ${geminiResponse.status}: ${errorText}`
      }), {
        status: 502,
        headers: { "content-type": "application/json", ...CORS_HEADERS }
      });
    }

    const geminiData = await geminiResponse.json();
    console.log('[AI Meal Estimate] Gemini response received');

    // Extract text from Gemini response
    const candidates = geminiData.candidates;
    if (!candidates || candidates.length === 0) {
      console.error('[AI Meal Estimate] No candidates in response');
      return new Response(JSON.stringify({
        error: "AI estimate failed — no response from AI",
        details: "No candidates returned"
      }), {
        status: 502,
        headers: { "content-type": "application/json", ...CORS_HEADERS }
      });
    }

    const content = candidates[0].content;
    if (!content || !content.parts || content.parts.length === 0) {
      console.error('[AI Meal Estimate] No content in response');
      return new Response(JSON.stringify({
        error: "AI estimate failed — no content in response",
        details: "No parts in content"
      }), {
        status: 502,
        headers: { "content-type": "application/json", ...CORS_HEADERS }
      });
    }

    const text = content.parts[0].text;
    console.log('[AI Meal Estimate] Gemini text response:', text);

    // Parse JSON response
    let jsonResponse;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonText = jsonMatch ? jsonMatch[1].trim() : text.trim();
      jsonResponse = JSON.parse(jsonText);
      console.log('[AI Meal Estimate] ✅ Parsed JSON successfully');
    } catch (parseError) {
      console.error('[AI Meal Estimate] ❌ Failed to parse JSON:', parseError);
      console.error('[AI Meal Estimate] Raw text:', text);
      
      // Return a safe default with warning
      return new Response(JSON.stringify({
        name: description.trim().substring(0, 50),
        servings: 1,
        calories: 400,
        protein_g: 20,
        carbs_g: 40,
        fat_g: 15,
        fiber_g: 5,
        notes: "⚠️ AI could not parse meal. Using default estimates. Please edit values."
      }), {
        status: 200,
        headers: { "content-type": "application/json", ...CORS_HEADERS }
      });
    }

    // Validate response structure
    if (!jsonResponse.name || typeof jsonResponse.calories !== 'number') {
      console.error('[AI Meal Estimate] ⚠️ Invalid response structure:', jsonResponse);
      
      // Return a safe default with warning
      return new Response(JSON.stringify({
        name: description.trim().substring(0, 50),
        servings: 1,
        calories: 400,
        protein_g: 20,
        carbs_g: 40,
        fat_g: 15,
        fiber_g: 5,
        notes: "⚠️ AI response was incomplete. Using default estimates. Please edit values."
      }), {
        status: 200,
        headers: { "content-type": "application/json", ...CORS_HEADERS }
      });
    }

    // Ensure all required fields have default values
    const finalResponse = {
      name: jsonResponse.name || description.trim().substring(0, 50),
      servings: jsonResponse.servings || 1,
      calories: Math.round(jsonResponse.calories || 0),
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
