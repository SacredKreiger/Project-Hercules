"use server";

import { createClient } from "@/lib/supabase/server";
import { calcBMR, calcTDEE, calcMacros } from "@/lib/macros";
import { redirect } from "next/navigation";

const DAY_TYPES: Record<number, "work" | "off" | "cook"> = {
  0: "off", 1: "work", 2: "work", 3: "work", 4: "work", 5: "work", 6: "cook",
};

const MEAL_SLOTS = [
  { slot: 1, type: "breakfast" as const },
  { slot: 2, type: "lunch" as const },
  { slot: 3, type: "dinner" as const },
  { slot: 4, type: "snack" as const },
];

const CAL_SPLIT: Record<number, number> = { 1: 0.25, 2: 0.35, 3: 0.30, 4: 0.10 };

const RESTRICTION_TAGS: Record<string, string> = {
  vegetarian: "vegetarian",
  vegan: "vegan",
  "gluten-free": "gluten-free",
  "dairy-free": "dairy-free",
  "nut-free": "nut-free",
  halal: "halal",
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRecipe(pool: any[], targetCal: number, usedIds: Set<string>): any {
  const available = pool.filter((r) => !usedIds.has(r.id));
  const source = available.length > 0 ? available : pool;
  const tolerance = targetCal * 0.25;
  const goodEnough = source.filter((r) => Math.abs(r.calories - targetCal) <= tolerance);
  const candidates = goodEnough.length > 0 ? goodEnough : source;
  return shuffle(candidates)[0];
}

async function generatePlan({
  userId,
  profile,
  cuisines,
  restrictions,
  mixAll,
}: {
  userId: string;
  profile: any;
  cuisines: string[];
  restrictions: string[];
  mixAll: boolean;
}) {
  const supabase = await createClient();

  const bmr = calcBMR(profile.current_weight_lbs, profile.height_cm, profile.age, profile.gender);
  const tdee = calcTDEE(bmr, profile.activity_level);
  const macros = calcMacros(tdee, profile.current_weight_lbs, profile.phase);

  const startDate = new Date(profile.program_start_date);
  const now = new Date();
  const weekNumber = Math.ceil(
    (Math.floor((now.getTime() - startDate.getTime()) / 86400000) + 1) / 7
  );

  const recipesQuery = supabase
    .from("recipes")
    .select("id, name, meal_type, calories, tags");

  const { data: allRecipes } = mixAll
    ? await recipesQuery
    : await recipesQuery.in("cuisine", cuisines);

  if (!allRecipes?.length) return { error: "No recipes found for selected cuisines." };

  const requiredTags = restrictions.map((r) => RESTRICTION_TAGS[r]).filter(Boolean);
  const filtered = requiredTags.length > 0
    ? allRecipes.filter((r) => requiredTags.every((tag) => Array.isArray(r.tags) && r.tags.includes(tag)))
    : allRecipes;
  const finalRecipes = filtered.length > 0 ? filtered : allRecipes;

  const byType: Record<string, any[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
  for (const r of finalRecipes) byType[r.meal_type]?.push(r);

  await supabase.from("meal_plans").delete().eq("user_id", userId).eq("week_number", weekNumber);

  const usedIds: Record<string, Set<string>> = {
    breakfast: new Set(), lunch: new Set(), dinner: new Set(), snack: new Set(),
  };

  const entries: any[] = [];
  for (let dow = 0; dow < 7; dow++) {
    for (const { slot, type } of MEAL_SLOTS) {
      const pool = byType[type];
      if (!pool?.length) continue;
      const recipe = pickRecipe(pool, macros.calories * CAL_SPLIT[slot], usedIds[type]);
      usedIds[type].add(recipe.id);
      entries.push({
        user_id: userId,
        week_number: weekNumber,
        day_of_week: dow,
        day_type: DAY_TYPES[dow],
        meal_slot: slot,
        recipe_id: recipe.id,
      });
    }
  }

  if (entries.length === 0) return { error: "No recipes found for your selections." };

  const { error: insertError } = await supabase.from("meal_plans").insert(entries);
  if (insertError) return { error: "Failed to save meal plan: " + insertError.message };

  return { error: null };
}

export async function setupMealPlan(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/onboarding");

  const mixAll = formData.get("mix") === "true";
  const cuisines = formData.getAll("cuisines") as string[];
  const restrictions = formData.getAll("restrictions") as string[];

  if (!mixAll && cuisines.length === 0) {
    redirect("/meals/setup?error=Pick at least one cuisine or use Mix it up");
  }

  await supabase.from("profiles").update({
    cuisine_preferences: mixAll ? [] : cuisines,
    dietary_restrictions: restrictions,
  }).eq("id", user.id);

  const { error } = await generatePlan({ userId: user.id, profile, cuisines, restrictions, mixAll });
  if (error) redirect(`/meals/setup?error=${encodeURIComponent(error)}`);

  redirect("/meals");
}

export async function regenerateMealPlan() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/onboarding");

  const cuisines: string[] = profile.cuisine_preferences ?? [];
  const restrictions: string[] = profile.dietary_restrictions ?? [];
  const mixAll = cuisines.length === 0;

  const { error } = await generatePlan({ userId: user.id, profile, cuisines, restrictions, mixAll });
  if (error) return { error };

  redirect("/meals");
}
