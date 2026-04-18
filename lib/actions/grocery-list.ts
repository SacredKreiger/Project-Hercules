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

// ─── Price estimates (US avg retail, 2026) ────────────────────────────────────
// Returns price per display unit (the same unit toBulkDisplay produces).

function pricePerUnit(name: string, unit: string, category: string): number {
  const n = name.toLowerCase();

  if (unit === "lbs") {
    // Proteins
    if (n.includes("chicken breast"))                         return 5.49;
    if (n.includes("chicken thigh"))                          return 4.49;
    if (n.includes("ground chicken"))                         return 4.99;
    if (n.includes("ground beef"))                            return 6.99;
    if (n.includes("ground turkey"))                          return 5.99;
    if (n.includes("turkey breast") || n.includes("turkey"))  return 6.49;
    if (n.includes("salmon"))                                 return 9.99;
    if (n.includes("tilapia"))                                return 5.99;
    if (n.includes("tuna"))                                   return 5.49;
    if (n.includes("shrimp"))                                 return 9.99;
    if (n.includes("pork"))                                   return 5.49;
    if (n.includes("beef") || n.includes("steak") || n.includes("sirloin")) return 8.99;
    if (n.includes("lamb"))                                   return 10.99;
    if (n.includes("tofu") || n.includes("tempeh"))           return 3.99;
    // Produce
    if (n.includes("sweet potato"))  return 1.49;
    if (n.includes("banana"))        return 0.69;
    if (n.includes("apple"))         return 2.29;
    if (n.includes("berr"))          return 4.49;
    if (n.includes("orange"))        return 1.69;
    if (n.includes("plantain"))      return 0.89;
    if (n.includes("spinach") || n.includes("kale"))  return 4.49;
    if (n.includes("broccoli"))      return 2.29;
    if (n.includes("cabbage"))       return 0.99;
    if (n.includes("carrot"))        return 1.49;
    if (n.includes("zucchini"))      return 1.69;
    if (n.includes("green bean"))    return 2.29;
    // Grains
    if (n.includes("rice"))          return 1.69;
    if (n.includes("oat"))           return 1.19;
    if (n.includes("pasta") || n.includes("spaghetti") || n.includes("noodle")) return 1.69;
    if (n.includes("quinoa"))        return 4.49;
    if (n.includes("couscous"))      return 3.29;
    if (n.includes("lentil") || n.includes("bean") || n.includes("chickpea")) return 2.29;
    // Fallback by category
    if (category === "Protein")        return 6.99;
    if (category === "Produce")        return 2.29;
    if (category === "Grains & Carbs") return 2.29;
    return 3.49;
  }

  if (unit === "oz") {
    if (n.includes("oil") || n.includes("ghee"))              return 0.45;
    if (n.includes("peanut butter") || n.includes("almond butter")) return 0.35;
    if (n.includes("cheddar") || n.includes("parmesan") || n.includes("cheese")) return 0.60;
    if (n.includes("greek yogurt") || n.includes("yogurt"))   return 0.22;
    if (n.includes("sour cream"))                             return 0.22;
    if (n.includes("heavy cream") || n.includes("cream"))     return 0.30;
    if (n.includes("tofu") || n.includes("tempeh"))           return 0.23;
    if (n.includes("coconut milk"))                           return 0.35;
    if (category === "Dairy")   return 0.35;
    if (category === "Pantry")  return 0.40;
    return 0.30;
  }

  if (unit === "ct") {
    // Eggs elevated due to ongoing supply constraints (~$5.40/doz)
    if (n.includes("egg"))                                    return 0.45;
    if (n.includes("flour tortilla"))                         return 0.55; // ~$4.49 for 8
    if (n.includes("corn tortilla"))                          return 0.28; // ~$3.29 for 12
    if (n.includes("tortilla"))                               return 0.42;
    if (n.includes("pita"))                                   return 0.85;
    if (n.includes("naan"))                                   return 1.49;
    if (n.includes("bread"))                                  return 0.25; // ~$3.99 for 16
    if (n.includes("avocado"))                                return 1.25;
    if (n.includes("onion"))                                  return 0.99;
    if (n.includes("bell pepper") || n.includes("pepper"))   return 1.49;
    if (n.includes("tomato"))                                 return 1.69;
    return 0.60;
  }

  if (unit === "cloves") return 0.12;

  if (unit === "qt") {
    if (n.includes("coconut milk"))                           return 3.49;
    if (n.includes("broth") || n.includes("stock"))          return 2.99;
    return 2.49; // regular milk
  }

  if (unit === "sticks") return 1.75; // butter ~$6.99/4 sticks

  if (unit === "tbsp") {
    if (n.includes("honey"))  return 0.30;
    if (n.includes("tahini")) return 0.35;
    if (n.includes("oil"))    return 0.12;
    return 0.12;
  }

  return 0.35; // safe fallback
}

// ─── Core generator ────────────────────────────────────────────────────────────

export async function generateGroceryList(userId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles").select("*").eq("id", userId).single();
  if (profileError || !profile) return { error: profileError?.message ?? "Profile not found." };

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
  type GroceryItem = { name: string; qty: number; unit: string; category: string; checked: boolean; cost: number };
  const items: GroceryItem[] = [];

  for (const [, data] of acc) {
    const groceryCategory = getGroceryCategory(data.displayName, data.category);

    if (data.grams > 0) {
      const { qty, unit } = toBulkDisplay(data.grams, groceryCategory, data.displayName);
      if (qty <= 0) continue;
      const roundedQty = Math.round(qty * 100) / 100;
      const cost = Math.round(roundedQty * pricePerUnit(data.displayName, unit, groceryCategory) * 100) / 100;
      items.push({
        name:     data.displayName,
        qty:      roundedQty,
        unit,
        category: groceryCategory,
        checked:  false,
        cost,
      });
    } else if (data.qty && data.qty > 0) {
      const roundedQty = Math.ceil(data.qty);
      items.push({
        name:     data.displayName,
        qty:      roundedQty,
        unit:     data.unit ?? "unit",
        category: groceryCategory,
        checked:  false,
        cost:     0,
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
