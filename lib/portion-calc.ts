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

// ─── Realistic gram bounds per category ───────────────────────────────────────
const BOUNDS: Record<string, { min: number; max: number }> = {
  protein:   { min: 30,  max: 450 },
  carb:      { min: 20,  max: 600 },
  fat:       { min: 2,   max: 80  },
  vegetable: { min: 0,   max: 400 },
  other:     { min: 0,   max: 200 },
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
      stepGrams:        1,
    })
    initialGrams.push(Math.max(bounds.min, grams))
  }

  return { foods, initialGrams }
}

/**
 * Identify which ingredient indices are adjustable (protein / carb / fat sources)
 * and order them [primary protein, primary carb, primary fat] for the 3×3 solver.
 */
function buildAdjustableIds(
  ingredients: { name: string; qty: number; unit: string }[],
  foods: Food[],
  initialGrams: number[]
): string[] {
  type Candidate = { id: string; contribution: number }
  const proteinCandidates: Candidate[] = []
  const carbCandidates:    Candidate[] = []
  const fatCandidates:     Candidate[] = []

  for (let i = 0; i < ingredients.length; i++) {
    const info = lookupIngredient(ingredients[i].name)
    if (!info) continue
    const g = initialGrams[i]
    const contribution = {
      protein:   g * foods[i].proteinPerGram,
      carbs:     g * foods[i].carbsPerGram,
      fat:       g * foods[i].fatPerGram,
    }
    if (info.category === "protein")   proteinCandidates.push({ id: String(i), contribution: contribution.protein })
    if (info.category === "carb")      carbCandidates.push({    id: String(i), contribution: contribution.carbs   })
    if (info.category === "fat")       fatCandidates.push({     id: String(i), contribution: contribution.fat     })
  }

  // Pick the top contributor in each category as the primary adjustable source
  const pick = (candidates: Candidate[]) =>
    candidates.sort((a, b) => b.contribution - a.contribution)[0]?.id

  const ids: string[] = []
  const pId = pick(proteinCandidates)
  const cId = pick(carbCandidates)
  const fId = pick(fatCandidates)

  // Order: protein first (most critical), then carb, then fat
  if (pId !== undefined) ids.push(pId)
  if (cId !== undefined && cId !== pId) ids.push(cId)
  if (fId !== undefined && fId !== pId && fId !== cId) ids.push(fId)

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
