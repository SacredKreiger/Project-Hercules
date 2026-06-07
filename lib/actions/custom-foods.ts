"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { CustomFood, RecipeIngredient } from "@/lib/types/food";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");
  return { supabase, user: user! };
}

// ─── Create a custom food ─────────────────────────────────────────────────────

export async function createCustomFood(
  food: Omit<CustomFood, "id" | "user_id" | "created_at">
): Promise<{ error: string | null; id?: string }> {
  const { supabase, user } = await getUser();
  const { data, error } = await supabase
    .from("custom_foods")
    .insert({ ...food, user_id: user.id })
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { error: null, id: data.id };
}

// ─── Delete a custom food ─────────────────────────────────────────────────────

export async function deleteCustomFood(id: string): Promise<{ error: string | null }> {
  const { supabase, user } = await getUser();
  const { error } = await supabase
    .from("custom_foods")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  return { error: error?.message ?? null };
}

// ─── Build a recipe ───────────────────────────────────────────────────────────

export async function buildRecipe({
  name,
  ingredients,
  servings,
}: {
  name: string;
  ingredients: RecipeIngredient[];
  servings: number;
}): Promise<{ error: string | null; food?: CustomFood }> {
  const { supabase, user } = await getUser();

  if (!name.trim()) return { error: "Recipe name is required." };
  if (ingredients.length === 0) return { error: "Add at least one ingredient." };
  if (servings < 1) return { error: "Servings must be at least 1." };

  // Sum total macros then divide by servings
  const total = ingredients.reduce(
    (acc, ing) => ({
      calories: acc.calories + ing.calories,
      protein_g: acc.protein_g + ing.protein_g,
      carbs_g: acc.carbs_g + ing.carbs_g,
      fat_g: acc.fat_g + ing.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  const perServing = {
    calories: Math.round(total.calories / servings),
    protein_g: Math.round((total.protein_g / servings) * 10) / 10,
    carbs_g: Math.round((total.carbs_g / servings) * 10) / 10,
    fat_g: Math.round((total.fat_g / servings) * 10) / 10,
  };

  const { data, error } = await supabase
    .from("custom_foods")
    .insert({
      user_id: user.id,
      food_name: name.trim(),
      ...perServing,
      serving_qty: 1,
      serving_unit: "serving",
      is_recipe: true,
      ingredients,
    })
    .select("*")
    .single();

  if (error) return { error: error.message };
  return { error: null, food: data as CustomFood };
}
