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

const SLOT_LABEL = ["", "Breakfast", "Lunch", "Snack", "Dinner", "Late Night"];
const P_COLOR = "oklch(0.68 0.20 15)";
const C_COLOR = "oklch(0.78 0.16 80)";
const F_COLOR = "oklch(0.68 0.16 235)";

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

  const currentWeight   = latestLog?.weight_lbs ?? profile.current_weight_lbs;
  const progressPct     = Math.min(100, Math.abs(
    (currentWeight - profile.current_weight_lbs) /
    Math.max(1, profile.goal_weight_lbs - profile.current_weight_lbs)
  ) * 100);

  const dietPhase       = PHASE_STYLES[profile.phase] ?? PHASE_STYLES.maintenance;
  const trainingPhase   = activeInfo?.phase ?? null;
  const weekInPhase     = activeInfo?.weekInPhase ?? null;
  const totalPhaseWeeks = activeInfo?.totalWeeks ?? null;
  const programDone     = activeInfo?.programDone ?? false;
  const programName     = rawProgram?.name ?? null;

  // Macro split bar — each macro's calorie share
  const pCals  = macros.protein * 4;
  const cCals  = macros.carbs   * 4;
  const fCals  = macros.fat     * 9;
  const sumCals = pCals + cCals + fCals;

  return (
    <div className="flex flex-col gap-2.5 h-full overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <p className="text-[11px] text-muted-foreground">
            {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h1 className="text-xl font-bold tracking-tight mt-0.5 leading-tight">
            {getGreeting()}, {profile.name.split(" ")[0]}
          </h1>
        </div>
        <span className={`text-[11px] font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full shrink-0 ml-3 ${dietPhase.bg} ${dietPhase.text}`}>
          {dietPhase.label}
        </span>
      </div>

      {/* ── Daily Targets: macro split bar ── */}
      <div className="glass widget-shadow rounded-2xl px-4 py-3 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Daily Targets
          </p>
          <p className="text-sm font-black tabular-nums" style={{ color: "oklch(0.72 0.17 42)" }}>
            {macros.calories.toLocaleString()}
            <span className="text-[10px] font-semibold text-muted-foreground ml-1">kcal</span>
          </p>
        </div>

        {/* Segmented bar: width ∝ calorie contribution */}
        <div className="flex h-2 rounded-full overflow-hidden mb-2" style={{ gap: "2px" }}>
          <div style={{ width: `${pct(pCals, sumCals)}%`, background: P_COLOR, borderRadius: "999px 0 0 999px" }} />
          <div style={{ width: `${pct(cCals, sumCals)}%`, background: C_COLOR }} />
          <div style={{ width: `${pct(fCals, sumCals)}%`, background: F_COLOR, borderRadius: "0 999px 999px 0" }} />
        </div>

        <div className="flex justify-between">
          {([
            { label: "Protein", g: macros.protein, color: P_COLOR },
            { label: "Carbs",   g: macros.carbs,   color: C_COLOR },
            { label: "Fat",     g: macros.fat,      color: F_COLOR },
          ] as const).map(({ label, g, color }) => (
            <div key={label} className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-xs font-bold tabular-nums">{g}g</span>
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 gap-2.5 shrink-0">

        <div className="glass widget-shadow rounded-2xl px-3.5 py-3 flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Goal</p>
          <div>
            <p className="text-lg font-black tabular-nums leading-none">
              {Math.abs(currentWeight - profile.goal_weight_lbs).toFixed(1)}
              <span className="text-xs font-medium text-muted-foreground ml-1">lbs left</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {currentWeight} → {profile.goal_weight_lbs}
            </p>
          </div>
          <div className="h-1 bg-foreground/10 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-700"
              style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <div className="glass widget-shadow rounded-2xl px-3.5 py-3 flex flex-col gap-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {trainingPhase ? "Phase" : "Program"}
          </p>
          <div>
            <p className="text-lg font-black tabular-nums leading-none">
              Week {weekInPhase ?? weekNumber}
              {totalPhaseWeeks != null && (
                <span className="text-xs font-medium text-muted-foreground ml-1">/ {totalPhaseWeeks}</span>
              )}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {trainingPhase?.name ?? programName ?? "No program"}
            </p>
          </div>
          {trainingPhase && weekInPhase != null && totalPhaseWeeks != null && (
            <div className="h-1 bg-foreground/10 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full"
                style={{ width: `${pct(weekInPhase, totalPhaseWeeks)}%` }} />
            </div>
          )}
        </div>
      </div>

      {/* ── Today's Training (flex-1) ── */}
      <div className="glass widget-shadow rounded-2xl overflow-hidden flex-1 min-h-0 flex flex-col">

        <div className="px-4 pt-3 pb-2 shrink-0 border-b border-border flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Today&apos;s Training
          </p>
          <div className="flex items-center gap-1.5">
            {programName && (
              <span className="text-[10px] text-muted-foreground truncate max-w-[90px]">{programName}</span>
            )}
            {trainingPhase?.isDeload && (
              <span className="text-[10px] font-bold uppercase text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">Deload</span>
            )}
            {programDone && (
              <span className="text-[10px] font-bold uppercase text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">Done</span>
            )}
          </div>
        </div>

        {rawProgram && todayDay ? (
          todayDay.isRest ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-1">
              <p className="text-3xl">😴</p>
              <p className="text-sm font-bold mt-1">Rest Day</p>
              <p className="text-xs text-muted-foreground">Recovery is part of the program.</p>
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0 px-4 pt-2.5 pb-3 gap-2.5">
              <div className="shrink-0">
                <p className="text-lg font-black text-primary tracking-tight leading-tight">{todayDay.name}</p>
                {trainingPhase && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {trainingPhase.name}
                    {weekInPhase != null && totalPhaseWeeks != null && ` · Week ${weekInPhase}/${totalPhaseWeeks}`}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5 flex-1 content-start overflow-hidden min-h-0">
                {(todayDay.exercises as any[])?.slice(0, 6).map((ex: any, i: number) => (
                  <div key={i} className="flex items-center gap-1.5 bg-foreground/5 rounded-xl px-2.5 py-1.5 h-fit">
                    <span className="text-xs font-medium">{ex.name}</span>
                    <span className="text-[10px] font-bold text-muted-foreground tabular-nums bg-foreground/8 px-1.5 py-0.5 rounded-full">
                      {ex.sets}×{ex.reps}
                    </span>
                  </div>
                ))}
                {(todayDay.exercises as any[])?.length > 6 && (
                  <div className="flex items-center bg-foreground/5 rounded-xl px-2.5 py-1.5 h-fit">
                    <span className="text-[11px] text-muted-foreground">
                      +{(todayDay.exercises as any[]).length - 6} more
                    </span>
                  </div>
                )}
              </div>

              <a href="/train"
                className="shrink-0 flex items-center justify-center gap-2 w-full py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl press">
                Start Workout →
              </a>
            </div>
          )
        ) : rawProgram && !todayDay ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-1">
            <p className="text-3xl">📅</p>
            <p className="text-sm font-bold mt-1">No workout today</p>
            {trainingPhase && <p className="text-xs text-muted-foreground">{trainingPhase.name}</p>}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-1.5">
            <p className="text-sm text-muted-foreground">No training plan set up.</p>
            <a href="/train/setup" className="text-xs text-primary font-semibold press">Set up training →</a>
          </div>
        )}
      </div>

      {/* ── Today's Meals ── */}
      <div className="glass widget-shadow rounded-2xl overflow-hidden shrink-0">
        <div className="px-4 pt-2.5 pb-2 border-b border-border">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Today&apos;s Meals
          </p>
        </div>

        {todayMeals && todayMeals.length > 0 ? (
          <div className="divide-y divide-border">
            {todayMeals.slice(0, 3).map((entry: any) => {
              const m = slotMacros(entry.meal_slot);
              return (
                <div key={entry.id} className="flex items-center justify-between px-4 py-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground leading-none">
                      {SLOT_LABEL[entry.meal_slot] ?? `Meal ${entry.meal_slot}`}
                    </p>
                    <p className="text-sm font-semibold truncate mt-0.5 leading-tight">{entry.recipes?.name}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-black tabular-nums leading-none">{m.calories} <span className="text-[10px] font-normal text-muted-foreground">kcal</span></p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{m.protein}P · {m.carbs}C · {m.fat}F</p>
                  </div>
                </div>
              );
            })}
            {todayMeals.length > 3 && (
              <div className="px-4 py-1.5">
                <a href="/meals" className="text-[11px] text-primary font-semibold press">
                  +{todayMeals.length - 3} more meals →
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="px-4 py-3 text-center">
            <p className="text-sm text-muted-foreground">No meals planned yet.</p>
            <a href="/meals" className="text-xs text-primary font-semibold mt-1 inline-block press">Set up meal plan →</a>
          </div>
        )}
      </div>

    </div>
  );
}
