import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MealPlanView from "@/components/MealPlanView";

export default async function MealsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
  if (!profile) redirect("/onboarding");

  const startDate = new Date(profile.program_start_date);
  const now = new Date();
  const weekNumber = Math.ceil((Math.floor((now.getTime() - startDate.getTime()) / 86400000) + 1) / 7);
  const todayDow = now.getDay();

  const { data: mealPlan } = await supabase
    .from("meal_plans")
    .select("*, recipes(*)")
    .eq("user_id", user!.id)
    .eq("week_number", weekNumber)
    .order("day_of_week")
    .order("meal_slot");

  return (
    <MealPlanView
      mealPlan={mealPlan ?? []}
      weekNumber={weekNumber}
      phase={profile.phase}
      todayDow={todayDow}
      savedCuisines={profile.cuisine_preferences ?? []}
      savedRestrictions={profile.dietary_restrictions ?? []}
    />
  );
}
