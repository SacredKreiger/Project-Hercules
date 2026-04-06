export type Phase = "bulk" | "cut" | "maintenance";
export type ActivityLevel =
  | "sedentary"
  | "lightly_active"
  | "moderately_active"
  | "very_active"
  | "extra_active";

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

export function calcBMR(
  weightLbs: number,
  heightCm: number,
  age: number,
  gender: "male" | "female"
): number {
  const weightKg = weightLbs * 0.453592;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === "male" ? base + 5 : base - 161;
}

export function calcTDEE(bmr: number, activityLevel: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

export function calcMacros(
  tdee: number,
  weightLbs: number,
  phase: Phase
): { calories: number; protein: number; carbs: number; fat: number } {
  let calories: number;
  let proteinPerLb: number;
  let fatPerLb: number;

  switch (phase) {
    case "bulk":
      calories = tdee + 400;
      proteinPerLb = 1.0;
      fatPerLb = 0.4;
      break;
    case "cut":
      calories = tdee - 500;
      proteinPerLb = 1.2;
      fatPerLb = 0.35;
      break;
    case "maintenance":
      calories = tdee;
      proteinPerLb = 0.8;
      fatPerLb = 0.4;
      break;
  }

  const protein = Math.round(weightLbs * proteinPerLb);
  const fat = Math.round(weightLbs * fatPerLb);
  const remainingCals = calories - protein * 4 - fat * 9;
  const carbs = Math.round(remainingCals / 4);

  return { calories, protein, carbs, fat };
}
