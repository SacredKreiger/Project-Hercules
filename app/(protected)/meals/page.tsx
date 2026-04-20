import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MealPlanView from "@/components/MealPlanView";
import { calcBMR, calcTDEE, calcMacros } from "@/lib/macros";

export default async function MealsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
  if (!profile) redirect("/onboarding");

  const now = new Date();
  const startDate = profile.program_start_date ? new Date(profile.program_start_date) : now;
  const weekNumber = Math.max(1, Math.ceil((Math.floor((now.getTime() - startDate.getTime()) / 86400000) + 1) / 7));
  const todayDow = now.getDay();

  // Load the full month (all 4 weeks) at once
  const { data: mealPlan } = await supabase
    .from("meal_plans")
    .select("*, recipes(*)")
    .eq("user_id", user!.id)
    .order("week_number")
    .order("day_of_week")
    .order("meal_slot");

  const bmr = calcBMR(profile.current_weight_lbs, profile.height_cm, profile.age, profile.gender);
  const tdee = calcTDEE(bmr, profile.activity_level);
  const macros = calcMacros(tdee, profile.current_weight_lbs, profile.phase);

  const plan = mealPlan ?? [];
  const mealsPerDay = plan.length > 0
    ? (Math.max(...plan.map((e) => e.meal_slot)) as 3 | 4 | 5)
    : 4;

  return (
    <MealPlanView
      mealPlan={plan}
      weekNumber={Math.min(weekNumber, 4)}
      phase={profile.phase}
      todayDow={todayDow}
      dailyCalories={macros.calories}
      dailyMacros={macros}
      mealsPerDay={mealsPerDay}
      savedCuisines={profile.cuisine_preferences ?? []}
      savedRestrictions={profile.dietary_restrictions ?? []}
    />
  );
}
