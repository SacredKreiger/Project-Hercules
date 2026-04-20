const LOWER_BODY = new Set([
  "Back Squat","Front Squat","Deadlift","Romanian Deadlift","Sumo Deadlift",
  "Box Squat","Zercher Squat","Barbell Lunge","Barbell Hip Thrust",
  "Leg Press","Leg Curl","Leg Extension","Calf Raise",
  "Dumbbell Lunge","Dumbbell RDL","Dumbbell Hip Thrust",
  "Nordic Curl","Glute Bridge","Pistol Squat",
  "Goblet Squat","Kettlebell Swing","Smith Machine Squat",
]);

export function increment(exercise: string) { return LOWER_BODY.has(exercise) ? 10 : 5; }
export function round5(n: number) { return Math.round(n / 5) * 5; }
export function startingWeight(pr: number): number { return Math.max(45, round5(pr * 0.70)); }

// ── Bodyweight-based 1RM estimates (Strength Level / ExRx beginner standards) ──
// Multiplier = estimated 1RM / bodyweight for an untrained individual
const BW_RATIOS: Record<string, { male: number; female: number }> = {
  // Squat variations
  "Back Squat":           { male: 1.00, female: 0.75 },
  "Front Squat":          { male: 0.85, female: 0.65 },
  "Box Squat":            { male: 1.05, female: 0.80 },
  "Zercher Squat":        { male: 0.75, female: 0.55 },
  "Smith Machine Squat":  { male: 1.10, female: 0.85 },
  "Goblet Squat":         { male: 0.45, female: 0.35 },
  "Pistol Squat":         { male: 0.25, female: 0.20 },
  // Deadlift variations
  "Deadlift":             { male: 1.25, female: 0.75 },
  "Romanian Deadlift":    { male: 1.00, female: 0.75 },
  "Sumo Deadlift":        { male: 1.25, female: 0.80 },
  "Dumbbell RDL":         { male: 0.40, female: 0.30 },
  // Hip / glute
  "Barbell Hip Thrust":   { male: 1.50, female: 1.10 },
  "Dumbbell Hip Thrust":  { male: 0.40, female: 0.30 },
  "Glute Bridge":         { male: 1.30, female: 0.95 },
  // Lunge
  "Barbell Lunge":        { male: 0.60, female: 0.45 },
  "Dumbbell Lunge":       { male: 0.28, female: 0.20 },
  // Leg machines
  "Leg Press":            { male: 1.50, female: 1.20 },
  "Leg Curl":             { male: 0.60, female: 0.45 },
  "Leg Extension":        { male: 0.80, female: 0.60 },
  "Calf Raise":           { male: 1.80, female: 1.30 },
  "Nordic Curl":          { male: 0.60, female: 0.45 },
  // Bench / press
  "Bench Press":          { male: 0.50, female: 0.25 },
  "Incline Bench Press":  { male: 0.40, female: 0.20 },
  "Close-Grip Bench":     { male: 0.45, female: 0.23 },
  "Overhead Press":       { male: 0.40, female: 0.25 },
  "Push Press":           { male: 0.55, female: 0.35 },
  "Dumbbell Press":       { male: 0.33, female: 0.17 },
  // Rows / pulls
  "Barbell Row":          { male: 0.85, female: 0.55 },
  "Bent Over Row":        { male: 0.85, female: 0.55 },
  "Dumbbell Row":         { male: 0.48, female: 0.33 },
  "Lat Pulldown":         { male: 0.80, female: 0.55 },
  "Cable Row":            { male: 0.65, female: 0.43 },
  // Olympic lifts
  "Power Clean":          { male: 1.10, female: 0.75 },
  "Hang Clean":           { male: 1.00, female: 0.70 },
  "Power Snatch":         { male: 0.85, female: 0.58 },
  // Isolation / cables
  "Bicep Curl":           { male: 0.20, female: 0.13 },
  "Dumbbell Curl":        { male: 0.12, female: 0.08 },
  "Bicep Cable Curl":     { male: 0.20, female: 0.13 },
  "Tricep Pushdown":      { male: 0.18, female: 0.10 },
  "Tricep Pulldown":      { male: 0.18, female: 0.10 },
  "Cable Fly":            { male: 0.10, female: 0.06 },
  "Face Pull":            { male: 0.12, female: 0.07 },
  // Kettlebell
  "Kettlebell Swing":     { male: 0.35, female: 0.25 },
};

/** Estimate a starting training weight from bodyweight alone. */
function estimatedStarting(exercise: string, bodyweightLbs: number, gender: string): number {
  const ratio = BW_RATIOS[exercise];
  if (!ratio) return 45;
  const r = gender === "female" ? ratio.female : ratio.male;
  return startingWeight(bodyweightLbs * r);
}

export function getSuggested(
  exercise: string,
  progress: Record<string, { weight: number }>,
  prs: Record<string, number>,
  bodyweightLbs?: number,
  gender?: string,
): number {
  // 1. Use last-session tracked weight (progressive overload)
  if (progress[exercise]?.weight) return progress[exercise].weight;
  // 2. Use the entered 1RM PR
  if (prs[exercise] > 0) return startingWeight(prs[exercise]);
  // 3. Estimate from bodyweight
  if (bodyweightLbs && bodyweightLbs > 0) {
    const est = estimatedStarting(exercise, bodyweightLbs, gender ?? "male");
    if (est > 45) return est;
  }
  // 4. Fallback to empty bar
  return 45;
}
