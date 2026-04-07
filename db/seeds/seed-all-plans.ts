/**
 * Seed meal plan + training plan + grocery list for a user in one shot.
 *
 * Usage:
 *   npx tsx db/seeds/seed-all-plans.ts <user_id> [week_number]
 */
import { execSync } from "child_process";

const userId = process.argv[2];
const weekArg = process.argv[3] ?? "";

if (!userId) {
  console.error("Usage: npx tsx db/seeds/seed-all-plans.ts <user_id> [week_number]");
  process.exit(1);
}

const run = (script: string) => {
  const args = [userId, weekArg].filter(Boolean).join(" ");
  execSync(`npx tsx ${script} ${args}`, { stdio: "inherit" });
};

console.log("═══════════════════════════════════════");
console.log("  Seeding all plans for user:", userId);
console.log("═══════════════════════════════════════\n");

console.log("── Step 1/3: Meal Plan ─────────────────");
run("db/seeds/seed-meal-plan.ts");

console.log("\n── Step 2/3: Training Plan ─────────────");
run("db/seeds/seed-training-plan.ts");

console.log("\n── Step 3/3: Grocery List ──────────────");
run("db/seeds/seed-grocery-list.ts");

console.log("\n✅ All plans seeded successfully.");
