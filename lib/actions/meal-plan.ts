"use server";

import { createClient } from "@/lib/supabase/server";
import { calcBMR, calcTDEE, calcMacros, getEffectiveMacros } from "@/lib/macros";
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
  prepStyle: "daily" | "batch_weekly" | "batch_biweekly" | "repeat_daily";
  trainingDays: number[]; // 0=Sun … 6=Sat
  cheatDay: number | null;
};

const TOTAL_WEEKS = 4;

async function generatePlan(config: PlanConfig) {
  const supabase = await createClient();
  const { userId, profile, cuisines, restrictions, mixAll, mealsPerDay, prepStyle, trainingDays, cheatDay } = config;

  const macros = getEffectiveMacros(profile);

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

  // Only delete unlocked entries so locked meals are preserved
  await supabase.from("meal_plans").delete().eq("user_id", userId).eq("locked", false);

  const { data: lockedRows } = await supabase
    .from("meal_plans")
    .select("week_number, day_of_week, meal_slot")
    .eq("user_id", userId)
    .eq("locked", true);
  const lockedSet = new Set(
    (lockedRows ?? []).map((r) => `${r.week_number}-${r.day_of_week}-${r.meal_slot}`)
  );

  const { slots, calSplit } = MEAL_CONFIG[mealsPerDay];
  const allEntries: any[] = [];

  // For repeat_daily: pick one recipe set once and reuse across all weeks/days
  const repeatDailySet: Record<number, any> = {};
  if (prepStyle === "repeat_daily") {
    const { slots: rdSlots, calSplit: rdCalSplit } = MEAL_CONFIG[mealsPerDay];
    const rdUsed: Record<string, Set<string>> = Object.fromEntries(
      Object.keys(byType).map((k) => [k, new Set<string>()])
    );
    for (const { slot, type } of rdSlots) {
      const pool = byType[type];
      if (!pool?.length) continue;
      const f = rdCalSplit[slot];
      const targets: SlotTargets = {
        calories: macros.calories * f,
        protein:  macros.protein  * f,
        carbs:    macros.carbs    * f,
        fat:      macros.fat      * f,
      };
      repeatDailySet[slot] = pickRecipe(pool, targets, rdUsed[type]);
    }
  }

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
        if (cheatDay !== null && dow === cheatDay) continue; // skip cheat day
        const isTraining = trainingDays.includes(dow);
        const calMultiplier = isTraining ? 1.0 : 0.85;
        for (const { slot, type } of slots) {
          if (lockedSet.has(`${week}-${dow}-${slot}`)) continue; // skip — user has locked this slot
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
          allEntries.push({ user_id: userId, week_number: week, day_of_week: dow, day_type: DAY_TYPES[dow], meal_slot: slot, recipe_id: recipe.id, locked: false });
        }
      }
    } else if (prepStyle === "batch_weekly" || prepStyle === "batch_biweekly") {
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
        if (cheatDay !== null && dow === cheatDay) continue; // skip cheat day
        const recipeSet = dow < switchDay ? setA : setB;
        for (const { slot } of slots) {
          if (lockedSet.has(`${week}-${dow}-${slot}`)) continue; // skip — user has locked this slot
          const recipe = recipeSet[slot];
          if (!recipe) continue;
          allEntries.push({ user_id: userId, week_number: week, day_of_week: dow, day_type: DAY_TYPES[dow], meal_slot: slot, recipe_id: recipe.id, locked: false });
        }
      }
    } else if (prepStyle === "repeat_daily") {
      for (let dow = 0; dow < 7; dow++) {
        if (cheatDay !== null && dow === cheatDay) continue; // skip cheat day
        for (const { slot } of slots) {
          if (lockedSet.has(`${week}-${dow}-${slot}`)) continue; // skip — user has locked this slot
          const recipe = repeatDailySet[slot];
          if (!recipe) continue;
          allEntries.push({ user_id: userId, week_number: week, day_of_week: dow, day_type: DAY_TYPES[dow], meal_slot: slot, recipe_id: recipe.id, locked: false });
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
  const trainingDaysRaw = formData.getAll("training_days").map(Number);
  const trainingDays = trainingDaysRaw.length > 0 ? trainingDaysRaw : [0, 1, 2, 3, 4, 5, 6];
  const cheatDayRaw = formData.get("cheat_day") as string | null;
  const cheatDay: number | null = (cheatDayRaw && cheatDayRaw !== "none") ? Number(cheatDayRaw) : null;

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
    mealsPerDay, prepStyle, trainingDays, cheatDay,
  });

  if (error) return { error };

  // Auto-generate the monthly grocery list from the new plan
  await generateGroceryList(user.id);

  redirect("/meals");
}

