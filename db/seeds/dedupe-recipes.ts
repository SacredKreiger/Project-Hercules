import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

async function dedupe() {
  const { data: recipes, error } = await supabase
    .from("recipes")
    .select("id, name, created_at")
    .order("name")
    .order("created_at");

  if (error || !recipes) { console.error(error); process.exit(1); }

  console.log(`Total recipes in DB: ${recipes.length}`);

  // Group by name, keep the oldest (first created), delete the rest
  const seen = new Map<string, string>(); // name → id to keep
  const toDelete: string[] = [];

  for (const r of recipes) {
    if (seen.has(r.name)) {
      toDelete.push(r.id);
    } else {
      seen.set(r.name, r.id);
    }
  }

  if (toDelete.length === 0) {
    console.log("No duplicates found.");
    return;
  }

  // Clear meal_plans referencing the duplicate recipe IDs so FK doesn't block delete
  console.log("Clearing meal_plan entries that reference duplicate recipes...");
  const { error: mpError } = await supabase
    .from("meal_plans")
    .delete()
    .in("recipe_id", toDelete);
  if (mpError) { console.error("meal_plans delete error:", mpError.message); process.exit(1); }

  console.log(`Deleting ${toDelete.length} duplicate recipes...`);
  const { error: delError } = await supabase
    .from("recipes")
    .delete()
    .in("id", toDelete);

  if (delError) {
    console.error("Delete error:", delError.message);
  } else {
    console.log(`Done! ${toDelete.length} duplicates removed. Regenerate your meal plan.`);
  }
}

dedupe().catch((err) => { console.error(err); process.exit(1); });
