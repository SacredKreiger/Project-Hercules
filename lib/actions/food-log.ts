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
