/**
 * Server-side food API client.
 * Wraps Open Food Facts and USDA FoodData Central.
 * Never import this directly from a Client Component — use server actions instead.
 */

import type { FoodResult } from "@/lib/types/food";

const USDA_KEY = process.env.USDA_API_KEY!;
const OFF_BASE = "https://world.openfoodfacts.org";
const USDA_BASE = "https://api.nal.usda.gov/fdc/v1";

// ─── Normalizers ──────────────────────────────────────────────────────────────

function normalizeOFF(product: any): FoodResult | null {
  if (!product) return null;

  const n = product.nutriments ?? {};

  // Calories: prefer energy-kcal, fallback convert from kJ
  let cal = n["energy-kcal_100g"] ?? n["energy-kcal"] ?? null;
  if (cal === null && n["energy_100g"]) cal = Math.round(n["energy_100g"] / 4.184);
  if (cal === null || cal === 0) return null; // incomplete data

  // Serving size
  const servingSizeG = parseFloat(product.serving_quantity) || null;
  const hasServing = servingSizeG && servingSizeG > 0;

  const per100 = {
    calories: cal,
    protein_g: n["proteins_100g"] ?? n["protein_100g"] ?? 0,
    carbs_g: n["carbohydrates_100g"] ?? n["carbs_100g"] ?? 0,
    fat_g: n["fat_100g"] ?? 0,
    fiber_g: n["fiber_100g"] ?? n["fibers_100g"] ?? undefined,
    sodium_mg: n["sodium_100g"] != null ? n["sodium_100g"] * 1000 : undefined,
  };

  // Scale to per-serving if available
  const scale = hasServing ? servingSizeG / 100 : 1;
  const servingUnit = hasServing ? (product.serving_size ?? `${servingSizeG}g`) : "100g";
  const servingQty = hasServing ? 1 : 100;

  return {
    id: product.id ?? product.code ?? String(Math.random()),
    source: "off",
    name: product.product_name?.trim() || product.abbreviated_product_name?.trim() || "Unknown product",
    brand: product.brands?.split(",")[0]?.trim() || undefined,
    calories: Math.round(per100.calories * scale),
    protein_g: Math.round(per100.protein_g * scale * 10) / 10,
    carbs_g: Math.round(per100.carbs_g * scale * 10) / 10,
    fat_g: Math.round(per100.fat_g * scale * 10) / 10,
    fiber_g: per100.fiber_g != null ? Math.round(per100.fiber_g * scale * 10) / 10 : undefined,
    sodium_mg: per100.sodium_mg != null ? Math.round(per100.sodium_mg * scale) : undefined,
    serving_qty: servingQty,
    serving_unit: servingUnit,
    serving_size_g: servingSizeG ?? undefined,
    barcode: product.code || product.id || undefined,
  };
}

function normalizeUSDA(food: any): FoodResult {
  const nutrients: any[] = food.foodNutrients ?? food.nutrients ?? [];

  function getNutrient(ids: number[]): number {
    for (const id of ids) {
      const n = nutrients.find((n: any) => n.nutrientId === id || n.number === String(id));
      if (n) return n.value ?? n.amount ?? 0;
    }
    return 0;
  }

  // USDA nutrient IDs
  const calories = getNutrient([1008, 208]);    // Energy kcal
  const protein = getNutrient([1003, 203]);     // Protein
  const carbs = getNutrient([1005, 205]);       // Carbohydrates
  const fat = getNutrient([1004, 204]);         // Total fat
  const fiber = getNutrient([1079, 291]);       // Fiber
  const sodium = getNutrient([1093, 307]);      // Sodium mg

  // USDA foods are typically per 100g for SR Legacy, per serving for Branded
  const servingSize = food.servingSize ?? null;
  const servingUnit = food.servingSizeUnit ?? "g";
  const hasServing = servingSize && servingSize > 0;
  const scale = hasServing && servingUnit === "g" ? servingSize / 100 : 1;

  return {
    id: String(food.fdcId),
    source: "usda",
    name: food.description?.replace(/,\s*UPC.*$/i, "").trim() ?? "Unknown",
    brand: food.brandOwner ?? food.brandName ?? undefined,
    calories: Math.round(calories * scale),
    protein_g: Math.round(protein * scale * 10) / 10,
    carbs_g: Math.round(carbs * scale * 10) / 10,
    fat_g: Math.round(fat * scale * 10) / 10,
    fiber_g: fiber ? Math.round(fiber * scale * 10) / 10 : undefined,
    sodium_mg: sodium ? Math.round(sodium * scale) : undefined,
    serving_qty: hasServing ? 1 : 100,
    serving_unit: hasServing ? `${servingSize}${servingUnit}` : "g",
    serving_size_g: hasServing && servingUnit === "g" ? servingSize : undefined,
  };
}

// ─── Open Food Facts ──────────────────────────────────────────────────────────

export async function lookupBarcode(barcode: string): Promise<FoodResult | null> {
  try {
    const res = await fetch(`${OFF_BASE}/api/v2/product/${barcode}.json?fields=product_name,brands,nutriments,serving_size,serving_quantity,code,id`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    return normalizeOFF({ ...data.product, code: barcode });
  } catch {
    return null;
  }
}

export async function searchOpenFoodFacts(query: string): Promise<FoodResult[]> {
  try {
    const params = new URLSearchParams({
      search_terms: query,
      search_simple: "1",
      action: "process",
      json: "1",
      page_size: "15",
      fields: "product_name,abbreviated_product_name,brands,nutriments,serving_size,serving_quantity,code,id",
    });
    const res = await fetch(`${OFF_BASE}/cgi/search.pl?${params}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.products ?? [])
      .map(normalizeOFF)
      .filter(Boolean) as FoodResult[];
  } catch {
    return [];
  }
}

// ─── USDA FoodData Central ────────────────────────────────────────────────────

export async function searchUSDA(query: string): Promise<FoodResult[]> {
  try {
    const params = new URLSearchParams({
      query,
      api_key: USDA_KEY,
      pageSize: "15",
      dataType: "Survey (FNDDS),SR Legacy,Branded",
    });
    const res = await fetch(`${USDA_BASE}/foods/search?${params}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.foods ?? []).map(normalizeUSDA);
  } catch {
    return [];
  }
}

// ─── Combined search ──────────────────────────────────────────────────────────

export async function searchFoods(query: string): Promise<FoodResult[]> {
  const [offResults, usdaResults] = await Promise.all([
    searchOpenFoodFacts(query),
    searchUSDA(query),
  ]);

  // Interleave: OFF first (better for branded/packaged), USDA second (better for whole foods)
  const combined: FoodResult[] = [];
  const max = Math.max(offResults.length, usdaResults.length);
  for (let i = 0; i < max; i++) {
    if (offResults[i]) combined.push(offResults[i]);
    if (usdaResults[i]) combined.push(usdaResults[i]);
  }
  return combined.slice(0, 25);
}
