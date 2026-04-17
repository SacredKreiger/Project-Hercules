// Calorie fraction per slot — mirrored in MealPlanView.tsx
export const CAL_SPLIT: Record<number, Record<number, number>> = {
  3: { 1: 0.30, 2: 0.40, 3: 0.30 },
  4: { 1: 0.25, 2: 0.35, 3: 0.30, 4: 0.10 },
  5: { 1: 0.20, 2: 0.12, 3: 0.28, 4: 0.12, 5: 0.28 },
};

/**
 * Returns the servings multiplier needed so that eating `multiplier` servings
 * of this recipe hits the user's calorie target for this meal slot.
 * Clamped to [0.5, 4.0] to stay in a realistic eating range.
 */
export function getServingsMultiplier(
  dailyCalories: number,
  mealsPerDay: number,
  slot: number,
  recipeCal: number,
  isRestDay = false
): number {
  if (!recipeCal) return 1;
  const split = CAL_SPLIT[mealsPerDay] ?? CAL_SPLIT[4];
  const fraction = split[slot] ?? 0.25;
  const target = dailyCalories * fraction * (isRestDay ? 0.85 : 1.0);
  return Math.round(Math.min(Math.max(target / recipeCal, 0.5), 4.0) * 10) / 10;
}

/** Scale a macro value by the servings multiplier and round. */
export function scaleMacro(value: number, multiplier: number): number {
  return Math.round(value * multiplier);
}
