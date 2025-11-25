
// Edge Runtime types are automatically available in Deno Deploy

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

interface MealEstimateRequest {
  description: string;
  imageBase64: string | null;
}

interface MealEstimateResponse {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fats_g: number;
  fiber_g: number;
}

Deno.serve(async (req) => {
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
    // Get API key from environment - USING OPENROUTER
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    
    if (!OPENROUTER_API_KEY) {
      console.error('[AI-MEAL] CRITICAL: OPENROUTER_API_KEY not configured');
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { "content-type": "application/json", ...CORS_HEADERS }
      });
    }

    // Parse JSON body
    const body: MealEstimateRequest = await req.json();
    const { description, imageBase64 } = body;

    console.log("[AI-MEAL] request", { hasImage: !!imageBase64 });

    // Validate required field
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Description is required" }), {
        status: 400,
        headers: { "content-type": "application/json", ...CORS_HEADERS }
      });
    }

    // Build the system prompt for strict JSON output
    const systemPrompt = `You are a nutrition assistant. The user describes a meal (and may send a photo). 
Estimate total calories, protein_g, carbs_g, fats_g, and fiber_g for 1 serving.
Respond ONLY with strict JSON in this exact format:
{
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fats_g": number,
  "fiber_g": number
}
No extra text, no markdown, no explanations.`;

    // Prepare content for OpenRouter (OpenAI-compatible format)
    const userContent: { type: string; text?: string; image_url?: { url: string } }[] = [
      { type: "text", text: description.trim() }
    ];

    // Add image if provided
    if (imageBase64 && typeof imageBase64 === 'string') {
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${imageBase64}`
        }
      });
    }

    // Helper function to call OpenRouter
    const callOpenRouter = async (retryPrompt?: string): Promise<Response> => {
      const messages = retryPrompt 
        ? [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
            { role: "assistant", content: "I'll provide the nutrition estimate in strict JSON format." },
            { role: "user", content: retryPrompt }
          ]
        : [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent }
          ];

      return await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://esgptfiofoaeguslgvcq.supabase.co",
          "X-Title": "Elite Macro Tracker"
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: messages,
          temperature: 0.7,
          max_tokens: 500,
          response_format: { type: "json_object" }
        })
      });
    };

    // First attempt
    let openrouterResponse = await callOpenRouter();

    // Handle non-OK responses
    if (!openrouterResponse.ok) {
      const status = openrouterResponse.status;
      console.error('[AI-MEAL] OpenRouter request failed:', status);
      
      return new Response(JSON.stringify({
        error: "OpenRouter request failed",
        status: status
      }), {
        status: 502,
        headers: { "content-type": "application/json", ...CORS_HEADERS }
      });
    }

    const openrouterData = await openrouterResponse.json();
    let responseText = openrouterData?.choices?.[0]?.message?.content;
    
    if (!responseText) {
      console.error('[AI-MEAL] No content in OpenRouter response');
      return new Response(JSON.stringify({
        error: "Invalid JSON from model"
      }), {
        status: 502,
        headers: { "content-type": "application/json", ...CORS_HEADERS }
      });
    }

    // Try to parse JSON response
    let jsonResponse: any;
    try {
      jsonResponse = JSON.parse(responseText);
    } catch (parseError) {
      console.warn('[AI-MEAL] Invalid JSON on first attempt, retrying...');
      
      // Retry with explicit instruction
      openrouterResponse = await callOpenRouter("Return ONLY valid JSON, no text outside JSON.");
      
      if (!openrouterResponse.ok) {
        return new Response(JSON.stringify({
          error: "OpenRouter request failed",
          status: openrouterResponse.status
        }), {
          status: 502,
          headers: { "content-type": "application/json", ...CORS_HEADERS }
        });
      }

      const retryData = await openrouterResponse.json();
      responseText = retryData?.choices?.[0]?.message?.content;
      
      if (!responseText) {
        return new Response(JSON.stringify({
          error: "Invalid JSON from model"
        }), {
          status: 502,
          headers: { "content-type": "application/json", ...CORS_HEADERS }
        });
      }

      try {
        jsonResponse = JSON.parse(responseText);
      } catch (retryParseError) {
        console.error('[AI-MEAL] Invalid JSON after retry');
        return new Response(JSON.stringify({
          error: "Invalid JSON from model"
        }), {
          status: 502,
          headers: { "content-type": "application/json", ...CORS_HEADERS }
        });
      }
    }

    // Ensure all fields exist and are numbers, default to 0 if missing
    const finalResponse: MealEstimateResponse = {
      calories: Number(jsonResponse.calories) || 0,
      protein_g: Number(jsonResponse.protein_g) || 0,
      carbs_g: Number(jsonResponse.carbs_g) || 0,
      fats_g: Number(jsonResponse.fats_g) || 0,
      fiber_g: Number(jsonResponse.fiber_g) || 0
    };

    return new Response(JSON.stringify(finalResponse), {
      status: 200,
      headers: { "content-type": "application/json", ...CORS_HEADERS }
    });

  } catch (error) {
    console.error('[AI-MEAL] Unexpected error:', error);
    
    return new Response(JSON.stringify({
      error: "AI estimation failed",
      details: error instanceof Error ? error.message : String(error)
    }), {
      status: 500,
      headers: { "content-type": "application/json", ...CORS_HEADERS }
    });
  }
});
