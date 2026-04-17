"use server";

import { createClient } from "@/lib/supabase/server";
import { calcBMR, calcTDEE, calcMacros } from "@/lib/macros";
import { getServingsMultiplier } from "@/lib/meal-scaling";
import { lookupIngredient, toGrams } from "@/lib/food-macros";
import { redirect } from "next/navigation";

// ─── Category mapping ──────────────────────────────────────────────────────────

const FOOD_TO_GROCERY: Record<string, string> = {
  protein:   "Protein",
  carb:      "Grains & Carbs",
  fat:       "Pantry",
  vegetable: "Produce",
  other:     "Pantry",
};

// Keywords that override the food-macros category for grocery purposes
const DAIRY_KEYWORDS    = ["milk", "yogurt", "butter", "cream", "kefir", "cheddar", "parmesan", "sour cream", "heavy cream"];
const PRODUCE_KEYWORDS  = ["sweet potato", "banana", "apple", "berr", "orange", "plantain", "avocado"];
// Pantry items sometimes labelled as other categories
const PANTRY_KEYWORDS   = ["oil", "paste", "sauce", "broth", "stock", "honey", "vinegar", "tahini", "salsa", "spice", "seasoning", "salt", "pepper", "cumin", "paprika", "turmeric", "cinnamon", "oregano", "basil", "thyme"];

function getGroceryCategory(name: string, foodCategory: string): string {
  const n = name.toLowerCase();
  if (PANTRY_KEYWORDS.some((k) => n.includes(k))) return "Pantry";
  if (DAIRY_KEYWORDS.some((k) => n.includes(k)))  return "Dairy";
  if (PRODUCE_KEYWORDS.some((k) => n.includes(k))) return "Produce";
  return FOOD_TO_GROCERY[foodCategory] ?? "Other";
}

// ─── Bulk quantity rounding ────────────────────────────────────────────────────
// Always rounds UP to a sensible store-shelf unit so you never run short.

function toBulkDisplay(grams: number, groceryCategory: string, name: string): { qty: number; unit: string } {
  const n = name.toLowerCase();

  // ── Protein ──────────────────────────────────────────────────────────────────
  if (groceryCategory === "Protein") {
    if (n.includes("egg")) {
      const count = Math.ceil(grams / 50);           // ~50 g / egg
      return { qty: Math.ceil(count / 12) * 12, unit: "ct" }; // nearest dozen
    }
    const lbs = grams / 453.592;
    return { qty: Math.ceil(lbs * 4) / 4, unit: "lbs" };      // nearest ¼ lb
  }

  // ── Produce ──────────────────────────────────────────────────────────────────
  if (groceryCategory === "Produce") {
    if (n.includes("garlic")) {
      return { qty: Math.ceil(grams / 4), unit: "cloves" };    // ~4 g / clove
    }
    if (n.includes("avocado")) {
      return { qty: Math.ceil(grams / 150), unit: "ct" };
    }
    if (n.includes("onion") || n.includes("bell pepper") || n.includes("tomato")) {
      return { qty: Math.ceil(grams / 120), unit: "ct" };
    }
    const lbs = grams / 453.592;
    if (lbs < 0.5) {
      return { qty: Math.ceil((grams / 28.35) * 2) / 2, unit: "oz" }; // nearest ½ oz
    }
    return { qty: Math.ceil(lbs * 4) / 4, unit: "lbs" };
  }

  // ── Grains & Carbs ────────────────────────────────────────────────────────────
  if (groceryCategory === "Grains & Carbs") {
    if (n.includes("tortilla") || n.includes("bread") || n.includes("pita") || n.includes("naan")) {
      const pieceG = n.includes("flour tortilla") ? 45 : n.includes("corn tortilla") ? 26 : 28;
      const count  = Math.ceil(grams / pieceG);
      return { qty: Math.ceil(count / 4) * 4, unit: "ct" };   // nearest 4-pack
    }
    const lbs = grams / 453.592;
    if (lbs < 0.5) {
      return { qty: Math.ceil((grams / 28.35) * 2) / 2, unit: "oz" };
    }
    return { qty: Math.ceil(lbs * 2) / 2, unit: "lbs" };       // nearest ½ lb
  }

  // ── Dairy ─────────────────────────────────────────────────────────────────────
  if (groceryCategory === "Dairy") {
    if (n.includes("milk") || n.includes("coconut milk")) {
      const qts = grams / 946;
      return { qty: Math.ceil(qts * 2) / 2, unit: "qt" };
    }
    if (n.includes("butter")) {
      return { qty: Math.ceil(grams / 113), unit: "sticks" };  // 1 stick = 113 g
    }
    if (n.includes("yogurt") || n.includes("sour cream") || n.includes("cream")) {
      const oz = grams / 28.35;
      return { qty: Math.ceil(oz / 8) * 8, unit: "oz" };       // nearest 8 oz container
    }
    const oz = grams / 28.35;
    return { qty: Math.ceil(oz * 2) / 2, unit: "oz" };
  }

  // ── Pantry ────────────────────────────────────────────────────────────────────
  if (n.includes("oil") || n.includes("ghee")) {
    const oz = grams / 28.35;
    return { qty: Math.ceil(oz), unit: "oz" };
  }
  if (n.includes("peanut butter") || n.includes("almond butter")) {
    const oz = grams / 28.35;
    return { qty: Math.ceil(oz / 8) * 8, unit: "oz" };          // nearest 8 oz jar
  }

  // Tiny amounts (spices, sauces) — show in tbsp
  if (grams < 60) {
    const tbsp = grams / 14.79;
    return { qty: Math.ceil(tbsp), unit: "tbsp" };
  }

  const oz = grams / 28.35;
  if (oz < 0.5) return { qty: Math.round(grams), unit: "g" };
  return { qty: Math.ceil(oz), unit: "oz" };
}

