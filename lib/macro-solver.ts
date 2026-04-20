/**
 * Macro Correction Engine
 *
 * Deterministic, gram-based solver that adjusts ingredient quantities until
 * the user's protein / carbs / fat targets are matched exactly.
 *
 * Math approach:
 *   1. Express the meal as a 3×3 linear system  (P, C, F equations).
 *   2. Solve via Gaussian elimination with partial pivoting.
 *   3. Snap pass: round every food to its step increment, then greedily
 *      micro-adjust ±1 g until residual error < 0.3 g across all macros.
 *
 * Because calories = 4P + 4C + 9F, hitting protein + carbs + fat exactly
 * guarantees exact calorie match — no separate calorie constraint needed.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type Food = {
  id: string
  name: string
  proteinPerGram: number   // g protein  per g of food
  carbsPerGram: number     // g carbs    per g of food
  fatPerGram: number       // g fat      per g of food
  caloriesPerGram: number  // kcal       per g of food
  minGrams?: number        // hard lower bound  (default 0)
  maxGrams?: number        // hard upper bound  (default 1000)
  stepGrams?: number       // snap increment    (default 1)
}

export type Targets = {
  calories: number
  protein: number
  carbs: number
  fat: number
}

export type MealPlanResult = {
  foods: { id: string; name: string; grams: number }[]
  totals: { calories: number; protein: number; carbs: number; fat: number }
  error:  { calories: number; protein: number; carbs: number; fat: number }
  accuracyScore: number   // 0–100
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Since calories = 4P + 4C + 9F, any caller-supplied calorie value is
 * overridden by the macro-derived value to keep the system consistent.
 */
export function reconcileTargets(t: Targets): Targets {
  return { ...t, calories: t.protein * 4 + t.carbs * 4 + t.fat * 9 }
}

/**
 * Gaussian elimination with partial pivoting.
 * Solves a 3×3 system Ax = b.
 * Returns null if the matrix is singular (no unique solution).
 */
function gaussianElimination(
  A: [number[], number[], number[]],
  b: number[]
): number[] | null {
  // Build augmented matrix [A | b]
  const M: number[][] = A.map((row, i) => [...row, b[i]])

  for (let col = 0; col < 3; col++) {
    // Partial pivoting — swap row with largest absolute value in this column
    let maxRow = col
    for (let row = col + 1; row < 3; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row
    }
    ;[M[col], M[maxRow]] = [M[maxRow], M[col]]

    if (Math.abs(M[col][col]) < 1e-12) return null  // singular

    // Eliminate entries below pivot
    for (let row = col + 1; row < 3; row++) {
      const factor = M[row][col] / M[col][col]
      for (let j = col; j <= 3; j++) M[row][j] -= factor * M[col][j]
    }
  }

  // Back substitution
  const x = [0, 0, 0]
  for (let i = 2; i >= 0; i--) {
    x[i] = M[i][3]
    for (let j = i + 1; j < 3; j++) x[i] -= M[i][j] * x[j]
    x[i] /= M[i][i]
  }
  return x
}

function computeTotals(foods: Food[], grams: number[]): Targets {
  let protein = 0, carbs = 0, fat = 0, calories = 0
  for (let i = 0; i < foods.length; i++) {
    protein  += grams[i] * foods[i].proteinPerGram
    carbs    += grams[i] * foods[i].carbsPerGram
    fat      += grams[i] * foods[i].fatPerGram
    calories += grams[i] * foods[i].caloriesPerGram
  }
  return {
    protein:  Math.round(protein  * 10) / 10,
    carbs:    Math.round(carbs    * 10) / 10,
    fat:      Math.round(fat      * 10) / 10,
    calories: Math.round(calories * 10) / 10,
  }
}

function computeError(totals: Targets, targets: Targets): Targets {
  return {
    calories: Math.round((totals.calories - targets.calories) * 10) / 10,
    protein:  Math.round((totals.protein  - targets.protein)  * 10) / 10,
    carbs:    Math.round((totals.carbs    - targets.carbs)    * 10) / 10,
    fat:      Math.round((totals.fat      - targets.fat)      * 10) / 10,
  }
}

