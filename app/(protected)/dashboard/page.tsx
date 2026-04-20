import { createClient } from "@/lib/supabase/server";
import { calcBMR, calcTDEE, calcMacros } from "@/lib/macros";
import { CAL_SPLIT } from "@/lib/meal-scaling";
import { redirect } from "next/navigation";
import { getActiveDayInfo } from "@/lib/program";
import type { AnyProgram } from "@/lib/program";

const PHASE_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  bulk:        { label: "Bulk",        bg: "bg-amber-500/12",   text: "text-amber-500" },
  cut:         { label: "Cut",         bg: "bg-rose-500/12",    text: "text-rose-500" },
  maintenance: { label: "Maintenance", bg: "bg-emerald-500/12", text: "text-emerald-500" },
};

const MACRO_BARS = [
  { key: "protein", label: "Protein", color: "oklch(0.68 0.20 15)"  },
  { key: "carbs",   label: "Carbs",   color: "oklch(0.78 0.16 80)"  },
  { key: "fat",     label: "Fat",     color: "oklch(0.68 0.16 235)" },
] as const;

const SLOT_LABEL = ["", "Breakfast", "Lunch", "Snack", "Dinner", "Late Night"];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function pct(n: number, total: number) {
  return total > 0 ? Math.min(100, (n / total) * 100) : 0;
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

  const rawProgram = profile?.training_program as AnyProgram | null;
  const activeInfo = rawProgram ? getActiveDayInfo(rawProgram, dayOfWeek) : null;
  const todayDay   = activeInfo?.day ?? null;

  const mealStartDate = profile.program_start_date ? new Date(profile.program_start_date) : now;
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

  const dietPhase       = PHASE_STYLES[profile.phase] ?? PHASE_STYLES.maintenance;
  const trainingPhase   = activeInfo?.phase ?? null;
  const weekInPhase     = activeInfo?.weekInPhase ?? null;
  const totalPhaseWeeks = activeInfo?.totalWeeks ?? null;
  const programDone     = activeInfo?.programDone ?? false;
  const programName     = rawProgram?.name ?? null;

  const macroValues = { protein: plannedPro, carbs: plannedCarb, fat: plannedFat };
  const macroTargets = { protein: macros.protein, carbs: macros.carbs, fat: macros.fat };

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between pt-1">
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

      {/* ── Calorie hero + macro bars ── */}
      <div className="glass widget-shadow rounded-2xl p-5">

        {/* Calorie hero */}
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              Today&apos;s Calories
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-5xl font-black tabular-nums tracking-tight leading-none"
                style={{ color: "oklch(0.72 0.17 42)" }}>
                {plannedCal}
              </span>
              <span className="text-sm text-muted-foreground">/ {macros.calories} kcal</span>
            </div>
          </div>
          <div className="text-right pb-0.5">
            <p className="text-[11px] text-muted-foreground mb-0.5">Remaining</p>
            <p className="text-xl font-bold tabular-nums">
              {Math.max(0, macros.calories - plannedCal)}
            </p>
          </div>
        </div>

        {/* Calorie bar */}
        <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden mb-5">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct(plannedCal, macros.calories)}%`, background: "oklch(0.72 0.17 42)" }}
          />
        </div>

        {/* Macro bars */}
        <div className="space-y-3.5">
          {MACRO_BARS.map(({ key, label, color }) => {
            const logged = macroValues[key];
            const target = macroTargets[key];
            return (
              <div key={key}>
                <div className="flex justify-between items-center mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    <span className="text-xs font-medium text-muted-foreground">{label}</span>
                  </div>
                  <span className="text-xs font-semibold tabular-nums">
                    {logged}<span className="text-muted-foreground font-normal">/{target}g</span>
                  </span>
                </div>
                <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct(logged, target)}%`, background: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Stats row: goal + program week ── */}
      <div className="grid grid-cols-2 gap-3">

        {/* Goal progress */}
        <div className="glass widget-shadow rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Goal</p>
          <div>
            <p className="text-2xl font-black tabular-nums leading-none">
              {Math.abs(currentWeight - profile.goal_weight_lbs).toFixed(1)}
              <span className="text-sm font-medium text-muted-foreground ml-1">lbs</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {currentWeight} → {profile.goal_weight_lbs}
            </p>
          </div>
          <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden mt-auto">
            <div className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {/* Week / phase */}
        <div className="glass widget-shadow rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {trainingPhase ? "Phase" : "Program"}
          </p>
          <div>
            <p className="text-2xl font-black tabular-nums leading-none">
              Week {weekInPhase ?? weekNumber}
              {totalPhaseWeeks && (
                <span className="text-sm font-medium text-muted-foreground ml-1">
                  / {totalPhaseWeeks}
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {trainingPhase?.name ?? programName ?? "No program"}
            </p>
          </div>
          {trainingPhase && weekInPhase != null && totalPhaseWeeks != null && (
            <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden mt-auto">
              <div className="h-full bg-primary rounded-full"
                style={{ width: `${pct(weekInPhase, totalPhaseWeeks)}%` }} />
            </div>
          )}
        </div>
      </div>

      {/* ── Today's Training ── */}
      <div className="glass widget-shadow rounded-2xl overflow-hidden">

        <div className="px-4 pt-4 pb-3 flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">
              Today&apos;s Training
            </p>
            {programName && (
              <p className="text-xs text-muted-foreground">{programName}</p>
            )}
          </div>
          {trainingPhase?.isDeload && (
            <span className="text-[10px] font-bold uppercase text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full mt-0.5">
              Deload
            </span>
          )}
          {programDone && (
            <span className="text-[10px] font-bold uppercase text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full mt-0.5">
              Complete
            </span>
          )}
        </div>

        {rawProgram && todayDay ? (
          todayDay.isRest ? (
            <div className="px-4 pb-5 text-center space-y-1 pt-2">
              <p className="text-4xl mb-2">😴</p>
              <p className="text-base font-bold">Rest Day</p>
              <p className="text-xs text-muted-foreground">Recovery is part of the program.</p>
            </div>
          ) : (
            <div className="px-4 pb-4 space-y-4">
              <div className="border-t border-border pt-3">
                <p className="text-xl font-black text-primary tracking-tight">{todayDay.name}</p>
                {trainingPhase && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {trainingPhase.name}
                    {weekInPhase != null && totalPhaseWeeks != null && ` · Week ${weekInPhase}/${totalPhaseWeeks}`}
                  </p>
                )}
              </div>

              {/* Exercise chips */}
              <div className="flex flex-wrap gap-2">
                {(todayDay.exercises as any[])?.slice(0, 6).map((ex: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 bg-foreground/5 rounded-xl px-3 py-2">
                    <span className="text-xs font-medium">{ex.name}</span>
                    <span className="text-[10px] font-bold text-muted-foreground tabular-nums bg-foreground/8 px-1.5 py-0.5 rounded-full">
                      {ex.sets}×{ex.reps}
                    </span>
                  </div>
                ))}
                {(todayDay.exercises as any[])?.length > 6 && (
                  <div className="flex items-center bg-foreground/5 rounded-xl px-3 py-2">
                    <span className="text-xs text-muted-foreground font-medium">
                      +{(todayDay.exercises as any[]).length - 6} more
                    </span>
                  </div>
                )}
              </div>

              <a href="/train"
                className="flex items-center justify-center gap-2 w-full py-3.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl press">
                Start Workout →
              </a>
            </div>
          )
        ) : rawProgram && !todayDay ? (
          <div className="px-4 pb-5 pt-2 text-center space-y-1">
            <p className="text-4xl mb-2">📅</p>
            <p className="text-sm font-semibold">No workout today</p>
            {trainingPhase && (
              <p className="text-xs text-muted-foreground">{trainingPhase.name}</p>
            )}
          </div>
        ) : (
          <div className="px-4 pb-5 pt-2 text-center space-y-1">
            <p className="text-sm text-muted-foreground">No training plan set up.</p>
            <a href="/train/setup" className="text-xs text-primary font-semibold inline-block press">
              Set up training →
            </a>
          </div>
        )}
      </div>

      {/* ── Today's Meals ── */}
      <div className="glass widget-shadow rounded-2xl overflow-hidden">
        <div className="px-4 pt-4 pb-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Today&apos;s Meals
          </p>
        </div>

        {todayMeals && todayMeals.length > 0 ? (
          <div className="px-4 pb-4 space-y-2">
            {todayMeals.map((entry: any) => {
              const m = slotMacros(entry.meal_slot);
              return (
                <div key={entry.id}
                  className="flex items-center justify-between bg-foreground/4 rounded-xl px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {SLOT_LABEL[entry.meal_slot] ?? `Meal ${entry.meal_slot}`}
                    </p>
                    <p className="text-sm font-semibold mt-0.5 truncate">{entry.recipes?.name}</p>
                    {entry.recipes?.cuisine && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{entry.recipes.cuisine}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-base font-black tabular-nums">{m.calories}</p>
                    <p className="text-[10px] text-muted-foreground">kcal</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {m.protein}P · {m.carbs}C · {m.fat}F
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-4 pb-5 pt-1 text-center">
            <p className="text-sm text-muted-foreground">No meals planned yet.</p>
            <a href="/meals" className="text-xs text-primary font-semibold mt-1.5 inline-block press">
              Set up meal plan →
            </a>
          </div>
        )}
      </div>

    </div>
  );
}