// ─── Core generator ────────────────────────────────────────────────────────────

export async function generateGroceryList(userId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles").select("*").eq("id", userId).single();
  if (!profile) return { error: "Profile not found." };

  const bmr    = calcBMR(profile.current_weight_lbs, profile.height_cm, profile.age, profile.gender);
  const tdee   = calcTDEE(bmr, profile.activity_level);
  const macros = calcMacros(tdee, profile.current_weight_lbs, profile.phase);

  // Default training days: Mon–Fri. Stored in profile if available, else fallback.
  const trainingDays: number[] = profile.training_days ?? [1, 2, 3, 4, 5];

  const { data: mealPlans } = await supabase
    .from("meal_plans")
    .select("week_number, day_of_week, meal_slot, recipes(id, name, calories, servings, ingredients)")
    .eq("user_id", userId)
    .order("week_number");

  if (!mealPlans?.length) return { error: "No meal plan found. Generate a plan first." };

  const mealsPerDay = Math.max(...mealPlans.map((e) => e.meal_slot)) as 3 | 4 | 5;

  // Accumulate total grams per ingredient key
  type Accumulator = { grams: number; category: string; displayName: string; unit?: string; qty?: number };
  const acc = new Map<string, Accumulator>();

  for (const entry of mealPlans) {
    const recipe = entry.recipes as unknown as { calories: number; ingredients: { name: string; qty: number; unit: string }[] } | null;
    if (!recipe?.ingredients || !Array.isArray(recipe.ingredients)) continue;

    const isRestDay  = !trainingDays.includes(entry.day_of_week);
    const multiplier = getServingsMultiplier(macros.calories, mealsPerDay, entry.meal_slot, recipe.calories, isRestDay);

    for (const ing of recipe.ingredients) {
      const key  = ing.name.toLowerCase().trim();
      const info = lookupIngredient(ing.name);

      if (info) {
        // Known ingredient — convert to grams and accumulate
        const baseGrams   = toGrams(ing.qty, ing.unit, info);
        const scaledGrams = baseGrams * multiplier;
        const existing    = acc.get(key);
        if (existing) {
          existing.grams += scaledGrams;
        } else {
          acc.set(key, { grams: scaledGrams, category: info.category, displayName: ing.name });
        }
      } else {
        // Unknown ingredient — accumulate raw qty in original unit
        const existing = acc.get(key);
        const scaled   = ing.qty * multiplier;
        if (existing) {
          existing.qty = (existing.qty ?? 0) + scaled;
        } else {
          acc.set(key, { grams: 0, category: "other", displayName: ing.name, unit: ing.unit, qty: scaled });
        }
      }
    }
  }

  // Convert accumulated data to grocery items
  type GroceryItem = { name: string; qty: number; unit: string; category: string; checked: boolean };
  const items: GroceryItem[] = [];

  for (const [, data] of acc) {
    const groceryCategory = getGroceryCategory(data.displayName, data.category);

    if (data.grams > 0) {
      const { qty, unit } = toBulkDisplay(data.grams, groceryCategory, data.displayName);
      if (qty <= 0) continue;
      items.push({
        name:     data.displayName,
        qty:      Math.round(qty * 100) / 100,
        unit,
        category: groceryCategory,
        checked:  false,
      });
    } else if (data.qty && data.qty > 0) {
      // Unknown ingredient — show rounded qty in original unit
      items.push({
        name:     data.displayName,
        qty:      Math.ceil(data.qty),
        unit:     data.unit ?? "unit",
        category: groceryCategory,
        checked:  false,
      });
    }
  }

  // Sort: category order, then alphabetically within each category
  const CAT_ORDER = ["Protein", "Produce", "Dairy", "Grains & Carbs", "Pantry", "Other"];
  items.sort((a, b) => {
    const ci = CAT_ORDER.indexOf(a.category) - CAT_ORDER.indexOf(b.category);
    return ci !== 0 ? ci : a.name.localeCompare(b.name);
  });

  // Persist: week_number = 0 = monthly aggregated list
  await supabase.from("grocery_lists").delete().eq("user_id", userId).eq("week_number", 0);
  const { error: insertError } = await supabase
    .from("grocery_lists")
    .insert({ user_id: userId, week_number: 0, items });

  if (insertError) return { error: "Failed to save grocery list: " + insertError.message };
  return { error: null };
}

// ─── Server action for the client "Regenerate" button ─────────────────────────

export async function regenerateGroceryList(): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  return generateGroceryList(user!.id);
}
