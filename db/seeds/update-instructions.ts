import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { recipeSeeds } from "./recipes";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

async function updateInstructions() {
  console.log(`Updating instructions for ${recipeSeeds.length} recipes...`);

  let updated = 0;
  let notFound = 0;

  for (const recipe of recipeSeeds) {
    const { data, error } = await supabase
      .from("recipes")
      .update({
        instructions: recipe.instructions ?? null,
        ingredients: recipe.ingredients,
      })
      .eq("name", recipe.name)
      .select("id");

    if (error) {
      console.error(`  ✗ ERROR on "${recipe.name}": ${error.message}`);
    } else if (!data || data.length === 0) {
      console.log(`  ✗ NOT FOUND: ${recipe.name}`);
      notFound++;
    } else {
      console.log(`  ✓ ${recipe.name}`);
      updated++;
    }
  }

  console.log(`\nDone! Updated: ${updated}, Not found: ${notFound}`);
}

updateInstructions().catch((err) => { console.error(err); process.exit(1); });
