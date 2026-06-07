import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getEffectiveMacros } from "@/lib/macros";
import FoodDiaryView from "@/components/FoodDiaryView";
import type { FoodLogEntry, MacroTotals } from "@/lib/types/food";

export default async function MealsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile) redirect("/onboarding");

  const macros = getEffectiveMacros(profile);
  const targets: MacroTotals = {
    calories: macros.calories,
    protein: macros.protein,
    carbs: macros.carbs,
    fat: macros.fat,
  };

  const today = new Date().toISOString().slice(0, 10);

  const { data: logData } = await supabase
    .from("food_log")
    .select("*")
    .eq("user_id", user.id)
    .eq("logged_date", today)
    .order("created_at");

  const entries = (logData ?? []) as FoodLogEntry[];
  const totals = entries.reduce<MacroTotals>(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein:  acc.protein  + e.protein_g,
      carbs:    acc.carbs    + e.carbs_g,
      fat:      acc.fat      + e.fat_g,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return (
    <FoodDiaryView
      entries={entries}
      totals={totals}
      targets={targets}
      date={today}
    />
  );
}
