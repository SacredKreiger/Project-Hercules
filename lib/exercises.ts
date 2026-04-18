export type ExerciseCategory =
  | "Barbell"
  | "Dumbbell"
  | "Bodyweight"
  | "Cable & Machine"
  | "Cardio"
  | "Kettlebell";

/** How a set is logged for this exercise */
export type LogUnit =
  | "weight_reps"    // barbell / dumbbell / machine — log lbs + reps
  | "reps_only"      // bodyweight — log reps (weight optional for weighted variants)
  | "distance_time"; // cardio — just mark done (notes field)

export type ExerciseInfo = {
  name: string;
  category: ExerciseCategory;
  unit: LogUnit;
};

export const EXERCISES: ExerciseInfo[] = [
  // ── Barbell (Tactical Barbell core lifts first) ─────────────────────────
  { name: "Back Squat",           category: "Barbell", unit: "weight_reps" },
  { name: "Front Squat",          category: "Barbell", unit: "weight_reps" },
  { name: "Deadlift",             category: "Barbell", unit: "weight_reps" },
  { name: "Romanian Deadlift",    category: "Barbell", unit: "weight_reps" },
  { name: "Sumo Deadlift",        category: "Barbell", unit: "weight_reps" },
  { name: "Bench Press",          category: "Barbell", unit: "weight_reps" },
  { name: "Incline Bench Press",  category: "Barbell", unit: "weight_reps" },
  { name: "Overhead Press",       category: "Barbell", unit: "weight_reps" },
  { name: "Push Press",           category: "Barbell", unit: "weight_reps" },
  { name: "Barbell Row",          category: "Barbell", unit: "weight_reps" },
  { name: "Pendlay Row",          category: "Barbell", unit: "weight_reps" },
  { name: "Power Clean",          category: "Barbell", unit: "weight_reps" },
  { name: "Hang Clean",           category: "Barbell", unit: "weight_reps" },
  { name: "Power Snatch",         category: "Barbell", unit: "weight_reps" },
  { name: "Hang Snatch",          category: "Barbell", unit: "weight_reps" },
  { name: "Good Morning",         category: "Barbell", unit: "weight_reps" },
  { name: "Barbell Lunge",        category: "Barbell", unit: "weight_reps" },
  { name: "Barbell Hip Thrust",   category: "Barbell", unit: "weight_reps" },
  { name: "Barbell Curl",         category: "Barbell", unit: "weight_reps" },
  { name: "Skull Crusher",        category: "Barbell", unit: "weight_reps" },
  { name: "Close-Grip Bench",     category: "Barbell", unit: "weight_reps" },
  { name: "Zercher Squat",        category: "Barbell", unit: "weight_reps" },
  { name: "Box Squat",            category: "Barbell", unit: "weight_reps" },

  // ── Dumbbell ────────────────────────────────────────────────────────────
  { name: "Dumbbell Bench Press",    category: "Dumbbell", unit: "weight_reps" },
  { name: "Incline Dumbbell Press",  category: "Dumbbell", unit: "weight_reps" },
  { name: "Dumbbell Shoulder Press", category: "Dumbbell", unit: "weight_reps" },
  { name: "Arnold Press",            category: "Dumbbell", unit: "weight_reps" },
  { name: "Dumbbell Row",            category: "Dumbbell", unit: "weight_reps" },
  { name: "Dumbbell Curl",           category: "Dumbbell", unit: "weight_reps" },
  { name: "Hammer Curl",             category: "Dumbbell", unit: "weight_reps" },
  { name: "Lateral Raise",           category: "Dumbbell", unit: "weight_reps" },
  { name: "Front Raise",             category: "Dumbbell", unit: "weight_reps" },
  { name: "Dumbbell Fly",            category: "Dumbbell", unit: "weight_reps" },
  { name: "Incline Dumbbell Fly",    category: "Dumbbell", unit: "weight_reps" },
  { name: "Dumbbell Lunge",          category: "Dumbbell", unit: "weight_reps" },
  { name: "Dumbbell RDL",            category: "Dumbbell", unit: "weight_reps" },
  { name: "Dumbbell Hip Thrust",     category: "Dumbbell", unit: "weight_reps" },
  { name: "Tricep Kickback",         category: "Dumbbell", unit: "weight_reps" },
  { name: "Dumbbell Shrug",          category: "Dumbbell", unit: "weight_reps" },

  // ── Bodyweight ───────────────────────────────────────────────────────────
  { name: "Push-Up",             category: "Bodyweight", unit: "reps_only" },
  { name: "Diamond Push-Up",     category: "Bodyweight", unit: "reps_only" },
  { name: "Pike Push-Up",        category: "Bodyweight", unit: "reps_only" },
  { name: "Handstand Push-Up",   category: "Bodyweight", unit: "reps_only" },
  { name: "Archer Push-Up",      category: "Bodyweight", unit: "reps_only" },
  { name: "Pull-Up",             category: "Bodyweight", unit: "reps_only" },
  { name: "Chin-Up",             category: "Bodyweight", unit: "reps_only" },
  { name: "Wide-Grip Pull-Up",   category: "Bodyweight", unit: "reps_only" },
  { name: "Neutral-Grip Pull-Up",category: "Bodyweight", unit: "reps_only" },
  { name: "Commando Pull-Up",    category: "Bodyweight", unit: "reps_only" },
  { name: "Dip",                 category: "Bodyweight", unit: "reps_only" },
  { name: "Ring Dip",            category: "Bodyweight", unit: "reps_only" },
  { name: "Muscle-Up",           category: "Bodyweight", unit: "reps_only" },
  { name: "Inverted Row",        category: "Bodyweight", unit: "reps_only" },
  { name: "Bodyweight Squat",    category: "Bodyweight", unit: "reps_only" },
  { name: "Jump Squat",          category: "Bodyweight", unit: "reps_only" },
  { name: "Pistol Squat",        category: "Bodyweight", unit: "reps_only" },
  { name: "Lunge",               category: "Bodyweight", unit: "reps_only" },
  { name: "Reverse Lunge",       category: "Bodyweight", unit: "reps_only" },
  { name: "Nordic Curl",         category: "Bodyweight", unit: "reps_only" },
  { name: "Glute Bridge",        category: "Bodyweight", unit: "reps_only" },
  { name: "Plank",               category: "Bodyweight", unit: "reps_only" },
  { name: "Side Plank",          category: "Bodyweight", unit: "reps_only" },
  { name: "Hollow Body Hold",    category: "Bodyweight", unit: "reps_only" },
  { name: "L-Sit",               category: "Bodyweight", unit: "reps_only" },
  { name: "V-Up",                category: "Bodyweight", unit: "reps_only" },
  { name: "Leg Raise",           category: "Bodyweight", unit: "reps_only" },
  { name: "Hanging Leg Raise",   category: "Bodyweight", unit: "reps_only" },
  { name: "Ab Wheel",            category: "Bodyweight", unit: "reps_only" },
  { name: "Burpee",              category: "Bodyweight", unit: "reps_only" },
  { name: "Box Jump",            category: "Bodyweight", unit: "reps_only" },
  { name: "Broad Jump",          category: "Bodyweight", unit: "reps_only" },
  { name: "Mountain Climber",    category: "Bodyweight", unit: "reps_only" },
  { name: "Bear Crawl",          category: "Bodyweight", unit: "reps_only" },

  // ── Cable & Machine ──────────────────────────────────────────────────────
  { name: "Lat Pulldown",        category: "Cable & Machine", unit: "weight_reps" },
  { name: "Cable Row",           category: "Cable & Machine", unit: "weight_reps" },
  { name: "Cable Fly",           category: "Cable & Machine", unit: "weight_reps" },
  { name: "Tricep Pushdown",     category: "Cable & Machine", unit: "weight_reps" },
  { name: "Face Pull",           category: "Cable & Machine", unit: "weight_reps" },
  { name: "Cable Curl",          category: "Cable & Machine", unit: "weight_reps" },
  { name: "Leg Press",           category: "Cable & Machine", unit: "weight_reps" },
  { name: "Leg Curl",            category: "Cable & Machine", unit: "weight_reps" },
  { name: "Leg Extension",       category: "Cable & Machine", unit: "weight_reps" },
  { name: "Calf Raise",          category: "Cable & Machine", unit: "weight_reps" },
  { name: "Chest Press Machine", category: "Cable & Machine", unit: "weight_reps" },
  { name: "Pec Deck",            category: "Cable & Machine", unit: "weight_reps" },
  { name: "Hip Abductor",        category: "Cable & Machine", unit: "weight_reps" },
  { name: "Smith Machine Squat", category: "Cable & Machine", unit: "weight_reps" },

  // ── Cardio ───────────────────────────────────────────────────────────────
  { name: "Easy Run",       category: "Cardio", unit: "distance_time" },
  { name: "Tempo Run",      category: "Cardio", unit: "distance_time" },
  { name: "Long Run",       category: "Cardio", unit: "distance_time" },
  { name: "Intervals",      category: "Cardio", unit: "distance_time" },
  { name: "Sprints",        category: "Cardio", unit: "distance_time" },
  { name: "Ruck",           category: "Cardio", unit: "distance_time" },
  { name: "Cycling",        category: "Cardio", unit: "distance_time" },
  { name: "Row Machine",    category: "Cardio", unit: "distance_time" },
  { name: "Swim",           category: "Cardio", unit: "distance_time" },
  { name: "Jump Rope",      category: "Cardio", unit: "distance_time" },
  { name: "Stair Climb",    category: "Cardio", unit: "distance_time" },
  { name: "Sled Push",      category: "Cardio", unit: "distance_time" },
  { name: "Farmer's Carry", category: "Cardio", unit: "distance_time" },

  // ── Kettlebell ───────────────────────────────────────────────────────────
  { name: "Kettlebell Swing",   category: "Kettlebell", unit: "weight_reps" },
  { name: "Kettlebell Clean",   category: "Kettlebell", unit: "weight_reps" },
  { name: "Kettlebell Snatch",  category: "Kettlebell", unit: "weight_reps" },
  { name: "Kettlebell Press",   category: "Kettlebell", unit: "weight_reps" },
  { name: "Goblet Squat",       category: "Kettlebell", unit: "weight_reps" },
  { name: "Turkish Get-Up",     category: "Kettlebell", unit: "weight_reps" },
  { name: "Kettlebell Row",     category: "Kettlebell", unit: "weight_reps" },
];

export const EXERCISE_CATEGORIES: ExerciseCategory[] = [
  "Barbell", "Dumbbell", "Bodyweight", "Cable & Machine", "Cardio", "Kettlebell",
];

export function getExerciseInfo(name: string): ExerciseInfo | undefined {
  return EXERCISES.find((e) => e.name === name);
}
