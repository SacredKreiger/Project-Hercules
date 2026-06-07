"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { FoodResult, FoodLogEntry, MacroTotals, MealSlot } from "@/lib/types/food";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  return { supabase, user: user! };
}

// ─── Log a food item ──────────────────────────────────────────────────────────

export async function logFood({
  date,
  mealSlot,
  food,
  servings,
}: {
  date: string;
  mealSlot: MealSlot;
  food: FoodResult;
  servings: number;
}): Promise<{ error: string | null; id?: string }> {
  const { supabase, user } = await getUser();

  const multiplier = servings;

  const { data, error } = await supabase
    .from("food_log")
    .insert({
      user_id: user.id,
      logged_date: date,
      meal_slot: mealSlot,
      food_name: food.name,
      brand_name: food.brand ?? null,
      calories: Math.round(food.calories * multiplier),
      protein_g: Math.round(food.protein_g * multiplier * 10) / 10,
      carbs_g: Math.round(food.carbs_g * multiplier * 10) / 10,
      fat_g: Math.round(food.fat_g * multiplier * 10) / 10,
      fiber_g: food.fiber_g != null ? Math.round(food.fiber_g * multiplier * 10) / 10 : null,
      sodium_mg: food.sodium_mg != null ? Math.round(food.sodium_mg * multiplier) : null,
      serving_qty: multiplier,
      serving_unit: food.serving_unit,
      serving_size_g: food.serving_size_g ?? null,
      source: food.source,
      barcode: food.barcode ?? null,
      external_id: food.id ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { error: null, id: data.id };
}

// ─── Delete a log entry ───────────────────────────────────────────────────────

export async function deleteFoodLog(id: string): Promise<{ error: string | null }> {
  const { supabase, user } = await getUser();
  const { error } = await supabase
    .from("food_log")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  return { error: error?.message ?? null };
}

// ─── Recent + frequent foods ──────────────────────────────────────────────────

export async function getRecentFoods(): Promise<{ recent: FoodResult[]; frequent: FoodResult[] }> {
  const { supabase, user } = await getUser();

  const { data } = await supabase
    .from("food_log")
    .select("food_name, brand_name, calories, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, serving_qty, serving_unit, serving_size_g, source, external_id, barcode, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(200);

  if (!data || data.length === 0) return { recent: [], frequent: [] };

  // Deduplicate by food_name — keep the most recent occurrence per food
  const seen = new Map<string, typeof data[0]>();
  const countMap = new Map<string, number>();

  for (const row of data) {
    const key = row.food_name.toLowerCase();
    countMap.set(key, (countMap.get(key) ?? 0) + 1);
    if (!seen.has(key)) seen.set(key, row);
  }

  type Row = NonNullable<typeof data>[0];
  function rowToResult(row: Row): FoodResult {
    return {
      id: row.external_id ?? row.food_name,
      source: (row.source as FoodResult["source"]) ?? "custom",
      name: row.food_name,
      brand: row.brand_name ?? undefined,
      calories: row.calories,
      protein_g: row.protein_g,
      carbs_g: row.carbs_g,
      fat_g: row.fat_g,
      fiber_g: row.fiber_g ?? undefined,
      sodium_mg: row.sodium_mg ?? undefined,
      serving_qty: row.serving_qty,
      serving_unit: row.serving_unit,
      serving_size_g: row.serving_size_g ?? undefined,
      barcode: row.barcode ?? undefined,
    };
  }

  // Recent: first 10 unique foods in reverse-chron order
  const recent = Array.from(seen.values()).slice(0, 10).map(rowToResult);

  // Frequent: top 10 by log count (excluding anything already in recent top 5)
  const recentTop5Keys = new Set(Array.from(seen.keys()).slice(0, 5));
  const frequent = Array.from(seen.entries())
    .filter(([key]) => !recentTop5Keys.has(key))
    .sort((a, b) => (countMap.get(b[0]) ?? 0) - (countMap.get(a[0]) ?? 0))
    .slice(0, 10)
    .map(([, row]) => rowToResult(row));

  return { recent, frequent };
}

// ─── Get day log ──────────────────────────────────────────────────────────────

export async function getDayLog(date: string): Promise<{
  error: string | null;
  entries: FoodLogEntry[];
  totals: MacroTotals;
}> {
  const { supabase, user } = await getUser();

  const { data, error } = await supabase
    .from("food_log")
    .select("*")
    .eq("user_id", user.id)
    .eq("logged_date", date)
    .order("created_at");

  if (error) return { error: error.message, entries: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 } };

  const entries = (data ?? []) as FoodLogEntry[];
  const totals = entries.reduce<MacroTotals>(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.protein_g,
      carbs: acc.carbs + e.carbs_g,
      fat: acc.fat + e.fat_g,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return { error: null, entries, totals };
}
