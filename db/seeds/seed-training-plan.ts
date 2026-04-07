/**
 * Seed a week of training plans for a given user.
 *
 * Usage:
 *   npx tsx db/seeds/seed-training-plan.ts <user_id> [week_number]
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

type Exercise = {
  name: string;
  sets: number;
  reps: string;
  rest_sec: number;
  notes?: string;
};

type DayPlan = {
  name: string;
  is_rest_day: boolean;
  exercises: Exercise[];
};

// PPL split: Push / Pull / Legs / Rest / Upper / Lower / Rest
const TEMPLATE: Record<number, DayPlan> = {
  0: { // Sunday — Rest
    name: "Rest Day",
    is_rest_day: true,
    exercises: [],
  },
  1: { // Monday — Push
    name: "Push Day — Chest, Shoulders, Triceps",
    is_rest_day: false,
    exercises: [
      { name: "Barbell Bench Press",        sets: 4, reps: "6-8",   rest_sec: 120 },
      { name: "Incline Dumbbell Press",      sets: 3, reps: "8-12",  rest_sec: 90  },
      { name: "Overhead Press",              sets: 3, reps: "6-10",  rest_sec: 120 },
      { name: "Lateral Raises",              sets: 3, reps: "12-15", rest_sec: 60  },
      { name: "Tricep Pushdowns",            sets: 3, reps: "12-15", rest_sec: 60  },
      { name: "Overhead Tricep Extension",   sets: 2, reps: "12-15", rest_sec: 60  },
    ],
  },
  2: { // Tuesday — Pull
    name: "Pull Day — Back & Biceps",
    is_rest_day: false,
    exercises: [
      { name: "Deadlift",                    sets: 4, reps: "4-6",   rest_sec: 180 },
      { name: "Pull-Ups",                    sets: 3, reps: "6-10",  rest_sec: 90  },
      { name: "Barbell Row",                 sets: 3, reps: "8-10",  rest_sec: 90  },
      { name: "Cable Row",                   sets: 3, reps: "10-12", rest_sec: 75  },
      { name: "Face Pulls",                  sets: 3, reps: "15-20", rest_sec: 60  },
      { name: "Barbell Curl",                sets: 3, reps: "10-12", rest_sec: 60  },
    ],
  },
  3: { // Wednesday — Legs
    name: "Leg Day — Quads, Hamstrings, Glutes",
    is_rest_day: false,
    exercises: [
      { name: "Barbell Back Squat",          sets: 4, reps: "6-8",   rest_sec: 150 },
      { name: "Romanian Deadlift",           sets: 3, reps: "8-12",  rest_sec: 90  },
      { name: "Leg Press",                   sets: 3, reps: "10-15", rest_sec: 90  },
      { name: "Walking Lunges",              sets: 3, reps: "12/leg", rest_sec: 75 },
      { name: "Leg Curl",                    sets: 3, reps: "12-15", rest_sec: 60  },
      { name: "Standing Calf Raise",         sets: 4, reps: "15-20", rest_sec: 45  },
    ],
  },
  4: { // Thursday — Rest
    name: "Rest Day",
    is_rest_day: true,
    exercises: [],
  },
  5: { // Friday — Upper
    name: "Upper Body — Strength Focus",
    is_rest_day: false,
    exercises: [
      { name: "Incline Barbell Press",       sets: 4, reps: "6-8",   rest_sec: 120 },
      { name: "Weighted Pull-Ups",           sets: 3, reps: "6-8",   rest_sec: 120 },
      { name: "Seated DB Shoulder Press",    sets: 3, reps: "8-12",  rest_sec: 90  },
      { name: "Cable Row",                   sets: 3, reps: "10-12", rest_sec: 75  },
      { name: "Hammer Curl",                 sets: 3, reps: "10-12", rest_sec: 60  },
      { name: "Skull Crushers",              sets: 3, reps: "10-12", rest_sec: 60  },
    ],
  },
  6: { // Saturday — Lower
    name: "Lower Body — Volume Focus",
    is_rest_day: false,
    exercises: [
      { name: "Front Squat",                 sets: 4, reps: "8-10",  rest_sec: 120 },
      { name: "Hack Squat",                  sets: 3, reps: "10-12", rest_sec: 90  },
      { name: "Good Mornings",               sets: 3, reps: "10-12", rest_sec: 90  },
      { name: "Leg Extension",               sets: 3, reps: "12-15", rest_sec: 60  },
      { name: "Hip Thrust",                  sets: 3, reps: "12-15", rest_sec: 75  },
      { name: "Seated Calf Raise",           sets: 3, reps: "15-20", rest_sec: 45  },
    ],
  },
};

function adjustForPhase(exercises: Exercise[], phase: string): Exercise[] {
  if (phase === "cut") {
    return exercises.map((ex) => ({ ...ex, sets: Math.max(2, ex.sets - 1) }));
  }
  return exercises; // bulk & maintenance: full volume
}

async function main() {
  const userId = process.argv[2];
  if (!userId) {
    console.error("Usage: npx tsx db/seeds/seed-training-plan.ts <user_id> [week_number]");
    process.exit(1);
  }

  const [profile] = await sql`SELECT * FROM profiles WHERE id = ${userId}`;
  if (!profile) {
    console.error(`No profile found for user ${userId}`);
    process.exit(1);
  }

  let weekNumber = process.argv[3] ? parseInt(process.argv[3]) : null;
  if (!weekNumber) {
    const startDate = new Date(profile.program_start_date);
    const now = new Date();
    weekNumber = Math.ceil(
      (Math.floor((now.getTime() - startDate.getTime()) / 86400000) + 1) / 7
    );
  }

  console.log(`User: ${profile.name} | Phase: ${profile.phase} | Week: ${weekNumber}`);

  await sql`
    DELETE FROM training_plans
    WHERE user_id = ${userId} AND week_number = ${weekNumber}
  `;

  for (const [dowStr, plan] of Object.entries(TEMPLATE)) {
    const dow = parseInt(dowStr);
    const exercises = plan.is_rest_day
      ? null
      : adjustForPhase(plan.exercises, profile.phase);

    await sql`
      INSERT INTO training_plans
        (user_id, week_number, day_of_week, workout_name, is_rest_day, exercises)
      VALUES
        (${userId}, ${weekNumber}, ${dow}, ${plan.name}, ${plan.is_rest_day}, ${exercises ? JSON.stringify(exercises) : null})
    `;

    console.log(`  ✓ ${plan.name}`);
  }

  console.log(`\n✓ Training plan seeded for week ${weekNumber}`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
