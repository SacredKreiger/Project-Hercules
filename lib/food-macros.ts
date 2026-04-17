/**
 * Food macro database — macros per 100 g of food (cooked/ready-to-eat form).
 * Sources: USDA FoodData Central.
 */

export type MacroPer100g = {
  protein: number; // g
  carbs: number;   // g
  fat: number;     // g
  kcal: number;
};

export type IngredientInfo = {
  macros: MacroPer100g;
  category: "protein" | "carb" | "fat" | "vegetable" | "other";
  /** Grams per 1 cup (overrides default 240 g) */
  cupGrams?: number;
  /** Grams per 1 tbsp */
  tbspGrams?: number;
  /** Grams per 1 tsp */
  tspGrams?: number;
  /** Grams per whole / piece / large / medium / small */
  pieceGrams?: number;
};

// ─── PROTEIN SOURCES ─────────────────────────────────────────────────────────
const PROTEINS: Record<string, IngredientInfo> = {
  "chicken breast":    { macros: { protein: 31.0, carbs: 0.0,  fat: 3.6,  kcal: 165 }, category: "protein", pieceGrams: 170 },
  "chicken thigh":     { macros: { protein: 26.0, carbs: 0.0,  fat: 11.5, kcal: 209 }, category: "protein", pieceGrams: 100 },
  "ground chicken":    { macros: { protein: 27.0, carbs: 0.0,  fat: 8.0,  kcal: 185 }, category: "protein" },
  "ground beef":       { macros: { protein: 26.0, carbs: 0.0,  fat: 15.0, kcal: 218 }, category: "protein" },
  "beef sirloin":      { macros: { protein: 28.0, carbs: 0.0,  fat: 9.0,  kcal: 193 }, category: "protein" },
  "steak":             { macros: { protein: 27.0, carbs: 0.0,  fat: 10.0, kcal: 205 }, category: "protein" },
  "beef":              { macros: { protein: 26.0, carbs: 0.0,  fat: 15.0, kcal: 218 }, category: "protein" },
  "ground turkey":     { macros: { protein: 27.0, carbs: 0.0,  fat: 10.5, kcal: 206 }, category: "protein" },
  "turkey breast":     { macros: { protein: 29.0, carbs: 0.0,  fat: 7.0,  kcal: 189 }, category: "protein" },
  "turkey":            { macros: { protein: 27.0, carbs: 0.0,  fat: 8.0,  kcal: 189 }, category: "protein" },
  "pork tenderloin":   { macros: { protein: 27.0, carbs: 0.0,  fat: 4.4,  kcal: 147 }, category: "protein" },
  "ground pork":       { macros: { protein: 22.0, carbs: 0.0,  fat: 15.0, kcal: 227 }, category: "protein" },
  "pork":              { macros: { protein: 25.0, carbs: 0.0,  fat: 10.0, kcal: 195 }, category: "protein" },
  "salmon":            { macros: { protein: 25.0, carbs: 0.0,  fat: 13.0, kcal: 208 }, category: "protein" },
  "tilapia":           { macros: { protein: 26.0, carbs: 0.0,  fat: 2.7,  kcal: 128 }, category: "protein" },
  "cod":               { macros: { protein: 23.0, carbs: 0.0,  fat: 0.9,  kcal: 105 }, category: "protein" },
  "tuna":              { macros: { protein: 30.0, carbs: 0.0,  fat: 1.0,  kcal: 128 }, category: "protein" },
  "shrimp":            { macros: { protein: 24.0, carbs: 0.0,  fat: 0.6,  kcal:  99 }, category: "protein" },
  "lamb":              { macros: { protein: 25.0, carbs: 0.0,  fat: 14.0, kcal: 242 }, category: "protein" },
  "tofu":              { macros: { protein:  8.0, carbs: 2.0,  fat: 4.5,  kcal:  76 }, category: "protein", cupGrams: 248 },
  "tempeh":            { macros: { protein: 19.0, carbs: 9.0,  fat: 11.0, kcal: 193 }, category: "protein" },
  "eggs":              { macros: { protein: 13.0, carbs: 1.0,  fat: 10.0, kcal: 143 }, category: "protein", pieceGrams: 50 },
  "egg":               { macros: { protein: 13.0, carbs: 1.0,  fat: 10.0, kcal: 143 }, category: "protein", pieceGrams: 50 },
};