export async function swapMealSlot(params: {
  weekNumber: number;
  dayOfWeek: number;
  mealSlot: number;
  currentRecipeId: string;
}): Promise<{ error: string | null; newRecipeId?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase.from("profiles")
    .select("current_weight_lbs, height_cm, age, gender, activity_level, phase, goal_rate, macro_overrides, cuisine_preferences, dietary_restrictions")
    .eq("id", user.id).single();
  if (!profile) return { error: "Profile not found" };

  // Determine meal type from the existing meal_plans row
  const { data: existingEntry } = await supabase
    .from("meal_plans")
    .select("*, recipes(id, name, meal_type)")
    .eq("user_id", user.id)
    .eq("week_number", params.weekNumber)
    .eq("day_of_week", params.dayOfWeek)
    .eq("meal_slot", params.mealSlot)
    .single();

  if (!existingEntry) return { error: "Meal not found" };
  const mealType = (existingEntry.recipes as any)?.meal_type ?? "lunch";

  // Find cuisines to query
  const cuisines: string[] = profile.cuisine_preferences ?? [];
  const restrictions: string[] = profile.dietary_restrictions ?? [];

  const recipesQuery = supabase.from("recipes")
    .select("id, name, meal_type, calories, protein_g, carbs_g, fat_g, tags")
    .eq("meal_type", mealType);

  const { data: candidates } = cuisines.length > 0
    ? await recipesQuery.in("cuisine", cuisines)
    : await recipesQuery;

  if (!candidates?.length) return { error: "No alternative recipes found" };

  // Apply dietary restrictions
  const requiredTags = restrictions
    .map((r: string) => ({ vegetarian: "vegetarian", vegan: "vegan", "gluten-free": "gluten-free", "dairy-free": "dairy-free", "nut-free": "nut-free", halal: "halal" }[r])
    ).filter(Boolean) as string[];

  let pool = requiredTags.length > 0
    ? candidates.filter((r: any) => requiredTags.every((tag: string) => Array.isArray(r.tags) && r.tags.includes(tag)))
    : candidates;
  if (!pool.length) pool = candidates;

  // Exclude current recipe
  const excluding = new Set([params.currentRecipeId]);
  const available = pool.filter((r: any) => !excluding.has(r.id));
  const finalPool = available.length > 0 ? available : pool;

  // Calculate slot targets
  const macros = getEffectiveMacros(profile);

  // Determine meals per day from existing plan
  const { data: dayMeals } = await supabase.from("meal_plans")
    .select("meal_slot").eq("user_id", user.id)
    .eq("week_number", params.weekNumber).eq("day_of_week", params.dayOfWeek);
  const mealsPerDay = Math.max(...(dayMeals ?? []).map((m: any) => m.meal_slot), 4) as 3 | 4 | 5;
  const calSplit = MEAL_CONFIG[mealsPerDay]?.calSplit ?? MEAL_CONFIG[4].calSplit;
  const f = calSplit[params.mealSlot] ?? 0.25;

  const targets = {
    calories: macros.calories * f,
    protein:  macros.protein  * f,
    carbs:    macros.carbs    * f,
    fat:      macros.fat      * f,
  };

  const picked = pickRecipe(finalPool, targets, excluding);
  if (!picked) return { error: "Could not find a suitable recipe" };

  // Update just this one meal_plans row
  const { error: updateError } = await supabase.from("meal_plans")
    .update({ recipe_id: picked.id })
    .eq("user_id", user.id)
    .eq("week_number", params.weekNumber)
    .eq("day_of_week", params.dayOfWeek)
    .eq("meal_slot", params.mealSlot);

  if (updateError) return { error: updateError.message };
  return { error: null, newRecipeId: picked.id };
}

