import { createClient } from "@/lib/supabase/server";
import { calcBMR, calcTDEE, calcMacros } from "@/lib/macros";
import { CAL_SPLIT } from "@/lib/meal-scaling";
import { redirect } from "next/navigation";
import { getActiveDayInfo, isV2 } from "@/lib/program";
import { DashboardMacroRings } from "@/components/DashboardMacroRings";
import type { AnyProgram } from "@/lib/program";

const PHASE_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  bulk:        { label: "Bulk",        bg: "bg-amber-500/12",   text: "text-amber-500" },
  cut:         { label: "Cut",         bg: "bg-rose-500/12",    text: "text-rose-500" },
  maintenance: { label: "Maintenance", bg: "bg-emerald-500/12", text: "text-emerald-500" },
};

const SLOT_LABEL = ["", "Breakfast", "Lunch", "Snack", "Dinner", "Late Night"];
const DOW_SHORT  = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// ── Page ──────────────────────────────────────────────────────────────────────
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

  // Latest weigh-in for current weight
  const { data: progressLogs } = await supabase
    .from("progress_logs").select("weight_lbs, log_date")
    .eq("user_id", user!.id)
    .order("log_date", { ascending: false })
    .limit(1);

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

  const slotMacrosList = (todayMeals ?? []).map((entry: any) => ({
    slot: entry.meal_slot,
    ...slotMacros(entry.meal_slot),
  }));

  const currentWeight = progressLogs?.[0]?.weight_lbs ?? profile.current_weight_lbs;

  const progressPct = Math.min(100, Math.abs(
    (currentWeight - profile.current_weight_lbs) /
    Math.max(1, profile.goal_weight_lbs - profile.current_weight_lbs)
  ) * 100);

  const dietPhase       = PHASE_STYLES[profile.phase] ?? PHASE_STYLES.maintenance;
  const trainingPhase   = activeInfo?.phase ?? null;
  const weekInPhase     = activeInfo?.weekInPhase ?? null;
  const totalPhaseWeeks = activeInfo?.totalWeeks ?? null;
  const programDone     = activeInfo?.programDone ?? false;
  const programName     = rawProgram?.name ?? null;

  // Week strip — use phase days (V2) or program days (V1)
  const weekDays: any[] = rawProgram
    ? (isV2(rawProgram) && trainingPhase ? trainingPhase.days : (rawProgram as any).days ?? [])
    : [];

  return (
    <div className="flex flex-col gap-2.5">

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
      </div>

      {/* ── Daily Intake — macro rings ── */}
      <div className="glass widget-shadow rounded-2xl px-4 pt-3 pb-4 shrink-0">
        <div className="mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Daily Intake
          </p>
        </div>
        <DashboardMacroRings macros={macros} slotMacrosList={slotMacrosList} />
      </div>

      {/* ── Goal Progress — segmented bar ── */}
      {(() => {
        const SEGS = 20;
        const filled = Math.round((progressPct / 100) * SEGS);
        const lbsLeft = Math.abs(currentWeight - profile.goal_weight_lbs).toFixed(1);
        return (
          <div className="glass widget-shadow rounded-2xl px-4 pt-3 pb-3 shrink-0">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Goal Progress
              </p>
              <p className="text-[11px] font-bold tabular-nums text-primary">
                {lbsLeft} <span className="font-normal text-muted-foreground">lbs left</span>
              </p>
            </div>

            {/* Segmented bar */}
            <div className="flex gap-[3px] mb-2.5">
              {Array.from({ length: SEGS }).map((_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-2 rounded-full ${i < filled ? "bg-primary" : "bg-foreground/10"}`}
                />
              ))}
            </div>

            <div className="flex justify-between">
              <span className="text-[10px] text-muted-foreground tabular-nums">{currentWeight} lbs now</span>
              <span className="text-[10px] text-muted-foreground tabular-nums">{profile.goal_weight_lbs} lbs goal</span>
            </div>
          </div>
        );
      })()}

      {/* ── Today's Training ── */}
      <div className="glass widget-shadow rounded-2xl overflow-hidden shrink-0">
        <div className="px-4 pt-3 pb-2.5 border-b border-border flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Today&apos;s Training
          </p>
          <div className="flex items-center gap-1.5">
            {programName && <span className="text-[10px] text-muted-foreground truncate max-w-[90px]">{programName}</span>}
            {trainingPhase?.isDeload && (
              <span className="text-[10px] font-bold uppercase text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">Deload</span>
            )}
            {programDone && (
              <span className="text-[10px] font-bold uppercase text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">Done</span>
            )}
          </div>
        </div>

        <div className="px-4 pt-3 pb-3 space-y-3">
          {rawProgram ? (
            <>
              {/* Week strip — slim bars */}
              <div className="flex gap-1">
                {Array.from({ length: 7 }).map((_, dow) => {
                  const day     = weekDays.find((d: any) => d.dayOfWeek === dow);
                  const isToday = dow === dayOfWeek;
                  const isRest  = !day || day.isRest;
                  return (
                    <div key={dow} className="flex-1 flex flex-col items-center gap-1">
                      <span className={`text-[9px] font-semibold ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                        {DOW_SHORT[dow]}
                      </span>
                      <div className={`w-full h-1.5 rounded-full transition-colors ${
                        isToday  ? "bg-primary"
                        : isRest ? "bg-foreground/8"
                                 : "bg-foreground/20"
                      }`} />
                    </div>
                  );
                })}
              </div>

              {/* Day info + CTA */}
              {todayDay ? (
                todayDay.isRest ? (
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">😴</span>
                    <div>
                      <p className="text-sm font-bold">Rest Day</p>
                      <p className="text-[11px] text-muted-foreground">Recover, hydrate, sleep well.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-black text-primary tracking-tight leading-tight truncate">
                        {todayDay.name}
                      </p>
                      {trainingPhase && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {trainingPhase.name}
                          {weekInPhase != null && totalPhaseWeeks != null && ` · Wk ${weekInPhase}/${totalPhaseWeeks}`}
                        </p>
                      )}
                    </div>
                    <a href="/train"
                      className="shrink-0 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl press">
                      Start →
                    </a>
                  </div>
                )
              ) : (
                <p className="text-xs text-muted-foreground">No workout scheduled today.</p>
              )}
            </>
          ) : (
            <div className="text-center py-1 space-y-1">
              <p className="text-sm text-muted-foreground">No training plan set up.</p>
              <a href="/train/setup" className="text-xs text-primary font-semibold press inline-block">
                Set up training →
              </a>
            </div>
          )}
        </div>
      </div>

      {/* ── Today's Meals — 2-col mini cards ── */}
      <div className="glass widget-shadow rounded-2xl px-3 pt-2.5 pb-3 shrink-0">
        <div className="mb-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Today&apos;s Meals
          </p>
        </div>

        {todayMeals && todayMeals.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {todayMeals.map((entry: any) => {
              const m = slotMacros(entry.meal_slot);
              return (
                <a key={entry.id} href="/meals" className="bg-foreground/5 rounded-xl px-3 py-2.5 block press">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground leading-none">
                    {SLOT_LABEL[entry.meal_slot] ?? `Meal ${entry.meal_slot}`}
                  </p>
                  <p className="text-sm font-semibold leading-snug mt-1 line-clamp-2">
                    {entry.recipes?.name}
                  </p>
                  <p className="text-xs font-black tabular-nums mt-1.5">
                    {m.calories}<span className="text-[10px] font-normal text-muted-foreground ml-0.5">kcal</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {m.protein}P · {m.carbs}C · {m.fat}F
                  </p>
                </a>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground">No meals planned yet.</p>
            <a href="/meals" className="text-xs text-primary font-semibold mt-1 inline-block press">
              Set up meal plan →
            </a>
          </div>
        )}
      </div>

    </div>
  );
}
