import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import postgres from "postgres";
import { recipeSeeds } from "./recipes";

const sql = postgres(process.env.DATABASE_URL!);

async function seed() {
  console.log(`Seeding ${recipeSeeds.length} recipes...`);

  for (const recipe of recipeSeeds) {
    await sql`
      insert into recipes (name, description, meal_type, cuisine, calories, protein_g, carbs_g, fat_g, prep_time_min, cook_time_min, servings, ingredients, instructions, image_url, tags)
      values (
        ${recipe.name},
        ${recipe.description ?? null},
        ${recipe.meal_type}::meal_type,
        ${recipe.cuisine},
        ${recipe.calories},
        ${recipe.protein_g},
        ${recipe.carbs_g},
        ${recipe.fat_g},
        ${recipe.prep_time_min ?? null},
        ${recipe.cook_time_min ?? null},
        ${recipe.servings},
        ${JSON.stringify(recipe.ingredients)},
        ${recipe.instructions ?? null},
        ${null},
        ${recipe.tags ?? null}
      )
      on conflict do nothing
    `;
    console.log(`  ✓ ${recipe.name}`);
  }

  console.log("\nDone!");
  await sql.end();
}

seed().catch((err) => { console.error(err); process.exit(1); });