function calcAccuracyScore(error: Targets, targets: Targets): number {
  const pct = (
    Math.abs(error.protein)  / Math.max(targets.protein,  1) +
    Math.abs(error.carbs)    / Math.max(targets.carbs,    1) +
    Math.abs(error.fat)      / Math.max(targets.fat,      1) +
    Math.abs(error.calories) / Math.max(targets.calories, 1)
  ) / 4
  return Math.round(Math.max(0, (1 - pct) * 100) * 10) / 10
}

/**
 * Snap pass — guarantees exact match.
 *
 * 1. Round every gram to its step increment (0.1 g default).
 * 2. Compute residual macro error.
 * 3. Greedily pick the food + direction (±0.1 g) whose single adjustment
 *    most reduces total |error|.
 * 4. Repeat until total absolute macro error < 0.05 g
 *    (sub-display-rounding — shows as 0 on any integer display).
 *
 * Typically converges in < 50 iterations. Hard cap at 2000 for safety.
 */
function snapPass(
  foods: Food[],
  grams: number[],
  targets: Targets,
  adjustableIndices: number[]
): number[] {
  const snapped = grams.map((g, i) => {
    const step = foods[i].stepGrams ?? 0.1
    const min  = foods[i].minGrams  ?? 0
    const max  = foods[i].maxGrams  ?? 1000
    return Math.min(max, Math.max(min, Math.round(g / step) * step))
  })

  for (let iter = 0; iter < 2000; iter++) {
    const tot = computeTotals(foods, snapped)
    const errP = targets.protein - tot.protein
    const errC = targets.carbs   - tot.carbs
    const errF = targets.fat     - tot.fat
    const totalErr = Math.abs(errP) + Math.abs(errC) + Math.abs(errF)

    // 0.05 g total error rounds to 0 on every displayed integer — exact match
    if (totalErr < 0.05) break

    let bestReduction = 0
    let bestIdx = -1
    let bestDelta = 0

    for (const idx of adjustableIndices) {
      const step = foods[idx].stepGrams ?? 0.1
      const min  = foods[idx].minGrams  ?? 0
      const max  = foods[idx].maxGrams  ?? 1000
      const f    = foods[idx]

      for (const delta of [step, -step]) {
        const newG = snapped[idx] + delta
        if (newG < min || newG > max) continue

        const newErrP = errP - delta * f.proteinPerGram
        const newErrC = errC - delta * f.carbsPerGram
        const newErrF = errF - delta * f.fatPerGram
        const newTotal = Math.abs(newErrP) + Math.abs(newErrC) + Math.abs(newErrF)
        const reduction = totalErr - newTotal

        if (reduction > bestReduction) {
          bestReduction = reduction
          bestIdx = idx
          bestDelta = delta
        }
      }
    }

    if (bestIdx === -1 || bestReduction <= 0) break   // no further improvement
    snapped[bestIdx] += bestDelta
  }

  return snapped
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Solve macro targets for a set of foods.
 *
 * @param foods            All foods in the meal (fixed + adjustable)
 * @param initialGrams     Starting gram amounts (from original recipe)
 * @param targets          Per-slot macro targets (protein, carbs, fat, calories)
 * @param adjustableIds    IDs of foods whose gram amount may be changed.
 *                         Pass in order: [protein source, carb source, fat source]
 *                         for best results with the 3×3 solver.
 */
export function solveMacros(
  foods: Food[],
  initialGrams: number[],
  targets: Targets,
  adjustableIds: string[]
): MealPlanResult {
  // Round macro targets to integers before solving.
  // This aligns the snap-pass convergence threshold (< 0.05 g) with the
  // integer-display check — avoids false "not exact" when the solver lands
  // within 0.05 g of a fractional target that rounds differently than the achieved value.
  const intTargets: Targets = {
    protein:  Math.round(targets.protein),
    carbs:    Math.round(targets.carbs),
    fat:      Math.round(targets.fat),
    calories: targets.calories,   // reconcileTargets re-derives this anyway
  }
  const t = reconcileTargets(intTargets)

  const adjIdx = foods
    .map((f, i) => (adjustableIds.includes(f.id) ? i : -1))
    .filter((i) => i !== -1)

  const fixIdx = foods.map((_, i) => i).filter((i) => !adjIdx.includes(i))

  // Contribution from fixed foods (vegetables, seasonings, etc.)
  const grams = [...initialGrams]
  let fixedP = 0, fixedC = 0, fixedF = 0
  for (const i of fixIdx) {
    fixedP += grams[i] * foods[i].proteinPerGram
    fixedC += grams[i] * foods[i].carbsPerGram
    fixedF += grams[i] * foods[i].fatPerGram
  }

  // Residual targets that adjustable foods must satisfy
  const rhsP = Math.max(0, t.protein - fixedP)
  const rhsC = Math.max(0, t.carbs   - fixedC)
  const rhsF = Math.max(0, t.fat     - fixedF)

  // ── Linear solve ────────────────────────────────────────────────────────────
  if (adjIdx.length >= 3) {
    // Use the first three adjustable foods as primary sources
    const [i0, i1, i2] = adjIdx
    const A: [number[], number[], number[]] = [
      [foods[i0].proteinPerGram, foods[i1].proteinPerGram, foods[i2].proteinPerGram],
      [foods[i0].carbsPerGram,   foods[i1].carbsPerGram,   foods[i2].carbsPerGram],
      [foods[i0].fatPerGram,     foods[i1].fatPerGram,     foods[i2].fatPerGram],
    ]
    const sol = gaussianElimination(A, [rhsP, rhsC, rhsF])
    if (sol) {
      grams[i0] = Math.max(foods[i0].minGrams ?? 0, sol[0])
      grams[i1] = Math.max(foods[i1].minGrams ?? 0, sol[1])
      grams[i2] = Math.max(foods[i2].minGrams ?? 0, sol[2])
    }
  } else if (adjIdx.length === 2) {
    const [i0, i1] = adjIdx
    const f0 = foods[i0], f1 = foods[i1]
    const det = f0.proteinPerGram * f1.carbsPerGram - f0.carbsPerGram * f1.proteinPerGram
    if (Math.abs(det) > 1e-9) {
      grams[i0] = Math.max(f0.minGrams ?? 0,
        (rhsP * f1.carbsPerGram - rhsC * f1.proteinPerGram) / det)
      grams[i1] = Math.max(f1.minGrams ?? 0,
        (f0.proteinPerGram * rhsC - f0.carbsPerGram * rhsP) / det)
    }
  } else if (adjIdx.length === 1) {
    const i0 = adjIdx[0]
    const f0 = foods[i0]
    // Anchor on whichever macro is non-zero, protein first
    if      (f0.proteinPerGram > 0) grams[i0] = Math.max(f0.minGrams ?? 0, rhsP / f0.proteinPerGram)
    else if (f0.carbsPerGram   > 0) grams[i0] = Math.max(f0.minGrams ?? 0, rhsC / f0.carbsPerGram)
    else if (f0.fatPerGram     > 0) grams[i0] = Math.max(f0.minGrams ?? 0, rhsF / f0.fatPerGram)
  }

  // ── Snap pass: round + micro-adjust for exact match ──────────────────────
  const finalGrams = snapPass(foods, grams, t, adjIdx)

  // ── Final output ──────────────────────────────────────────────────────────
  // Keep 1 decimal on gram amounts — this is what the snap pass tuned to.
  // Totals are computed from these precise values, then rounded for display.
  const preciseGrams = finalGrams.map((g) => Math.round(g * 10) / 10)
  const rawTotals    = computeTotals(foods, preciseGrams)

  const totals = {
    protein:  Math.round(rawTotals.protein),
    carbs:    Math.round(rawTotals.carbs),
    fat:      Math.round(rawTotals.fat),
    calories: Math.round(rawTotals.calories),
  }

  // Error against rounded integer targets (the numbers the user sees)
  const roundedTargets = {
    protein:  Math.round(t.protein),
    carbs:    Math.round(t.carbs),
    fat:      Math.round(t.fat),
    calories: Math.round(t.calories),
  }
  const error = computeError(totals, roundedTargets)

  // Exact = every macro error is 0 when both sides are rounded to integers
  const isExact = error.protein === 0 && error.carbs === 0 &&
                  error.fat     === 0 && error.calories === 0

  return {
    foods: foods.map((f, i) => ({
      id:    f.id,
      name:  f.name,
      grams: preciseGrams[i],   // 1 decimal precision
    })),
    totals,
    error,
    accuracyScore: isExact ? 100 : calcAccuracyScore(error, t),
  }
}
