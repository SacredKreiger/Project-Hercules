/**
 * Bridges the recipe ingredient list with the Macro Correction Engine.
 *
 * Flow:
 *   recipe ingredients → food database lookup → Food[] + initialGrams[]
 *   → solveMacros()  →  exact gram amounts  →  ExactPortion[] for display
 */

import { lookupIngredient, toGrams, formatGrams } from "./food-macros"
import { solveMacros, type Food, type Targets, type MealPlanResult } from "./macro-solver"

export type { MealPlanResult }

export type ExactPortion = {
  name: string
  displayQty: string   // "7.2 oz (205 g)" or "1.5 tbsp (22 g)"
  grams: number
  macroRole: "protein" | "carb" | "fat" | "vegetable" | "other" | "unknown"
  adjusted: boolean    // true = gram amount changed from original recipe
}

// ─── Gram bounds per category ─────────────────────────────────────────────────
// Minimums are 0 so the linear solve is never clamped upward.
// The snap pass keeps each food ≥ 0 and the Gaussian solution is the true optimum.
const BOUNDS: Record<string, { min: number; max: number }> = {
  protein:   { min: 0,  max: 600 },
  carb:      { min: 0,  max: 800 },
  fat:       { min: 0,  max: 200 },
  vegetable: { min: 0,  max: 500 },
  other:     { min: 0,  max: 300 },
}

/**
 * Convert recipe ingredients to Food objects the solver understands.
 * Returns both the Food array and the initial gram amounts.
 */
function ingredientsToFoods(
  ingredients: { name: string; qty: number; unit: string }[]
): { foods: Food[]; initialGrams: number[] } {
  const foods: Food[] = []
  const initialGrams: number[] = []

  for (let i = 0; i < ingredients.length; i++) {
    const ing = ingredients[i]
    const info = lookupIngredient(ing.name)
    const grams = info ? toGrams(ing.qty, ing.unit, info) : ing.qty

    const cat = info?.category ?? "other"
    const bounds = BOUNDS[cat] ?? BOUNDS.other

    foods.push({
      id:               String(i),
      name:             ing.name,
      proteinPerGram:   info ? info.macros.protein  / 100 : 0,
      carbsPerGram:     info ? info.macros.carbs    / 100 : 0,
      fatPerGram:       info ? info.macros.fat      / 100 : 0,
      caloriesPerGram:  info ? info.macros.kcal     / 100 : 0,
      minGrams:         bounds.min,
      maxGrams:         bounds.max,
      stepGrams:        0.1,   // 0.1 g steps → snap pass reaches < 0.05 g error = exact match
    })
    initialGrams.push(Math.max(bounds.min, grams))
  }

  return { foods, initialGrams }
}

/**
 * Identify which ingredient indices are adjustable (protein / carb / fat sources)
 * and order them [primary protein, primary carb, primary fat] for the 3×3 solver.
 *
 * Candidates are selected by ACTUAL macro contribution (grams × macro/gram),
 * not by food category — this handles mixed-role foods like eggs (protein+fat)
 * and ensures a 3rd adjustable is always found when one food spans two categories.
 */
function buildAdjustableIds(
  ingredients: { name: string; qty: number; unit: string }[],
  foods: Food[],
  initialGrams: number[]
): string[] {
  type Candidate = { id: string; contribution: number }
  const byProtein: Candidate[] = []
  const byCarbs:   Candidate[] = []
  const byFat:     Candidate[] = []

  for (let i = 0; i < ingredients.length; i++) {
    const info = lookupIngredient(ingredients[i].name)
    if (!info) continue
    const g = initialGrams[i]
    const cp = g * foods[i].proteinPerGram
    const cc = g * foods[i].carbsPerGram
    const cf = g * foods[i].fatPerGram
    // Any food contributing > 0.5 g of a macro is a candidate for that macro,
    // regardless of its primary category.  This lets eggs be a fat candidate,
    // cheese be a protein candidate, etc.
    if (cp > 0.5) byProtein.push({ id: String(i), contribution: cp })
    if (cc > 0.5) byCarbs.push(  { id: String(i), contribution: cc })
    if (cf > 0.5) byFat.push(    { id: String(i), contribution: cf })
  }

  byProtein.sort((a, b) => b.contribution - a.contribution)
  byCarbs.sort(  (a, b) => b.contribution - a.contribution)
  byFat.sort(    (a, b) => b.contribution - a.contribution)

  const ids: string[] = []

  // Primary protein source
  const pId = byProtein[0]?.id
  if (pId !== undefined) ids.push(pId)

  // Primary carb source — skip if already chosen as protein
  const cId = byCarbs.find(c => !ids.includes(c.id))?.id
  if (cId !== undefined) ids.push(cId)

  // Primary fat source — skip if already chosen above
  const fId = byFat.find(f => !ids.includes(f.id))?.id
  if (fId !== undefined) ids.push(fId)

  return ids
}

/**
 * Compute exact ingredient portions that match the given macro targets.
 *
 * @param ingredients  Recipe ingredient list
 * @param targets      Per-slot macro targets (protein, carbs, fat, calories)
 * @returns            ExactPortion[] — one entry per ingredient, with exact gram amounts
 */
export function computeExactPortions(
  ingredients: { name: string; qty: number; unit: string }[],
  targets: Targets
): ExactPortion[] {
  if (ingredients.length === 0) return []

  const { foods, initialGrams } = ingredientsToFoods(ingredients)
  const adjustableIds = buildAdjustableIds(ingredients, foods, initialGrams)

  const result = solveMacros(foods, initialGrams, targets, adjustableIds)

  return result.foods.map((solved, i) => {
    const info = lookupIngredient(ingredients[i].name)
    const originalGrams = initialGrams[i]
    const isAdjusted = Math.abs(solved.grams - originalGrams) > 1

    const displayQty = info
      ? formatGrams(solved.grams, info.category)
      : `${solved.grams} g`

    return {
      name:       ingredients[i].name,
      displayQty,
      grams:      solved.grams,
      macroRole:  (info?.category ?? "unknown") as ExactPortion["macroRole"],
      adjusted:   isAdjusted,
    }
  })
}

/**
 * Run the full solver and return the MealPlanResult (totals + accuracy score).
 * Used by the UI to display the macro breakdown.
 */
export function solvePortions(
  ingredients: { name: string; qty: number; unit: string }[],
  targets: Targets
): MealPlanResult {
  if (ingredients.length === 0) {
    return {
      foods: [],
      totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      error:  { calories: 0, protein: 0, carbs: 0, fat: 0 },
      accuracyScore: 100,
    }
  }

  const { foods, initialGrams } = ingredientsToFoods(ingredients)
  const adjustableIds = buildAdjustableIds(ingredients, foods, initialGrams)
  return solveMacros(foods, initialGrams, targets, adjustableIds)
}
