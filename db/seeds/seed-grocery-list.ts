/**
 * Generate a grocery list from the current week's meal plan.
 * Aggregates all recipe ingredients, normalizes units, and categorizes items.
 *
 * Usage:
 *   npx tsx db/seeds/seed-grocery-list.ts <user_id> [week_number]
 *
 * Requires a meal plan to already exist for that week.
 */
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!);

type Ingredient = { name: string; qty: number; unit: string };
type GroceryItem = {
  name: string;
  qty: number;
  unit: string;
  category: string;
  checked: boolean;
};

const CATEGORY_ORDER = ["Protein", "Produce", "Dairy", "Grains & Carbs", "Pantry", "Other"];

function classifyCategory(name: string): string {
  const n = name.toLowerCase();
  if (/chicken|beef|pork|turkey|salmon|tuna|shrimp|fish|steak|ground|egg|tofu|tempeh|protein powder|whey|casein/.test(n))
    return "Protein";
  if (/spinach|kale|broccoli|lettuce|tomato|onion|garlic|pepper|cucumber|carrot|celery|zucchini|mushroom|avocado|lemon|lime|jalapeño|cilantro|parsley|arugula|asparagus|green bean|snap pea|corn|edamame|sweet potato|potato/.test(n))
    return "Produce";
  if (/milk|cheese|yogurt|cottage cheese|cream|butter|cheddar|mozzarella|parmesan|feta|cotija|crema/.test(n))
    return "Dairy";
  if (/rice|pasta|bread|tortilla|oat|flour|quinoa|noodle|wrap|pita|chip|cracker|cereal|granola/.test(n))
    return "Grains & Carbs";
  if (/oil|sauce|salsa|soy sauce|vinegar|honey|sugar|salt|pepper|spice|seasoning|cumin|paprika|oregano|basil|thyme|bay|cinnamon|chili|broth|stock|coconut milk|tahini|peanut butter|almond|cashew|nut|seed|mayo|mustard|ketchup|hot sauce|sriracha|hoisin|miso|curry paste/.test(n))
    return "Pantry";
  return "Other";
}

function normalizeUnit(unit: string): string {
  const u = (unit ?? "").toLowerCase().trim();
  if (/^(tbsp|tablespoon)s?$/.test(u)) return "tbsp";
  if (/^(tsp|teaspoon)s?$/.test(u)) return "tsp";
  if (/^(cup)s?$/.test(u)) return "cup";
  if (/^(oz|ounce)s?$/.test(u)) return "oz";
  if (/^(lb|pound)s?$/.test(u)) return "lb";
  if (/^(g|gram)s?$/.test(u)) return "g";
  if (/^(kg|kilogram)s?$/.test(u)) return "kg";
  if (/^(ml|milliliter)s?$/.test(u)) return "ml";
  if (/^(l|liter)s?$/.test(u)) return "l";
  if (/^(whole|piece|slice|clove|can|jar|packet|bag|bunch|stalk|sprig|head)s?$/.test(u))
    return u.replace(/s$/, "");
  return u;
}

async function main() {
  const userId = process.argv[2];
  if (!userId) {
    console.error("Usage: npx tsx db/seeds/seed-grocery-list.ts <user_id> [week_number]");
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

  console.log(`User: ${profile.name} | Week: ${weekNumber}`);

  // Load meal plan + recipe ingredients for this week
  const mealPlan = await sql`
    SELECT mp.servings_multiplier, r.ingredients, r.servings
    FROM meal_plans mp
    JOIN recipes r ON r.id = mp.recipe_id
    WHERE mp.user_id = ${userId} AND mp.week_number = ${weekNumber}
  `;

  if (mealPlan.length === 0) {
    console.error(`No meal plan found for week ${weekNumber}. Run seed-meal-plan.ts first.`);
    process.exit(1);
  }

  // Aggregate ingredients
  const aggregated: Record<string, { name: string; qty: number; unit: string }> = {};

  for (const row of mealPlan) {
    const multiplier = (row.servings_multiplier ?? 1) / (row.servings ?? 1);
    const ingredients: Ingredient[] = row.ingredients;

    for (const ing of ingredients) {
      const normUnit = normalizeUnit(ing.unit ?? "");
      const key = `${ing.name.toLowerCase().trim()}::${normUnit}`;

      if (aggregated[key]) {
        aggregated[key].qty += ing.qty * multiplier;
      } else {
        aggregated[key] = {
          name: ing.name,
          qty: ing.qty * multiplier,
          unit: normUnit || ing.unit,
        };
      }
    }
  }

  // Build grocery items
  const items: GroceryItem[] = Object.values(aggregated).map((ing) => ({
    name: ing.name,
    qty: Math.round(ing.qty * 10) / 10,
    unit: ing.unit,
    category: classifyCategory(ing.name),
    checked: false,
  }));

  items.sort((a, b) => {
    const catDiff = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
    return catDiff !== 0 ? catDiff : a.name.localeCompare(b.name);
  });

  // Delete existing list for this week, then insert
  await sql`
    DELETE FROM grocery_lists WHERE user_id = ${userId} AND week_number = ${weekNumber}
  `;

  await sql`
    INSERT INTO grocery_lists (user_id, week_number, items)
    VALUES (${userId}, ${weekNumber}, ${JSON.stringify(items)})
  `;

  // Print summary by category
  const byCat: Record<string, GroceryItem[]> = {};
  for (const item of items) {
    if (!byCat[item.category]) byCat[item.category] = [];
    byCat[item.category].push(item);
  }
  for (const cat of CATEGORY_ORDER) {
    if (byCat[cat]?.length) {
      console.log(`\n  ${cat} (${byCat[cat].length})`);
      for (const i of byCat[cat]) {
        console.log(`    · ${i.name} — ${i.qty} ${i.unit}`);
      }
    }
  }

  console.log(`\n✓ Grocery list seeded: ${items.length} items for week ${weekNumber}`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
