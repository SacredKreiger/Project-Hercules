/**
 * Seed a week of meal plans for a given user.
 *
 * Usage:
 *   npx tsx db/seeds/seed-meal-plan.ts <user_id> [week_number]
 *
 * week_number defaults to the current week based on the user's program_start_date.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

// day_type assignment per day-of-week (0=Sun … 6=Sat)
const DAY_TYPES: Record<number, "work" | "off" | "cook"> = {
  0: "off",
  1: "work",
  2: "work",
  3: "work",
  4: "work",
  5: "work",
  6: "cook",
};

// 4 meal slots per day
const MEAL_SLOTS: { slot: number; type: "breakfast" | "lunch" | "dinner" | "snack" }[] = [
  { slot: 1, type: "breakfast" },
  { slot: 2, type: "lunch" },
  { slot: 3, type: "dinner" },
  { slot: 4, type: "snack" },
];

// Rough calorie split per slot (as fraction of daily target)
const CAL_SPLIT: Record<number, number> = {
  1: 0.25,
  2: 0.35,
  3: 0.30,
  4: 0.10,
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRecipe(
  pool: any[],
  targetCal: number,
  usedIds: Set<string>
): any {
  const available = shuffle(pool.filter((r) => !usedIds.has(r.id)));
  const candidates = available.length > 0 ? available : shuffle(pool);
  // Among candidates, pick closest to target calories
  return candidates.reduce((best: any, r: any) =>
    Math.abs(r.calories - targetCal) < Math.abs(best.calories - targetCal) ? r : best
  );
}

function calcBMR(weightLbs: number, heightCm: number, age: number, gender: string) {
  const kg = weightLbs * 0.453592;
  const base = 10 * kg + 6.25 * heightCm - 5 * age;
  return gender === "male" ? base + 5 : base - 161;
}

const ACTIVITY_MULT: Record<string, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

function calcDailyCalories(profile: any): number {
  const bmr = calcBMR(
    profile.current_weight_lbs,
    profile.height_cm,
    profile.age,
    profile.gender
  );
  const tdee = bmr * (ACTIVITY_MULT[profile.activity_level] ?? 1.55);
  const phase = profile.phase;
  if (phase === "bulk") return Math.round(tdee + 400);
  if (phase === "cut") return Math.round(tdee - 500);
  return Math.round(tdee);
}

async function main() {
  const userId = process.argv[2];
  if (!userId) {
    console.error("Usage: npx tsx db/seeds/seed-meal-plan.ts <user_id> [week_number]");
    process.exit(1);
  }

  // Load profile
  const [profile] = await sql`
    SELECT * FROM profiles WHERE id = ${userId}
  `;
  if (!profile) {
    console.error(`No profile found for user ${userId}`);
    process.exit(1);
  }

  // Determine week number
  let weekNumber = process.argv[3] ? parseInt(process.argv[3]) : null;
  if (!weekNumber) {
    const startDate = new Date(profile.program_start_date);
    const now = new Date();
    weekNumber = Math.ceil(
      (Math.floor((now.getTime() - startDate.getTime()) / 86400000) + 1) / 7
    );
  }

  const dailyCal = calcDailyCalories(profile);
  console.log(`User: ${profile.name} | Phase: ${profile.phase} | Daily target: ${dailyCal} kcal | Week: ${weekNumber}`);

  // Delete existing meal plan for this week
  await sql`
    DELETE FROM meal_plans
    WHERE user_id = ${userId} AND week_number = ${weekNumber}
  `;

  // Load all recipes grouped by meal_type
  const recipes = await sql`SELECT id, name, meal_type, calories FROM recipes`;
  const byType: Record<string, any[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };
  for (const r of recipes) {
    byType[r.meal_type]?.push(r);
  }

  if (recipes.length === 0) {
    console.error("No recipes found. Run `npx tsx db/seeds/run-seed.ts` first.");
    process.exit(1);
  }

  // Track used recipe IDs per meal type for variety
  const usedIds: Record<string, Set<string>> = {
    breakfast: new Set(),
    lunch: new Set(),
    dinner: new Set(),
    snack: new Set(),
  };

  let count = 0;
  for (let dow = 0; dow < 7; dow++) {
    for (const { slot, type } of MEAL_SLOTS) {
      const pool = byType[type];
      if (!pool || pool.length === 0) continue;

      const targetCal = dailyCal * CAL_SPLIT[slot];
      const recipe = pickRecipe(pool, targetCal, usedIds[type]);
      usedIds[type].add(recipe.id);

      await sql`
        INSERT INTO meal_plans
          (user_id, week_number, day_of_week, day_type, meal_slot, recipe_id, servings_multiplier)
        VALUES
          (${userId}, ${weekNumber}, ${dow}, ${DAY_TYPES[dow]}, ${slot}, ${recipe.id}, ${1.0})
      `;

      count++;
    }
  }

  console.log(`✓ Inserted ${count} meal plan entries for week ${weekNumber}`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
