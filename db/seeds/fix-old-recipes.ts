import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { recipeSeeds } from "./recipes";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

async function fixOldRecipes() {
  const seedNames = new Set(recipeSeeds.map((r) => r.name));

  const { data: allRecipes, error } = await supabase
    .from("recipes")
    .select("id, name, cuisine, meal_type")
    .order("name");

  if (error || !allRecipes) { console.error(error); process.exit(1); }

  const orphanIds = allRecipes.filter((r) => !seedNames.has(r.name)).map((r) => r.id);
  console.log(`Total in DB: ${allRecipes.length}`);
  console.log(`Orphans to remove: ${orphanIds.length}`);

  if (orphanIds.length === 0) { console.log("Nothing to do."); return; }

  // Clear meal_plan entries referencing these recipes first
  const { error: mpErr } = await supabase.from("meal_plans").delete().in("recipe_id", orphanIds);
  if (mpErr) { console.error("meal_plans delete:", mpErr.message); process.exit(1); }

  // Delete the orphan recipes
  const { error: delErr } = await supabase.from("recipes").delete().in("id", orphanIds);
  if (delErr) { console.error("recipes delete:", delErr.message); process.exit(1); }

  console.log(`Done — removed ${orphanIds.length} old recipes. Regenerate your meal plan.`);
}

fixOldRecipes().catch((err) => { console.error(err); process.exit(1); });
