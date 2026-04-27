import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "openai/gpt-4o-mini";

const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE!, {
  auth: { persistSession: false }
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

function buildSystemPrompt(userGoals: {
  daily_calories: number;
  daily_protein: number;
  daily_carbs: number;
  daily_fats: number;
}): string {
  return `You are an expert nutritionist and meal planner. Your job is to create a personalized daily meal plan for the user.

The user's daily macro targets are:
- Calories: ${userGoals.daily_calories} kcal
- Protein: ${userGoals.daily_protein}g
- Carbs: ${userGoals.daily_carbs}g
- Fats: ${userGoals.daily_fats}g

RULES:
1. Create a realistic, delicious meal plan with Breakfast, Lunch, Dinner, and Snack
2. The total macros must be as close as possible to the user's targets
3. Use real, common foods with accurate nutritional data
4. When the user asks for changes (remove a food, swap something, add more protein, etc.), adjust the plan and show the updated version
5. Always show the running macro totals after each change so the user can see how close they are to their targets
6. Keep responses concise and friendly
7. When the user is satisfied (says "save", "guardar", "listo", "looks good", "perfect", "save it", "save this", or similar), respond ONLY with a JSON code block in this exact format and nothing else:

\`\`\`json
{
  "ready_to_save": true,
  "plan": {
    "breakfast": [{ "name": "...", "calories": 0, "protein": 0, "carbs": 0, "fats": 0, "fiber": 0, "quantity": 1, "serving_description": "..." }],
    "lunch": [],
    "dinner": [],
    "snack": []
  },
  "summary": "Brief summary of total macros"
}
\`\`\`

Start by proposing a complete meal plan that hits the user's targets. Be specific with food names and portions.`;
}

function parseMealPlanResponse(content: string): {
  message: string;
  planData: any | null;
  readyToSave: boolean;
  summary: string | null;
} {
  const jsonBlockMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    try {
      const parsed = JSON.parse(jsonBlockMatch[1].trim());
      if (parsed.ready_to_save === true && parsed.plan) {
        return {
          message: parsed.summary || "Your meal plan is ready to save!",
          planData: parsed.plan,
          readyToSave: true,
          summary: parsed.summary || null
        };
      }
    } catch (e) {
      console.log("[MealPlan] Failed to parse JSON block:", e);
    }
  }
  return {
    message: content,
    planData: null,
    readyToSave: false,
    summary: null
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  console.log("[MealPlan] New request:", requestId);

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!OPENROUTER_API_KEY) {
      return new Response(JSON.stringify({
        error: "Configuration Error",
        detail: "OPENROUTER_API_KEY is not configured."
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const auth = req.headers.get("Authorization") || "";
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized", detail: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const token = auth.replace("Bearer ", "");
    const { data: user, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized", detail: authError?.message || "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log("[MealPlan] User authenticated:", user.user.id);

    let body: any;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid Request", detail: "Request body must be valid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const messages: Array<{ role: string; content: string }> = body.messages || [];
    const userGoals = body.userGoals || {
      daily_calories: 2000,
      daily_protein: 150,
      daily_carbs: 200,
      daily_fats: 65
    };

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid Request", detail: "messages array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const systemPrompt = buildSystemPrompt(userGoals);
    const apiMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((msg: any) => ({ role: msg.role, content: msg.content }))
    ];

    console.log("[MealPlan] Calling OpenRouter with", apiMessages.length, "messages");
    const started = performance.now();

    let chatRes;
    try {
      chatRes = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": SUPABASE_URL!,
          "X-Title": "Macro Goal Meal Planner"
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          messages: apiMessages,
          temperature: 0.7,
          max_tokens: 2000
        })
      });
    } catch (fetchError: any) {
      return new Response(JSON.stringify({
        error: "Network Error",
        detail: `Failed to connect to OpenRouter: ${fetchError.message}`,
        request_id: requestId
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!chatRes.ok) {
      const errorText = await chatRes.text();
      let errorDetail = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetail = errorJson.error?.message || errorJson.message || errorText;
      } catch (_) {}
      return new Response(JSON.stringify({
        error: "OpenRouter API Error",
        detail: errorDetail,
        status_code: chatRes.status,
        request_id: requestId
      }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    let jsonResp: any;
    try {
      jsonResp = await chatRes.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid Response", detail: "OpenRouter returned invalid JSON" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const rawMessage: string = jsonResp?.choices?.[0]?.message?.content ?? "";
    if (!rawMessage) {
      return new Response(JSON.stringify({ error: "Empty Response", detail: "OpenRouter returned an empty completion" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const duration_ms = Math.round(performance.now() - started);
    console.log("[MealPlan] Response received in", duration_ms, "ms");

    const { message, planData, readyToSave, summary } = parseMealPlanResponse(rawMessage);

    return new Response(JSON.stringify({
      message,
      planData,
      readyToSave,
      summary,
      duration_ms
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e: any) {
    console.error("[MealPlan] Unhandled error:", e.message);
    return new Response(JSON.stringify({
      error: "Internal Server Error",
      detail: String(e.message || e),
      request_id: requestId
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
