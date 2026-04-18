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

export function getSuggested(
  exercise: string,
  progress: Record<string, { weight: number }>,
  prs: Record<string, number>,
): number {
  if (progress[exercise]?.weight) return progress[exercise].weight;
  if (prs[exercise] > 0) return Math.max(45, round5(prs[exercise] * 0.70));
  return 45; // default to empty bar
}
