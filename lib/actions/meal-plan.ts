"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { FoodResult, MealSlot } from "@/lib/types/food";
import { MEAL_SLOTS } from "@/lib/types/food";

export type PlanSlots = Partial<Record<MealSlot, FoodResult>>;

export type MealPlanRow = {
  id: string;
  name: string;
  slots: PlanSlots;
  created_at: string;
};

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  return { supabase, user: user! };
}

// ─── Save (create or update) ──────────────────────────────────────────────────

export async function saveMealPlan({
  id,
  name,
  slots,
}: {
  id?: string;
  name: string;
  slots: PlanSlots;
}): Promise<{ error: string | null; id?: string }> {
  const { supabase, user } = await getUser();

  if (id) {
    const { error } = await supabase
      .from("meal_plans")
      .update({ name, slots })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) return { error: error.message };
    return { error: null, id };
  }

  const { data, error } = await supabase
    .from("meal_plans")
    .insert({ user_id: user.id, name, slots })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { error: null, id: data.id };
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function getMealPlans(): Promise<{ plans: MealPlanRow[]; error: string | null }> {
  const { supabase, user } = await getUser();

  const { data, error } = await supabase
    .from("meal_plans")
    .select("id, name, slots, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { plans: [], error: error.message };
  return { plans: (data ?? []) as MealPlanRow[], error: null };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteMealPlan(id: string): Promise<{ error: string | null }> {
  const { supabase, user } = await getUser();
  const { error } = await supabase
    .from("meal_plans")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  return { error: error?.message ?? null };
}

// ─── Apply plan to a date (logs all slots) ────────────────────────────────────

export async function applyMealPlan(planId: string, date: string): Promise<{ error: string | null }> {
  const { supabase, user } = await getUser();

  const { data: plan, error: fetchErr } = await supabase
    .from("meal_plans")
    .select("slots")
    .eq("id", planId)
    .eq("user_id", user.id)
    .single();

  if (fetchErr || !plan) return { error: fetchErr?.message ?? "Plan not found" };

  const slots = plan.slots as PlanSlots;
  const rows = MEAL_SLOTS
    .filter((slot) => slots[slot] != null)
    .map((slot) => {
      const food = slots[slot]!;
      return {
        user_id: user.id,
        logged_date: date,
        meal_slot: slot,
        food_name: food.name,
        brand_name: food.brand ?? null,
        calories: Math.round(food.calories),
        protein_g: Math.round(food.protein_g * 10) / 10,
        carbs_g: Math.round(food.carbs_g * 10) / 10,
        fat_g: Math.round(food.fat_g * 10) / 10,
        fiber_g: food.fiber_g ?? null,
        sodium_mg: food.sodium_mg ?? null,
        serving_qty: food.serving_qty,
        serving_unit: food.serving_unit,
        serving_size_g: food.serving_size_g ?? null,
        source: food.source,
        barcode: food.barcode ?? null,
        external_id: food.id ?? null,
      };
    });

  if (rows.length === 0) return { error: "Plan has no meals" };

  const { error } = await supabase.from("food_log").insert(rows);
  return { error: error?.message ?? null };
}

// ─── Generate grocery list ────────────────────────────────────────────────────

export type GroceryItem = {
  name: string;
  qty: number;
  unit: string;
  category: string;
};

const CATEGORIES: { label: string; keywords: string[] }[] = [
  { label: "Produce",   keywords: ["apple","banana","berry","berries","spinach","kale","lettuce","tomato","onion","garlic","pepper","broccoli","carrot","celery","cucumber","avocado","lemon","lime","orange","grape","mango","pineapple","strawberry","blueberry","zucchini","mushroom","potato","sweet potato","yam","corn","pea","bean","edamame","ginger","herb","basil","cilantro","parsley"] },
  { label: "Protein",   keywords: ["chicken","beef","steak","turkey","pork","salmon","tuna","shrimp","fish","tilapia","cod","egg","tofu","tempeh","ground","sirloin","tenderloin","breast","thigh","loin","bison","lamb","venison","bacon","sausage","pepperoni","deli","ham","sardine"] },
  { label: "Dairy",     keywords: ["milk","cheese","yogurt","cottage","cream","butter","whey","casein","mozzarella","cheddar","parmesan","feta","ricotta","gouda","provolone","monterey","jack","brie"] },
  { label: "Grains",    keywords: ["rice","oat","bread","pasta","tortilla","wrap","bagel","cereal","granola","quinoa","barley","flour","cracker","pita","naan","sourdough","waffle","pancake","muffin","couscous","bulgur"] },
  { label: "Pantry",    keywords: ["olive oil","coconut oil","oil","vinegar","sauce","ketchup","mustard","mayo","salsa","soy sauce","hot sauce","honey","maple","jam","jelly","peanut butter","almond butter","nut butter","protein powder","protein shake","supplement","seasoning","salt","pepper","spice","broth","stock","canned","tomato sauce","pasta sauce","dressing"] },
  { label: "Nuts & Seeds", keywords: ["almond","cashew","walnut","pecan","pistachio","peanut","sunflower","pumpkin seed","chia","flax","hemp","mixed nut","trail mix"] },
  { label: "Beverages", keywords: ["water","juice","coffee","tea","energy drink","protein shake","shake","smoothie","drink","milk alternative","almond milk","oat milk","coconut water"] },
  { label: "Frozen",    keywords: ["frozen","ice cream","edamame frozen","frozen berry","frozen vegetable","frozen meal"] },
];

function categorize(name: string): string {
  const lower = name.toLowerCase();
  for (const cat of CATEGORIES) {
    if (cat.keywords.some((kw) => lower.includes(kw))) return cat.label;
  }
  return "Other";
}

export async function getGroceryList(planId: string, days: number = 7): Promise<{ items: GroceryItem[]; error: string | null }> {
  const { supabase, user } = await getUser();

  const { data: plan, error: fetchErr } = await supabase
    .from("meal_plans")
    .select("slots")
    .eq("id", planId)
    .eq("user_id", user.id)
    .single();

  if (fetchErr || !plan) return { items: [], error: fetchErr?.message ?? "Plan not found" };

  const slots = plan.slots as PlanSlots;
  const rawItems: { name: string; qty: number; unit: string }[] = [];

  for (const slot of MEAL_SLOTS) {
    const food = slots[slot];
    if (!food) continue;

    // If it's a custom/recipe food, try to get ingredients
    if (food.source === "custom" && food.id) {
      const { data: customFood } = await supabase
        .from("custom_foods")
        .select("is_recipe, ingredients")
        .eq("id", food.id)
        .eq("user_id", user.id)
        .single();

      if (customFood?.is_recipe && Array.isArray(customFood.ingredients) && customFood.ingredients.length > 0) {
        for (const ing of customFood.ingredients as Array<{ food_name: string; qty: number; unit: string }>) {
          rawItems.push({ name: ing.food_name, qty: ing.qty * days, unit: ing.unit });
        }
        continue;
      }
    }

    // Non-recipe food: add it directly
    rawItems.push({ name: food.name, qty: food.serving_qty * days, unit: food.serving_unit });
  }

  // Merge duplicates by name (case-insensitive)
  const merged = new Map<string, { qty: number; unit: string }>();
  for (const item of rawItems) {
    const key = item.name.toLowerCase();
    const existing = merged.get(key);
    if (existing && existing.unit === item.unit) {
      existing.qty += item.qty;
    } else {
      merged.set(key, { qty: item.qty, unit: item.unit });
    }
  }

  const items: GroceryItem[] = Array.from(merged.entries()).map(([name, { qty, unit }]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    qty: Math.round(qty * 10) / 10,
    unit,
    category: categorize(name),
  }));

  // Sort by category then name
  items.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  return { items, error: null };
}
