import { createClient } from "@/lib/supabase/server";
import { calcBMR, calcTDEE, calcMacros } from "@/lib/macros";
import { CAL_SPLIT } from "@/lib/meal-scaling";
import { redirect } from "next/navigation";
import { MacroRing } from "@/components/MacroRing";
import { getActiveDayInfo, isV2 } from "@/lib/program";
import type { AnyProgram } from "@/lib/program";

const PHASE_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  bulk:        { label: "Bulk",        bg: "bg-amber-500/12",   text: "text-amber-500" },
  cut:         { label: "Cut",         bg: "bg-rose-500/12",    text: "text-rose-500" },
  maintenance: { label: "Maintenance", bg: "bg-emerald-500/12", text: "text-emerald-500" },
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
  if (!profile) redirect("/onboarding");

  const bmr    = calcBMR(profile.current_weight_lbs, profile.height_cm, profile.age, profile.gender);
  const tdee   = calcTDEE(bmr, profile.activity_level);
  const macros = calcMacros(tdee, profile.current_weight_lbs, profile.phase);

  const now       = new Date();
  const dayOfWeek = now.getDay();

  // ── Training: resolve today's day for V1 and V2 programs ─────────────────
  const rawProgram = profile?.training_program as AnyProgram | null;
  const activeInfo = rawProgram ? getActiveDayInfo(rawProgram, dayOfWeek) : null;
  const todayDay   = activeInfo?.day ?? null;

  // ── Meal week number: based on when meal plan was set up ──────────────────
  const mealStartDate = profile.program_start_date
    ? new Date(profile.program_start_date)
    : now;
  const weekNumber = Math.max(1, Math.ceil(
    (Math.floor((now.getTime() - mealStartDate.getTime()) / 86_400_000) + 1) / 7
  ));

  const { data: todayMeals } = await supabase
    .from("meal_plans").select("*, recipes(*)")
    .eq("user_id", user!.id).eq("week_number", weekNumber).eq("day_of_week", dayOfWeek)
    .order("meal_slot");

  const { data: latestLog } = await supabase
    .from("progress_logs").select("*")
    .eq("user_id", user!.id).order("log_date", { ascending: false }).limit(1).single();

  const mealsPerDay = todayMeals && todayMeals.length > 0
    ? (Math.max(...todayMeals.map((m: any) => m.meal_slot)) as 3 | 4 | 5)
    : 4;

  const isRestDay = todayDay?.isRest ?? false;

  function slotMacros(slot: number) {
    const split = CAL_SPLIT[mealsPerDay] ?? CAL_SPLIT[4];
    const f = (split[slot] ?? 0.25) * (isRestDay ? 0.85 : 1.0);
    return {
      calories: Math.round(macros.calories * f),
      protein:  Math.round(macros.protein  * f),
      carbs:    Math.round(macros.carbs    * f),
      fat:      Math.round(macros.fat      * f),
    };
  }

  const plannedCal  = (todayMeals ?? []).reduce((s: number, m: any) => s + slotMacros(m.meal_slot).calories, 0);
  const plannedPro  = (todayMeals ?? []).reduce((s: number, m: any) => s + slotMacros(m.meal_slot).protein,  0);
  const plannedCarb = (todayMeals ?? []).reduce((s: number, m: any) => s + slotMacros(m.meal_slot).carbs,    0);
  const plannedFat  = (todayMeals ?? []).reduce((s: number, m: any) => s + slotMacros(m.meal_slot).fat,      0);

  const currentWeight = latestLog?.weight_lbs ?? profile.current_weight_lbs;
  const progressPct   = Math.min(100, Math.abs(
    (currentWeight - profile.current_weight_lbs) /
    Math.max(1, profile.goal_weight_lbs - profile.current_weight_lbs)
  ) * 100);

  const dietPhase = PHASE_STYLES[profile.phase] ?? PHASE_STYLES.maintenance;

  // ── Training phase context (V2 only) ─────────────────────────────────────
  const trainingPhase    = activeInfo?.phase ?? null;
  const weekInPhase      = activeInfo?.weekInPhase ?? null;
  const totalPhaseWeeks  = activeInfo?.totalWeeks ?? null;
  const programDone      = activeInfo?.programDone ?? false;
  const programName      = rawProgram?.name ?? null;

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
        <span className={`text-[11px] font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full ${dietPhase.bg} ${dietPhase.text}`}>
          {dietPhase.label}
        </span>
      </div>

      {/* Macro rings */}
      <div className="glass widget-shadow rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold">Today&apos;s Macros</p>
          <p className="text-xs text-muted-foreground">planned / target</p>
        </div>
        <div className="grid grid-cols-4 gap-2 justify-items-center">
          <MacroRing label="Calories" logged={plannedCal}  target={macros.calories} unit="kcal" color="oklch(0.72 0.17 42)"  size={76} />
          <MacroRing label="Protein"  logged={plannedPro}  target={macros.protein}  unit="g"    color="oklch(0.68 0.20 15)"  size={76} />
          <MacroRing label="Carbs"    logged={plannedCarb} target={macros.carbs}    unit="g"    color="oklch(0.78 0.16 80)"  size={76} />
          <MacroRing label="Fat"      logged={plannedFat}  target={macros.fat}      unit="g"    color="oklch(0.68 0.16 235)" size={76} />
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
          <div className="h-full bg-primary rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }} />
        </div>
        <div className="flex justify-between">
          <p className="text-xs text-muted-foreground">
            {Math.abs(currentWeight - profile.goal_weight_lbs).toFixed(1)} lbs remaining
          </p>
          <p className="text-xs text-muted-foreground">Week {weekNumber}</p>
        </div>
      </div>

      {/* Today's Training */}
      <div className="glass widget-shadow rounded-2xl overflow-hidden">
        <div className="px-4 pt-4 pb-2.5 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold">Today&apos;s Training</h2>
          {programName && (
            <span className="text-xs text-muted-foreground truncate max-w-[140px]">{programName}</span>
          )}
        </div>

        {rawProgram && todayDay ? (
          todayDay.isRest ? (
            <div className="px-4 py-6 text-center space-y-1">
              <p className="text-2xl">😴</p>
              <p className="text-sm font-semibold">Rest Day</p>
              <p className="text-xs text-muted-foreground">Recovery is part of the program.</p>
            </div>
          ) : (
            <div>
              {/* Phase + day context */}
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-primary">{todayDay.name}</p>
                  {trainingPhase && (
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                      {trainingPhase.name}
                      {weekInPhase != null && totalPhaseWeeks != null && (
                        <span>· Week {weekInPhase}/{totalPhaseWeeks}</span>
                      )}
                      {trainingPhase.isDeload && (
                        <span className="text-[10px] font-bold uppercase text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                          Deload
                        </span>
                      )}
                    </p>
                  )}
                </div>
                {programDone && (
                  <span className="text-[10px] font-bold uppercase text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Complete
                  </span>
                )}
              </div>

              {/* Exercise preview */}
              <div className="divide-y divide-border">
                {(todayDay.exercises as any[])?.slice(0, 4).map((ex: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm">{ex.name}</span>
                    <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                      {ex.sets}×{ex.reps}
                    </span>
                  </div>
                ))}
                {(todayDay.exercises as any[])?.length > 4 && (
                  <div className="px-4 py-2">
                    <p className="text-xs text-muted-foreground">
                      +{(todayDay.exercises as any[]).length - 4} more exercises
                    </p>
                  </div>
                )}
              </div>

              {/* Start Workout CTA */}
              <a href="/train"
                className="flex items-center justify-center gap-2 px-4 py-3.5 bg-primary text-primary-foreground text-sm font-semibold press border-t border-border">
                Start Workout →
              </a>
            </div>
          )
        ) : rawProgram && !todayDay ? (
          <div className="px-4 py-6 text-center space-y-1">
            <p className="text-2xl">📅</p>
            <p className="text-sm font-semibold">No workout scheduled today</p>
            {trainingPhase && (
              <p className="text-xs text-muted-foreground">{trainingPhase.name}</p>
            )}
          </div>
        ) : (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">No training plan set up.</p>
            <a href="/train/setup" className="text-xs text-primary font-semibold mt-1.5 inline-block press">
              Set up training →
            </a>
          </div>
        )}
      </div>

      {/* Today's Meals */}
      <div className="glass widget-shadow rounded-2xl overflow-hidden">
        <div className="px-4 pt-4 pb-2.5 border-b border-border">
          <h2 className="text-sm font-semibold">Today&apos;s Meals</h2>
        </div>
        <div className="divide-y divide-border">
          {todayMeals && todayMeals.length > 0 ? (
            todayMeals.map((entry: any) => {
              const m = slotMacros(entry.meal_slot);
              return (
                <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                      Meal {entry.meal_slot}
                    </p>
                    <p className="text-sm font-medium mt-0.5">{entry.recipes?.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{entry.recipes?.cuisine}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-bold tabular-nums">{m.calories} kcal</p>
                    <p className="text-[11px] text-muted-foreground">{m.protein}g P · {m.carbs}g C · {m.fat}g F</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">No meals planned yet.</p>
              <a href="/meals" className="text-xs text-primary font-semibold mt-1.5 inline-block press">
                Set up meal plan →
              </a>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