// ─── CARB SOURCES ─────────────────────────────────────────────────────────────
const CARBS: Record<string, IngredientInfo> = {
  "jasmine rice":      { macros: { protein: 2.7,  carbs: 28.0, fat: 0.3,  kcal: 130 }, category: "carb", cupGrams: 186 },
  "basmati rice":      { macros: { protein: 2.7,  carbs: 28.0, fat: 0.3,  kcal: 130 }, category: "carb", cupGrams: 186 },
  "white rice":        { macros: { protein: 2.7,  carbs: 28.0, fat: 0.3,  kcal: 130 }, category: "carb", cupGrams: 186 },
  "brown rice":        { macros: { protein: 2.6,  carbs: 23.0, fat: 0.9,  kcal: 111 }, category: "carb", cupGrams: 195 },
  "rice":              { macros: { protein: 2.7,  carbs: 28.0, fat: 0.3,  kcal: 130 }, category: "carb", cupGrams: 186 },
  "oats":              { macros: { protein: 2.5,  carbs: 12.0, fat: 1.5,  kcal:  71 }, category: "carb", cupGrams: 234 }, // cooked
  "pasta":             { macros: { protein: 5.0,  carbs: 25.0, fat: 1.1,  kcal: 131 }, category: "carb", cupGrams: 140 },
  "noodles":           { macros: { protein: 5.0,  carbs: 25.0, fat: 1.1,  kcal: 131 }, category: "carb", cupGrams: 140 },
  "spaghetti":         { macros: { protein: 5.0,  carbs: 25.0, fat: 1.1,  kcal: 131 }, category: "carb", cupGrams: 140 },
  "sweet potato":      { macros: { protein: 1.6,  carbs: 20.0, fat: 0.1,  kcal:  86 }, category: "carb", cupGrams: 200, pieceGrams: 130 },
  "potato":            { macros: { protein: 2.0,  carbs: 17.0, fat: 0.1,  kcal:  77 }, category: "carb", cupGrams: 150, pieceGrams: 213 },
  "quinoa":            { macros: { protein: 4.4,  carbs: 21.0, fat: 1.9,  kcal: 120 }, category: "carb", cupGrams: 185 },
  "couscous":          { macros: { protein: 3.8,  carbs: 23.0, fat: 0.2,  kcal: 112 }, category: "carb", cupGrams: 157 },
  "plantain":          { macros: { protein: 0.8,  carbs: 31.0, fat: 0.2,  kcal: 116 }, category: "carb", pieceGrams: 150 },
  "black beans":       { macros: { protein: 8.9,  carbs: 24.0, fat: 0.4,  kcal: 132 }, category: "carb", cupGrams: 172 },
  "pinto beans":       { macros: { protein: 9.0,  carbs: 22.0, fat: 0.4,  kcal: 127 }, category: "carb", cupGrams: 171 },
  "kidney beans":      { macros: { protein: 8.7,  carbs: 22.0, fat: 0.5,  kcal: 127 }, category: "carb", cupGrams: 177 },
  "chickpeas":         { macros: { protein: 9.0,  carbs: 27.0, fat: 2.6,  kcal: 164 }, category: "carb", cupGrams: 164 },
  "lentils":           { macros: { protein: 9.0,  carbs: 20.0, fat: 0.4,  kcal: 116 }, category: "carb", cupGrams: 198 },
  "corn tortilla":     { macros: { protein: 5.5,  carbs: 47.0, fat: 2.5,  kcal: 218 }, category: "carb", pieceGrams: 26 },
  "flour tortilla":    { macros: { protein: 8.5,  carbs: 50.0, fat: 7.5,  kcal: 302 }, category: "carb", pieceGrams: 45 },
  "tortilla":          { macros: { protein: 7.0,  carbs: 49.0, fat: 5.0,  kcal: 260 }, category: "carb", pieceGrams: 35 },
  "pita":              { macros: { protein: 9.0,  carbs: 55.0, fat: 1.0,  kcal: 275 }, category: "carb", pieceGrams: 57 },
  "naan":              { macros: { protein: 9.0,  carbs: 51.0, fat: 4.5,  kcal: 290 }, category: "carb", pieceGrams: 90 },
  "bread":             { macros: { protein: 9.0,  carbs: 49.0, fat: 3.2,  kcal: 265 }, category: "carb", pieceGrams: 28 },
};

