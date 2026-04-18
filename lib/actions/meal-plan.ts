"use server";

import { createClient } from "@/lib/supabase/server";
import { calcBMR, calcTDEE, calcMacros } from "@/lib/macros";
import { redirect } from "next/navigation";
import { generateGroceryList } from "@/lib/actions/grocery-list";

const DAY_TYPES: Record<number, "work" | "off" | "cook"> = {
  0: "off", 1: "work", 2: "work", 3: "work", 4: "work", 5: "work", 6: "cook",
};

const RESTRICTION_TAGS: Record<string, string> = {
  vegetarian: "vegetarian",
  vegan: "vegan",
  "gluten-free": "gluten-free",
  "dairy-free": "dairy-free",
  "nut-free": "nut-free",
  halal: "halal",
};

// Calorie distribution per meal slot by meals-per-day setting
const MEAL_CONFIG: Record<number, { slots: { slot: number; type: string }[]; calSplit: Record<number, number> }> = {
  3: {
    slots: [
      { slot: 1, type: "breakfast" },
      { slot: 2, type: "lunch" },
      { slot: 3, type: "dinner" },
    ],
    calSplit: { 1: 0.30, 2: 0.40, 3: 0.30 },
  },
  4: {
    slots: [
      { slot: 1, type: "breakfast" },
      { slot: 2, type: "lunch" },
      { slot: 3, type: "dinner" },
      { slot: 4, type: "snack" },
    ],
    calSplit: { 1: 0.25, 2: 0.35, 3: 0.30, 4: 0.10 },
  },
  5: {
    slots: [
      { slot: 1, type: "breakfast" },
      { slot: 2, type: "snack" },
      { slot: 3, type: "lunch" },
      { slot: 4, type: "snack" },
      { slot: 5, type: "dinner" },
    ],
    calSplit: { 1: 0.20, 2: 0.12, 3: 0.28, 4: 0.12, 5: 0.28 },
  },
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type SlotTargets = { calories: number; protein: number; carbs: number; fat: number };

/**
 * Picks the best recipe for a meal slot using a weighted macro score.
 * Protein is weighted highest (40%) since it's the critical fitness macro,
 * followed by calories (35%), fat (15%), carbs (10%).
 * Picks randomly from the top 3 matches to maintain daily variety.
 */
function pickRecipe(pool: any[], targets: SlotTargets, usedIds: Set<string>): any {
  const available = pool.filter((r) => !usedIds.has(r.id));
  const source = available.length > 0 ? available : pool;

  function proximity(actual: number, target: number) {
    if (!target) return 1;
    return Math.max(0, 1 - Math.abs(actual - target) / target);
  }

  const scored = source.map((r) => ({
    recipe: r,
    score:
      0.40 * proximity(r.protein_g, targets.protein) +
      0.35 * proximity(r.calories,  targets.calories) +
      0.15 * proximity(r.fat_g,     targets.fat) +
      0.10 * proximity(r.carbs_g,   targets.carbs),
  }));

  scored.sort((a, b) => b.score - a.score);
  // Pick randomly from top 3 so the plan has variety while still hitting targets
  const top = scored.slice(0, Math.min(3, scored.length));
  return shuffle(top.map((s) => s.recipe))[0];
}

type PlanConfig = {
  userId: string;
  profile: any;
  cuisines: string[];
  restrictions: string[];
  mixAll: boolean;
  mealsPerDay: 3 | 4 | 5;
  prepStyle: "daily" | "batch_weekly" | "batch_biweekly";
  trainingDays: number[]; // 0=Sun … 6=Sat
};

const TOTAL_WEEKS = 4;

async function generatePlan(config: PlanConfig) {
  const supabase = await createClient();
  const { userId, profile, cuisines, restrictions, mixAll, mealsPerDay, prepStyle, trainingDays } = config;

  const bmr = calcBMR(profile.current_weight_lbs, profile.height_cm, profile.age, profile.gender);
  const tdee = calcTDEE(bmr, profile.activity_level);
  const macros = calcMacros(tdee, profile.current_weight_lbs, profile.phase);

  const recipesQuery = supabase.from("recipes").select("id, name, meal_type, calories, protein_g, carbs_g, fat_g, tags");
  const { data: allRecipes } = mixAll
    ? await recipesQuery
    : await recipesQuery.in("cuisine", cuisines);

  if (!allRecipes?.length) return { error: "No recipes found for selected cuisines." };

  const requiredTags = restrictions.map((r) => RESTRICTION_TAGS[r]).filter(Boolean);
  const filtered = requiredTags.length > 0
    ? allRecipes.filter((r) => requiredTags.every((tag) => Array.isArray(r.tags) && r.tags.includes(tag)))
    : allRecipes;
  const finalRecipes = filtered.length > 0 ? filtered : allRecipes;

  const byType: Record<string, any[]> = { breakfast: [], lunch: [], dinner: [], snack: [], shake: [] };
  for (const r of finalRecipes) byType[r.meal_type]?.push(r);

  // Delete the entire month plan for this user before regenerating
  await supabase.from("meal_plans").delete().eq("user_id", userId);

  const { slots, calSplit } = MEAL_CONFIG[mealsPerDay];
  const allEntries: any[] = [];

  // Tracks recipes used in the previous week to maximise variety week-over-week
  let lastWeekUsed: Record<string, Set<string>> = Object.fromEntries(
    Object.keys(byType).map((k) => [k, new Set<string>()])
  );

  for (let week = 1; week <= TOTAL_WEEKS; week++) {
    // Seed this week's exclusion list with last week's picks
    const usedIds: Record<string, Set<string>> = Object.fromEntries(
      Object.keys(byType).map((k) => [k, new Set<string>(lastWeekUsed[k] ?? [])])
    );
    const thisWeekUsed: Record<string, Set<string>> = Object.fromEntries(
      Object.keys(byType).map((k) => [k, new Set<string>()])
    );

    if (prepStyle === "daily") {
      for (let dow = 0; dow < 7; dow++) {
        const isTraining = trainingDays.includes(dow);
        const calMultiplier = isTraining ? 1.0 : 0.85;
        for (const { slot, type } of slots) {
          const pool = byType[type];
          if (!pool?.length) continue;
          const f = calSplit[slot] * calMultiplier;
          const targets: SlotTargets = {
            calories: macros.calories * f,
            protein:  macros.protein  * f,
            carbs:    macros.carbs    * f,
            fat:      macros.fat      * f,
          };
          const recipe = pickRecipe(pool, targets, usedIds[type]);
          usedIds[type].add(recipe.id);
          thisWeekUsed[type].add(recipe.id);
          allEntries.push({ user_id: userId, week_number: week, day_of_week: dow, day_type: DAY_TYPES[dow], meal_slot: slot, recipe_id: recipe.id });
        }
      }
    } else {
      // Batch: pick 2 recipe sets per week, assign by day range
      const switchDay = prepStyle === "batch_biweekly" ? 3 : 4;
      const setA: Record<number, any> = {};
      const setB: Record<number, any> = {};

      for (const { slot, type } of slots) {
        const pool = byType[type];
        if (!pool?.length) continue;
        const f = calSplit[slot];
        const targets: SlotTargets = {
          calories: macros.calories * f,
          protein:  macros.protein  * f,
          carbs:    macros.carbs    * f,
          fat:      macros.fat      * f,
        };
        setA[slot] = pickRecipe(pool, targets, usedIds[type]);
        usedIds[type].add(setA[slot].id);
        thisWeekUsed[type].add(setA[slot].id);
        setB[slot] = pickRecipe(pool, targets, usedIds[type]);
        usedIds[type].add(setB[slot].id);
        thisWeekUsed[type].add(setB[slot].id);
      }

      for (let dow = 0; dow < 7; dow++) {
        const recipeSet = dow < switchDay ? setA : setB;
        for (const { slot } of slots) {
          const recipe = recipeSet[slot];
          if (!recipe) continue;
          allEntries.push({ user_id: userId, week_number: week, day_of_week: dow, day_type: DAY_TYPES[dow], meal_slot: slot, recipe_id: recipe.id });
        }
      }
    }

    lastWeekUsed = thisWeekUsed;
  }

  if (allEntries.length === 0) return { error: "No recipes found for your selections." };

  const { error: insertError } = await supabase.from("meal_plans").insert(allEntries);
  if (insertError) return { error: "Failed to save meal plan: " + insertError.message };

  return { error: null };
}

export async function reconfigureMealPlan(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (profileError || !profile) redirect("/onboarding");

  const mixAll = formData.get("mix") === "true";
  const cuisines = formData.getAll("cuisines") as string[];
  const restrictions = formData.getAll("restrictions") as string[];
  const mealsPerDay = (Number(formData.get("meals_per_day")) || 4) as 3 | 4 | 5;
  const prepStyle = (formData.get("prep_style") as PlanConfig["prepStyle"]) || "daily";
  const trainingDays = formData.getAll("training_days").map(Number);

  if (!mixAll && cuisines.length === 0) {
    return { error: "Pick at least one cuisine or use Mix it up." };
  }

  // Save cuisine + restriction prefs to profile
  await supabase.from("profiles").update({
    cuisine_preferences: mixAll ? [] : cuisines,
    dietary_restrictions: restrictions,
  }).eq("id", user.id);

  const { error } = await generatePlan({
    userId: user.id, profile, cuisines, restrictions, mixAll,
    mealsPerDay, prepStyle, trainingDays,
  });

  if (error) return { error };

  // Auto-generate the monthly grocery list from the new plan
  await generateGroceryList(user.id);

  redirect("/meals");
}
