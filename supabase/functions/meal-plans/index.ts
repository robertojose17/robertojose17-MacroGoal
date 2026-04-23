import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const PROTEIN_KEYWORDS = ["chicken", "beef", "pork", "fish", "salmon", "tuna", "turkey", "egg", "shrimp", "tofu", "meat", "steak", "lamb"];
const VEGETABLE_KEYWORDS = ["broccoli", "spinach", "carrot", "lettuce", "tomato", "cucumber", "pepper", "onion", "garlic", "kale", "zucchini", "celery", "asparagus"];
const FRUIT_KEYWORDS = ["apple", "banana", "orange", "berry", "strawberry", "mango", "grape", "peach", "pear", "melon", "blueberry", "raspberry"];
const DAIRY_KEYWORDS = ["milk", "cheese", "yogurt", "butter", "cream", "whey", "cottage"];
const GRAIN_KEYWORDS = ["rice", "oat", "bread", "pasta", "quinoa", "wheat", "flour", "cereal", "tortilla", "bagel", "wrap", "noodle"];

function categorizeFood(name: string): { category: string; emoji: string } {
  const lower = name.toLowerCase();
  if (PROTEIN_KEYWORDS.some(k => lower.includes(k))) return { category: "Proteins", emoji: "🥩" };
  if (VEGETABLE_KEYWORDS.some(k => lower.includes(k))) return { category: "Vegetables", emoji: "🥦" };
  if (FRUIT_KEYWORDS.some(k => lower.includes(k))) return { category: "Fruits", emoji: "🍎" };
  if (DAIRY_KEYWORDS.some(k => lower.includes(k))) return { category: "Dairy", emoji: "🥛" };
  if (GRAIN_KEYWORDS.some(k => lower.includes(k))) return { category: "Grains", emoji: "🌾" };
  return { category: "Other", emoji: "🛒" };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return json({ error: "Unauthorized" }, 401);

  const url = new URL(req.url);
  let path = url.pathname.replace(/^\/functions\/v1\/meal-plans/, "") || "/";
  if (path === "") path = "/";
  const method = req.method;
  const segments = path.split("/").filter(Boolean);

  try {
    // GET /meal-plans — list all plans for user
    if (method === "GET" && segments.length === 0) {
      const { data, error } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);
      return json({ plans: data || [] });
    }

    // POST /meal-plans — create a new plan
    if (method === "POST" && segments.length === 0) {
      const body = await req.json();
      const { name, start_date, end_date } = body;
      if (!name || !start_date || !end_date) return json({ error: "name, start_date, end_date are required" }, 400);
      const { data, error } = await supabase
        .from("meal_plans")
        .insert({ user_id: user.id, name, start_date, end_date })
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      return json(data, 201);
    }

    const planId = segments[0];

    // GET /meal-plans/:id — get plan with items
    if (method === "GET" && segments.length === 1) {
      const { data: plan, error: planError } = await supabase
        .from("meal_plans")
        .select("*")
        .eq("id", planId)
        .eq("user_id", user.id)
        .single();
      if (planError || !plan) return json({ error: "Not found" }, 404);

      const { data: items, error: itemsError } = await supabase
        .from("meal_plan_items")
        .select("*")
        .eq("plan_id", planId)
        .order("date", { ascending: true })
        .order("created_at", { ascending: true });
      if (itemsError) return json({ error: itemsError.message }, 500);

      return json({ ...plan, items: items || [] });
    }

    // DELETE /meal-plans/:id — delete plan
    if (method === "DELETE" && segments.length === 1) {
      const { error } = await supabase
        .from("meal_plans")
        .delete()
        .eq("id", planId)
        .eq("user_id", user.id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // GET /meal-plans/:id/grocery-list
    if (method === "GET" && segments.length === 2 && segments[1] === "grocery-list") {
      const { data: plan, error: planError } = await supabase
        .from("meal_plans")
        .select("name")
        .eq("id", planId)
        .eq("user_id", user.id)
        .single();
      if (planError || !plan) return json({ error: "Not found" }, 404);

      const { data: items, error: itemsError } = await supabase
        .from("meal_plan_items")
        .select("food_name, brand, grams, quantity, calories")
        .eq("plan_id", planId);
      if (itemsError) return json({ error: itemsError.message }, 500);

      // Group by food name (case-insensitive), sum grams
      const grouped: Record<string, { name: string; brand: string | null; total_grams: number; total_qty: number }> = {};
      for (const item of (items || [])) {
        const key = item.food_name.toLowerCase().trim();
        if (!grouped[key]) {
          grouped[key] = { name: item.food_name, brand: item.brand || null, total_grams: 0, total_qty: 0 };
        }
        grouped[key].total_grams += item.grams || (item.quantity * 100);
        grouped[key].total_qty += item.quantity || 1;
      }

      // Categorize
      const categoryMap: Record<string, { category: string; emoji: string; items: { name: string; brand: string | null; total_grams: number; display_amount: string }[] }> = {};
      for (const entry of Object.values(grouped)) {
        const { category, emoji } = categorizeFood(entry.name);
        if (!categoryMap[category]) categoryMap[category] = { category, emoji, items: [] };
        categoryMap[category].items.push({
          name: entry.name,
          brand: entry.brand,
          total_grams: Math.round(entry.total_grams),
          display_amount: `${Math.round(entry.total_grams)} g`,
        });
      }

      const categoryOrder = ["Proteins", "Vegetables", "Fruits", "Dairy", "Grains", "Other"];
      const categories = categoryOrder
        .filter(c => categoryMap[c])
        .map(c => categoryMap[c]);

      return json({ plan_name: plan.name, categories });
    }

    // POST /meal-plans/:id/items — add item to plan
    if (method === "POST" && segments.length === 2 && segments[1] === "items") {
      // Verify plan belongs to user
      const { data: plan, error: planError } = await supabase
        .from("meal_plans")
        .select("id")
        .eq("id", planId)
        .eq("user_id", user.id)
        .single();
      if (planError || !plan) return json({ error: "Not found" }, 404);

      const body = await req.json();
      const { date, meal_type, food_name, brand, quantity, grams, serving_description, calories, protein, carbs, fats, fiber } = body;
      if (!date || !meal_type || !food_name) return json({ error: "date, meal_type, food_name are required" }, 400);

      const { data, error } = await supabase
        .from("meal_plan_items")
        .insert({ plan_id: planId, date, meal_type, food_name, brand: brand || null, quantity: quantity || 1, grams: grams || null, serving_description: serving_description || null, calories: calories || 0, protein: protein || 0, carbs: carbs || 0, fats: fats || 0, fiber: fiber || 0 })
        .select()
        .single();
      if (error) return json({ error: error.message }, 500);
      return json(data, 201);
    }

    // DELETE /meal-plans/:id/items/:itemId
    if (method === "DELETE" && segments.length === 3 && segments[1] === "items") {
      const itemId = segments[2];
      // Verify plan belongs to user
      const { data: plan, error: planError } = await supabase
        .from("meal_plans")
        .select("id")
        .eq("id", planId)
        .eq("user_id", user.id)
        .single();
      if (planError || !plan) return json({ error: "Not found" }, 404);

      const { error } = await supabase
        .from("meal_plan_items")
        .delete()
        .eq("id", itemId)
        .eq("plan_id", planId);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});