// ─── FAT SOURCES ─────────────────────────────────────────────────────────────
const FATS: Record<string, IngredientInfo> = {
  "olive oil":         { macros: { protein: 0.0,  carbs: 0.0,  fat: 100.0, kcal: 884 }, category: "fat", tbspGrams: 13.5, tspGrams: 4.5 },
  "vegetable oil":     { macros: { protein: 0.0,  carbs: 0.0,  fat: 100.0, kcal: 884 }, category: "fat", tbspGrams: 14.0, tspGrams: 4.7 },
  "canola oil":        { macros: { protein: 0.0,  carbs: 0.0,  fat: 100.0, kcal: 884 }, category: "fat", tbspGrams: 14.0, tspGrams: 4.7 },
  "sesame oil":        { macros: { protein: 0.0,  carbs: 0.0,  fat: 100.0, kcal: 884 }, category: "fat", tbspGrams: 13.6, tspGrams: 4.5 },
  "coconut oil":       { macros: { protein: 0.0,  carbs: 0.0,  fat: 100.0, kcal: 892 }, category: "fat", tbspGrams: 14.0, tspGrams: 4.7 },
  "butter":            { macros: { protein: 0.85, carbs: 0.06, fat: 81.0,  kcal: 717 }, category: "fat", tbspGrams: 14.2, tspGrams: 4.7 },
  "ghee":              { macros: { protein: 0.3,  carbs: 0.0,  fat: 99.5,  kcal: 876 }, category: "fat", tbspGrams: 13.0, tspGrams: 4.3 },
  "coconut milk":      { macros: { protein: 2.3,  carbs: 6.0,  fat: 24.0,  kcal: 230 }, category: "fat", cupGrams: 240 },
  "avocado":           { macros: { protein: 2.0,  carbs: 9.0,  fat: 15.0,  kcal: 160 }, category: "fat", pieceGrams: 150, cupGrams: 230 },
  "peanut butter":     { macros: { protein: 25.0, carbs: 20.0, fat: 50.0,  kcal: 588 }, category: "fat", tbspGrams: 16.0 },
  "almond butter":     { macros: { protein: 21.0, carbs: 19.0, fat: 55.0,  kcal: 614 }, category: "fat", tbspGrams: 16.0 },
  "cheddar cheese":    { macros: { protein: 25.0, carbs: 1.3,  fat: 33.0,  kcal: 403 }, category: "fat", cupGrams: 113 },
  "parmesan":          { macros: { protein: 36.0, carbs: 4.0,  fat: 26.0,  kcal: 431 }, category: "fat", tbspGrams: 5.0 },
  "cheese":            { macros: { protein: 25.0, carbs: 2.0,  fat: 30.0,  kcal: 380 }, category: "fat", cupGrams: 113 },
  "heavy cream":       { macros: { protein: 2.0,  carbs: 3.0,  fat: 35.0,  kcal: 345 }, category: "fat", tbspGrams: 15.0 },
  "sour cream":        { macros: { protein: 2.5,  carbs: 4.0,  fat: 20.0,  kcal: 198 }, category: "fat", tbspGrams: 12.0 },
  "tahini":            { macros: { protein: 17.0, carbs: 21.0, fat: 54.0,  kcal: 595 }, category: "fat", tbspGrams: 15.0 },
};

// ─── VEGETABLES (kept at recipe ratio, not scaled to macro targets) ───────────
const VEGETABLES: Record<string, IngredientInfo> = {
  "broccoli":    { macros: { protein: 2.8, carbs: 7.0,  fat: 0.4, kcal: 34  }, category: "vegetable", cupGrams: 91 },
  "spinach":     { macros: { protein: 2.9, carbs: 3.6,  fat: 0.4, kcal: 23  }, category: "vegetable", cupGrams: 30 },
  "kale":        { macros: { protein: 4.3, carbs: 9.0,  fat: 0.9, kcal: 49  }, category: "vegetable", cupGrams: 67 },
  "cabbage":     { macros: { protein: 1.3, carbs: 6.0,  fat: 0.1, kcal: 25  }, category: "vegetable", cupGrams: 89 },
  "bell pepper": { macros: { protein: 1.0, carbs: 6.0,  fat: 0.3, kcal: 31  }, category: "vegetable", pieceGrams: 120 },
  "onion":       { macros: { protein: 1.1, carbs: 9.3,  fat: 0.1, kcal: 40  }, category: "vegetable", cupGrams: 160, pieceGrams: 110 },
  "tomato":      { macros: { protein: 0.9, carbs: 3.9,  fat: 0.2, kcal: 18  }, category: "vegetable", pieceGrams: 123, cupGrams: 180 },
  "garlic":      { macros: { protein: 6.4, carbs: 33.0, fat: 0.5, kcal: 149 }, category: "vegetable", tspGrams: 3.0, pieceGrams: 4 },
  "mushroom":    { macros: { protein: 3.1, carbs: 3.3,  fat: 0.3, kcal: 22  }, category: "vegetable", cupGrams: 70 },
  "zucchini":    { macros: { protein: 1.2, carbs: 3.1,  fat: 0.3, kcal: 17  }, category: "vegetable", cupGrams: 124 },
  "cucumber":    { macros: { protein: 0.7, carbs: 3.6,  fat: 0.1, kcal: 15  }, category: "vegetable", cupGrams: 119 },
  "carrot":      { macros: { protein: 0.9, carbs: 10.0, fat: 0.2, kcal: 41  }, category: "vegetable", cupGrams: 128, pieceGrams: 61 },
  "celery":      { macros: { protein: 0.7, carbs: 3.0,  fat: 0.2, kcal: 16  }, category: "vegetable", cupGrams: 101 },
  "lettuce":     { macros: { protein: 1.4, carbs: 2.9,  fat: 0.2, kcal: 17  }, category: "vegetable", cupGrams: 57 },
  "corn":        { macros: { protein: 3.3, carbs: 19.0, fat: 1.4, kcal: 86  }, category: "vegetable", cupGrams: 154 },
  "edamame":     { macros: { protein: 11.0, carbs: 8.0, fat: 5.0, kcal: 121 }, category: "vegetable", cupGrams: 155 },
  "bok choy":    { macros: { protein: 1.5, carbs: 2.2,  fat: 0.2, kcal: 13  }, category: "vegetable", cupGrams: 70 },
  "green beans": { macros: { protein: 1.8, carbs: 7.9,  fat: 0.1, kcal: 35  }, category: "vegetable", cupGrams: 110 },
};

