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

  if (!mealPlan || mealPlan.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meal Plan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Week {weekNumber} · <span className="capitalize">{profile.phase}</span> phase</p>
        </div>
        <div className="glass widget-shadow rounded-2xl px-4 py-12 text-center">
          <p className="text-muted-foreground text-sm">Your meal plan hasn&apos;t been generated yet.</p>
          <a href="/meals/setup" className="text-xs text-primary font-semibold mt-1.5 inline-block press">Set up meal plan →</a>
        </div>
      </div>
    );
  }

  return (
    <MealPlanView
      mealPlan={mealPlan}
      weekNumber={weekNumber}
      phase={profile.phase}
      todayDow={todayDow}
    />
  );
}
