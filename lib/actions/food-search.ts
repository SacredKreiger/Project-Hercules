"use server";

import { searchFoods as _searchFoods, lookupBarcode as _lookupBarcode } from "@/lib/api/food-search";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { FoodResult, CustomFood } from "@/lib/types/food";

// ─── Search foods (OFF + USDA combined) ───────────────────────────────────────

export async function searchFoods(query: string): Promise<{ error: string | null; results: FoodResult[] }> {
  if (!query.trim()) return { error: null, results: [] };
  try {
    const results = await _searchFoods(query.trim());
    return { error: null, results };
  } catch (e: any) {
    return { error: e.message, results: [] };
  }
}

// ─── Barcode lookup ───────────────────────────────────────────────────────────

export async function lookupBarcodeAction(barcode: string): Promise<{ error: string | null; food: FoodResult | null }> {
  try {
    const food = await _lookupBarcode(barcode);
    if (!food) return { error: "Product not found. Try searching by name.", food: null };
    return { error: null, food };
  } catch (e: any) {
    return { error: e.message, food: null };
  }
}

// ─── User custom foods ────────────────────────────────────────────────────────

export async function getUserCustomFoods(query?: string): Promise<{ error: string | null; results: CustomFood[] }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  let q = supabase.from("custom_foods").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
  if (query?.trim()) q = q.ilike("food_name", `%${query.trim()}%`);

  const { data, error } = await q;
  if (error) return { error: error.message, results: [] };
  return { error: null, results: (data ?? []) as CustomFood[] };
}