// ─── OTHER (seasonings, sauces — small quantities, not scaled) ───────────────
const OTHER: Record<string, IngredientInfo> = {
  "soy sauce":   { macros: { protein: 5.0,  carbs: 5.0,  fat: 0.1, kcal: 53  }, category: "other", tbspGrams: 16 },
  "fish sauce":  { macros: { protein: 5.0,  carbs: 3.0,  fat: 0.0, kcal: 35  }, category: "other", tbspGrams: 18 },
  "hot sauce":   { macros: { protein: 0.5,  carbs: 1.0,  fat: 0.0, kcal: 11  }, category: "other", tbspGrams: 16 },
  "salsa":       { macros: { protein: 1.0,  carbs: 4.0,  fat: 0.2, kcal: 36  }, category: "other", tbspGrams: 16, cupGrams: 240 },
  "yogurt":      { macros: { protein: 10.0, carbs: 4.0,  fat: 0.4, kcal: 59  }, category: "other", cupGrams: 245 },
  "honey":       { macros: { protein: 0.3,  carbs: 82.0, fat: 0.0, kcal: 304 }, category: "other", tbspGrams: 21 },
  "tomato paste":{ macros: { protein: 3.8,  carbs: 18.0, fat: 0.4, kcal: 82  }, category: "other", tbspGrams: 16 },
  "broth":       { macros: { protein: 1.0,  carbs: 0.5,  fat: 0.3, kcal: 12  }, category: "other", cupGrams: 240 },
};

// ─── COMBINED DATABASE (sorted longest-first for greedy keyword match) ────────
const RAW_DATABASE: Record<string, IngredientInfo> = {
  ...PROTEINS, ...CARBS, ...FATS, ...VEGETABLES, ...OTHER,
};

const SORTED_KEYS = Object.keys(RAW_DATABASE).sort((a, b) => b.length - a.length);

export function lookupIngredient(name: string): IngredientInfo | null {
  const lower = name.toLowerCase();
  for (const key of SORTED_KEYS) {
    if (lower.includes(key)) return RAW_DATABASE[key];
  }
  return null;
}

/** Convert a qty+unit pair to grams using the ingredient's unit overrides. */
export function toGrams(qty: number, unit: string, info: IngredientInfo): number {
  const u = unit.toLowerCase().trim();
  // Weight units — always exact
  if (u === "g" || u === "gram" || u === "grams") return qty;
  if (u === "kg") return qty * 1000;
  if (u === "oz" || u === "ounce" || u === "ounces") return qty * 28.3495;
  if (u === "lb" || u === "lbs" || u === "pound" || u === "pounds") return qty * 453.592;
  // Volume units
  if (u === "cup" || u === "cups") return qty * (info.cupGrams ?? 240);
  if (u === "tbsp" || u === "tablespoon" || u === "tablespoons") return qty * (info.tbspGrams ?? 14.79);
  if (u === "tsp" || u === "teaspoon" || u === "teaspoons") return qty * (info.tspGrams ?? 4.93);
  if (u === "ml") return qty;
  // Count units
  if (["whole", "piece", "pieces", "large", "medium", "small", "fillet", "fillets", "slice", "slices"].includes(u)) {
    return qty * (info.pieceGrams ?? 100);
  }
  // Unknown — return original qty, assume grams
  return qty;
}

/** Format grams to a precise display string (1 decimal).
 *  Protein sources show oz + g. Small fat sources show tbsp + g. */
export function formatGrams(grams: number, category: IngredientInfo["category"]): string {
  const precise = Math.round(grams * 10) / 10;   // 1 decimal
  if (category === "protein" && grams >= 28) {
    const oz = grams / 28.3495;
    return `${oz.toFixed(1)} oz (${precise} g)`;
  }
  if (category === "fat" && grams < 30) {
    const tbsp = grams / 14.79;
    if (tbsp < 8) return `${tbsp.toFixed(1)} tbsp (${precise} g)`;
  }
  return `${precise} g`;
}