/**
 * Directly assigns a specific recipe to a meal slot (manual pick).
 * Sets locked = false (picking is separate from locking).
 */
export async function pickMealSlot(params: {
  weekNumber: number;
  dayOfWeek: number;
  mealSlot: number;
  recipeId: string;
}): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("meal_plans")
    .upsert({
      user_id: user.id,
      week_number: params.weekNumber,
      day_of_week: params.dayOfWeek,
      day_type: DAY_TYPES[params.dayOfWeek] ?? "work",
      meal_slot: params.mealSlot,
      recipe_id: params.recipeId,
      locked: false,
    }, { onConflict: "user_id,week_number,day_of_week,meal_slot" });

  return { error: error?.message ?? null };
}

/**
 * Toggles the locked flag on a meal slot.
 * Locked meals are preserved when the plan is regenerated.
 */
export async function toggleMealLock(params: {
  weekNumber: number;
  dayOfWeek: number;
  mealSlot: number;
}): Promise<{ error: string | null; locked?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: existing } = await supabase.from("meal_plans")
    .select("locked")
    .eq("user_id", user.id)
    .eq("week_number", params.weekNumber)
    .eq("day_of_week", params.dayOfWeek)
    .eq("meal_slot", params.mealSlot)
    .single();

  const newLocked = !existing?.locked;
  const { error } = await supabase.from("meal_plans")
    .update({ locked: newLocked })
    .eq("user_id", user.id)
    .eq("week_number", params.weekNumber)
    .eq("day_of_week", params.dayOfWeek)
    .eq("meal_slot", params.mealSlot);

  return { error: error?.message ?? null, locked: newLocked };
}

/**
 * Searches the recipe library filtered by meal type and optional name query.
 * Used by the recipe picker modal.
 */
export async function searchRecipes(params: {
  mealType?: string;
  query?: string;
  cuisines?: string[];
}): Promise<{ error: string | null; data: any[] }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", data: [] };

  let q = supabase.from("recipes")
    .select("id, name, meal_type, cuisine, calories, protein_g, carbs_g, fat_g, tags")
    .order("name");

  if (params.mealType && params.mealType !== "all") {
    q = q.eq("meal_type", params.mealType);
  }
  if (params.query?.trim()) {
    q = q.ilike("name", `%${params.query.trim()}%`);
  } else if (params.cuisines?.length) {
    // Only filter by cuisine when not doing a text search (text search should show all results)
    q = q.in("cuisine", params.cuisines);
  }

  const { data, error } = await q.limit(100);
  return { error: error?.message ?? null, data: data ?? [] };
}

export async function clearMealPlan(mealsPerDay?: number): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("meal_plans").delete().eq("user_id", user.id);
  if (error) return { error: error.message };

  const updates: Record<string, unknown> = { meal_mode: "custom" };
  if (mealsPerDay) updates.meals_per_day = mealsPerDay;
  await supabase.from("profiles").update(updates).eq("id", user.id);

  return { error: null };
}

export async function saveMealsPerDay(mealsPerDay: number): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { error } = await supabase.from("profiles").update({ meals_per_day: mealsPerDay, meal_mode: "auto" }).eq("id", user.id);
  return { error: error?.message ?? null };
}
