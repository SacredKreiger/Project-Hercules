import { createClient } from "@/lib/supabase/server";
import { calcBMR, calcTDEE, calcMacros } from "@/lib/macros";
import { Flame, Beef, Wheat, Droplets } from "lucide-react";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  if (!profile) redirect("/onboarding");

  const bmr = calcBMR(profile.current_weight_lbs, profile.height_cm, profile.age, profile.gender);
  const tdee = calcTDEE(bmr, profile.activity_level);
  const macros = calcMacros(tdee, profile.current_weight_lbs, profile.phase);

  const today = new Date().toISOString().split("T")[0];
  const dayOfWeek = new Date().getDay();
  const startDate = new Date(profile.program_start_date);
  const now = new Date();
  const weekNumber = Math.ceil((Math.floor((now.getTime() - startDate.getTime()) / 86400000) + 1) / 7);

  const { data: todayMeals } = await supabase
    .from("meal_plans").select("*, recipes(*)")
    .eq("user_id", user!.id).eq("week_number", weekNumber).eq("day_of_week", dayOfWeek)
    .order("meal_slot");

  const { data: todayWorkout } = await supabase
    .from("training_plans").select("*")
    .eq("user_id", user!.id).eq("week_number", weekNumber).eq("day_of_week", dayOfWeek)
    .single();

  const { data: latestLog } = await supabase
    .from("progress_logs").select("*")
    .eq("user_id", user!.id).order("log_date", { ascending: false }).limit(1).single();

  const phaseColors: Record<string, string> = {
    bulk: "text-amber-500",
    cut: "text-rose-500",
    maintenance: "text-emerald-500",
  };

  const currentWeight = latestLog?.weight_lbs ?? profile.current_weight_lbs;
  const progressPct = Math.min(100, Math.abs(
    (currentWeight - profile.current_weight_lbs) /
    (profile.goal_weight_lbs - profile.current_weight_lbs)
  ) * 100);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between pt-1">
        <div>
          <p className="text-sm text-muted-foreground">{today}</p>
          <h1 className="text-2xl font-bold mt-0.5">
            Good {getGreeting()}, {profile.name.split(" ")[0]}
          </h1>
        </div>
        <span className={`text-xs font-semibold uppercase tracking-widest px-3 py-1.5 glass rounded-full widget-shadow ${phaseColors[profile.phase]}`}>
          {profile.phase}
        </span>
      </div>

      {/* Macro cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Calories", value: macros.calories, unit: "kcal", icon: Flame, color: "text-orange-400" },
          { label: "Protein", value: macros.protein, unit: "g", icon: Beef, color: "text-rose-400" },
          { label: "Carbs", value: macros.carbs, unit: "g", icon: Wheat, color: "text-amber-400" },
          { label: "Fat", value: macros.fat, unit: "g", icon: Droplets, color: "text-sky-400" },
        ].map(({ label, value, unit, icon: Icon, color }) => (
          <div key={label} className="glass widget-shadow rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`h-3.5 w-3.5 ${color}`} />
              <span className="text-xs text-muted-foreground font-medium">{label}</span>
            </div>
            <p className="text-2xl font-bold tracking-tight">
              {value}
              <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="glass widget-shadow rounded-2xl p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold">Progress to Goal</span>
          <span className="text-xs text-muted-foreground">
            {currentWeight} → {profile.goal_weight_lbs} lbs
          </span>
        </div>
        <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
          <div
            className="h-full glass-gold rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {Math.abs(currentWeight - profile.goal_weight_lbs).toFixed(1)} lbs to goal · Week {weekNumber}
        </p>
      </div>

      {/* Today's Meals */}
      <div className="glass widget-shadow rounded-2xl overflow-hidden">
        <div className="px-4 pt-4 pb-2 border-b border-border">
          <h2 className="text-sm font-semibold">Today&apos;s Meals</h2>
        </div>
        <div className="divide-y divide-border">
          {todayMeals && todayMeals.length > 0 ? (
            todayMeals.map((entry: any) => (
              <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-xs text-muted-foreground">Meal {entry.meal_slot}</p>
                  <p className="text-sm font-medium mt-0.5">{entry.recipes?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{entry.recipes?.calories} kcal</p>
                  <p className="text-xs text-muted-foreground">{entry.recipes?.protein_g}g protein</p>
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-5 text-center">
              <p className="text-sm text-muted-foreground">No meals planned yet.</p>
              <a href="/meals" className="text-xs text-primary font-medium mt-1 inline-block">Set up meal plan →</a>
            </div>
          )}
        </div>
      </div>

      {/* Today's Training */}
      <div className="glass widget-shadow rounded-2xl overflow-hidden">
        <div className="px-4 pt-4 pb-2 border-b border-border">
          <h2 className="text-sm font-semibold">Today&apos;s Training</h2>
        </div>
        {todayWorkout ? (
          todayWorkout.is_rest_day ? (
            <div className="px-4 py-5 text-center">
              <p className="text-base font-semibold">Rest Day</p>
              <p className="text-xs text-muted-foreground mt-1">Recovery is part of the program.</p>
            </div>
          ) : (
            <div>
              <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold text-primary">{todayWorkout.workout_name}</p>
              </div>
              <div className="divide-y divide-border">
                {(todayWorkout.exercises as any[])?.slice(0, 4).map((ex: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm">{ex.name}</span>
                    <span className="text-xs font-medium text-muted-foreground">{ex.sets}×{ex.reps}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          <div className="px-4 py-5 text-center">
            <p className="text-sm text-muted-foreground">No workout scheduled.</p>
            <a href="/train" className="text-xs text-primary font-medium mt-1 inline-block">View training plan →</a>
          </div>
        )}
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
