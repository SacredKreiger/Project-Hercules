import { createClient } from "@/lib/supabase/server";
import { calcBMR, calcTDEE, calcMacros } from "@/lib/macros";
import { CAL_SPLIT } from "@/lib/meal-scaling";
import { solvePortions } from "@/lib/portion-calc";
import { redirect } from "next/navigation";
import { MacroRing } from "@/components/MacroRing";

const PHASE_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  bulk:        { label: "Bulk",        bg: "bg-amber-500/12",   text: "text-amber-500" },
  cut:         { label: "Cut",         bg: "bg-rose-500/12",    text: "text-rose-500" },
  maintenance: { label: "Maintenance", bg: "bg-emerald-500/12", text: "text-emerald-500" },
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
  if (!profile) redirect("/onboarding");

  const bmr = calcBMR(profile.current_weight_lbs, profile.height_cm, profile.age, profile.gender);
  const tdee = calcTDEE(bmr, profile.activity_level);
  const macros = calcMacros(tdee, profile.current_weight_lbs, profile.phase);

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

  const mealsPerDay = todayMeals && todayMeals.length > 0
    ? (Math.max(...todayMeals.map((m: any) => m.meal_slot)) as 3 | 4 | 5)
    : 4;
  const isRestDay = todayWorkout?.is_rest_day ?? false;

  // Use the same Macro Correction Engine as the recipe sheet so numbers match
  function slotTargets(slot: number) {
    const split = CAL_SPLIT[mealsPerDay] ?? CAL_SPLIT[4];
    const f = (split[slot] ?? 0.25) * (isRestDay ? 0.85 : 1.0);
    return {
      calories: Math.round(macros.calories * f),
      protein:  Math.round(macros.protein  * f * 10) / 10,
      carbs:    Math.round(macros.carbs    * f * 10) / 10,
      fat:      Math.round(macros.fat      * f * 10) / 10,
    };
  }

  const mealSolutions = (todayMeals ?? []).map((m: any) => {
    const ingredients = Array.isArray(m.recipes?.ingredients) ? m.recipes.ingredients : [];
    return { entry: m, totals: solvePortions(ingredients, slotTargets(m.meal_slot)).totals };
  });

  const loggedCal  = mealSolutions.reduce((s, { totals }) => s + totals.calories, 0);
  const loggedPro  = mealSolutions.reduce((s, { totals }) => s + totals.protein,  0);
  const loggedCarb = mealSolutions.reduce((s, { totals }) => s + totals.carbs,    0);
  const loggedFat  = mealSolutions.reduce((s, { totals }) => s + totals.fat,      0);

  const currentWeight = latestLog?.weight_lbs ?? profile.current_weight_lbs;
  const progressPct = Math.min(100, Math.abs(
    (currentWeight - profile.current_weight_lbs) /
    Math.max(1, profile.goal_weight_lbs - profile.current_weight_lbs)
  ) * 100);

  const phase = PHASE_STYLES[profile.phase] ?? PHASE_STYLES.maintenance;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between pt-1">
        <div>
          <p className="text-xs text-muted-foreground tracking-wide">
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="text-2xl font-bold mt-0.5 tracking-tight">
            {getGreeting()}, {profile.name.split(" ")[0]}
          </h1>
        </div>
        <span className={`text-[11px] font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full ${phase.bg} ${phase.text}`}>
          {phase.label}
        </span>
      </div>

      {/* Macro rings */}
      <div className="glass widget-shadow rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold">Today&apos;s Macros</p>
          <p className="text-xs text-muted-foreground">logged / target</p>
        </div>
        <div className="grid grid-cols-4 gap-2 justify-items-center">
          <MacroRing label="Calories" logged={loggedCal}  target={macros.calories} unit="kcal" color="oklch(0.72 0.17 42)"  size={76} />
          <MacroRing label="Protein"  logged={loggedPro}  target={macros.protein}  unit="g"    color="oklch(0.68 0.20 15)"  size={76} />
          <MacroRing label="Carbs"    logged={loggedCarb} target={macros.carbs}    unit="g"    color="oklch(0.78 0.16 80)"  size={76} />
          <MacroRing label="Fat"      logged={loggedFat}  target={macros.fat}      unit="g"    color="oklch(0.68 0.16 235)" size={76} />
        </div>
      </div>

      {/* Goal progress */}
      <div className="glass widget-shadow rounded-2xl p-4 space-y-2.5">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold">Goal Progress</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {currentWeight} → {profile.goal_weight_lbs} lbs
          </span>
        </div>
        <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="flex justify-between">
          <p className="text-xs text-muted-foreground">{Math.abs(currentWeight - profile.goal_weight_lbs).toFixed(1)} lbs remaining</p>
          <p className="text-xs text-muted-foreground">Week {weekNumber}</p>
        </div>
      </div>

      {/* Today's Meals */}
      <div className="glass widget-shadow rounded-2xl overflow-hidden">
        <div className="px-4 pt-4 pb-2.5 border-b border-border">
          <h2 className="text-sm font-semibold">Today&apos;s Meals</h2>
        </div>
        <div className="divide-y divide-border">
          {mealSolutions.length > 0 ? (
            mealSolutions.map(({ entry, totals }) => (
              <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">Meal {entry.meal_slot}</p>
                  <p className="text-sm font-medium mt-0.5">{entry.recipes?.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{entry.recipes?.cuisine}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-bold tabular-nums">{totals.calories}</p>
                  <p className="text-[11px] text-muted-foreground">kcal · {totals.protein}g P</p>
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">No meals planned yet.</p>
              <a href="/meals" className="text-xs text-primary font-semibold mt-1.5 inline-block press">Set up meal plan →</a>
            </div>
          )}
        </div>
      </div>

      {/* Today's Training */}
      <div className="glass widget-shadow rounded-2xl overflow-hidden">
        <div className="px-4 pt-4 pb-2.5 border-b border-border">
          <h2 className="text-sm font-semibold">Today&apos;s Training</h2>
        </div>
        {todayWorkout ? (
          todayWorkout.is_rest_day ? (
            <div className="px-4 py-6 text-center">
              <p className="text-sm font-semibold">Rest Day</p>
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
                    <span className="text-xs font-semibold text-muted-foreground tabular-nums">{ex.sets}×{ex.reps}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">No workout scheduled.</p>
            <a href="/train" className="text-xs text-primary font-semibold mt-1.5 inline-block press">View training plan →</a>
          </div>
        )}
      </div>

    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
