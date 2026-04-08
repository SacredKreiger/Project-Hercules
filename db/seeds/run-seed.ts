import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { recipeSeeds } from "./recipes";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

async function seed() {
  console.log(`Seeding ${recipeSeeds.length} recipes...`);
  let inserted = 0;
  let skipped = 0;

  for (const recipe of recipeSeeds) {
    // Check if recipe already exists by name
    const { data: existing } = await supabase
      .from("recipes")
      .select("id")
      .eq("name", recipe.name)
      .single();

    if (existing) {
      console.log(`  – skip (exists): ${recipe.name}`);
      skipped++;
      continue;
    }

    const { error } = await supabase.from("recipes").insert({
      name: recipe.name,
      description: recipe.description ?? null,
      meal_type: recipe.meal_type,
      cuisine: recipe.cuisine,
      calories: recipe.calories,
      protein_g: recipe.protein_g,
      carbs_g: recipe.carbs_g,
      fat_g: recipe.fat_g,
      prep_time_min: recipe.prep_time_min ?? null,
      cook_time_min: recipe.cook_time_min ?? null,
      servings: recipe.servings,
      ingredients: recipe.ingredients,
      instructions: recipe.instructions ?? null,
      image_url: null,
      tags: recipe.tags ?? null,
    });

    if (error) {
      console.error(`  ✗ ERROR on "${recipe.name}": ${error.message}`);
    } else {
      console.log(`  ✓ ${recipe.name}`);
      inserted++;
    }
  }

  console.log(`\nDone! Inserted: ${inserted}, Skipped: ${skipped}`);
}

seed().catch((err) => { console.error(err); process.exit(1); });
