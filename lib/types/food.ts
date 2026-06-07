export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

export const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export type FoodSource = "off" | "usda" | "custom" | "barcode";

export type FoodResult = {
  id: string;
  source: FoodSource;
  name: string;
  brand?: string;
  calories: number;       // per serving
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sodium_mg?: number;
  serving_qty: number;
  serving_unit: string;
  serving_size_g?: number;
  barcode?: string;
};

export type FoodLogEntry = {
  id: string;
  user_id: string;
  logged_date: string;
  meal_slot: MealSlot;
  food_name: string;
  brand_name?: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number | null;
  sodium_mg?: number | null;
  serving_qty: number;
  serving_unit: string;
  source: string;
  barcode?: string | null;
  external_id?: string | null;
  created_at: string;
};

export type CustomFood = {
  id: string;
  user_id: string;
  food_name: string;
  brand_name?: string | null;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number | null;
  serving_qty: number;
  serving_unit: string;
  serving_size_g?: number | null;
  is_recipe: boolean;
  ingredients?: RecipeIngredient[] | null;
  barcode?: string | null;
  created_at: string;
};

export type RecipeIngredient = {
  food_name: string;
  brand_name?: string;
  qty: number;
  unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type MacroTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type DayLog = {
  date: string;
  entries: FoodLogEntry[];
  totals: MacroTotals;
};
