import { createClient } from "@/lib/supabase/server";
import { calcBMR, calcTDEE, calcMacros } from "@/lib/macros";
import { CAL_SPLIT } from "@/lib/meal-scaling";
import { redirect } from "next/navigation";
import { getActiveDayInfo, isV2 } from "@/lib/program";
import { MacroRing } from "@/components/MacroRing";
import type { AnyProgram } from "@/lib/program";

const PHASE_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  bulk:        { label: "Bulk",        bg: "bg-amber-500/12",   text: "text-amber-500" },
  cut:         { label: "Cut",         bg: "bg-rose-500/12",    text: "text-rose-500" },
  maintenance: { label: "Maintenance", bg: "bg-emerald-500/12", text: "text-emerald-500" },
};

const SLOT_LABEL = ["", "Breakfast", "Lunch", "Snack", "Dinner", "Late Night"];
const DOW_SHORT  = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const CAL_COLOR = "oklch(0.72 0.17 42)";
const P_COLOR   = "oklch(0.68 0.20 15)";
const C_COLOR   = "oklch(0.78 0.16 80)";
const F_COLOR   = "oklch(0.68 0.16 235)";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function pct(n: number, total: number) {
  return total > 0 ? Math.min(100, (n / total) * 100) : 0;
}

// ── SVG line chart (server-rendered) ─────────────────────────────────────────
function WeightChart({
  logs,
  startWeight,
  goalWeight,
  phase,
}: {
  logs: { weight_lbs: number; log_date: string }[];
  startWeight: number;
  goalWeight: number;
  phase: string;
}) {
  const W = 320, H = 72;
  const pad = { t: 6, r: 8, b: 18, l: 8 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;

  const goalColor =
    phase === "cut" ? "oklch(0.65 0.22 22)" :
    phase === "bulk" ? "oklch(0.75 0.17 65)" :
    "oklch(0.65 0.18 150)";

  // No data — placeholder
  if (logs.length === 0) {
    const midY = pad.t + plotH / 2;
    const goalY = pad.t + plotH * 0.25;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        <line x1={pad.l} y1={goalY} x2={W - pad.r} y2={goalY}
          stroke={goalColor} strokeWidth="1.5" strokeDasharray="5 4" strokeOpacity="0.6" />
        <line x1={pad.l} y1={midY} x2={W - pad.r} y2={midY}
          stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.15" strokeDasharray="3 3" />
        <text x={pad.l} y={goalY - 3} fontSize="9" fill={goalColor} opacity="0.8">goal</text>
        <text x={pad.l} y={H - 4} fontSize="9" fill="currentColor" opacity="0.35">no weigh-ins yet</text>
      </svg>
    );
  }

  const allW = [...logs.map(l => l.weight_lbs), goalWeight, startWeight];
  const range = Math.max(...allW) - Math.min(...allW);
  const minW = Math.min(...allW) - range * 0.12 - 0.5;
  const maxW = Math.max(...allW) + range * 0.12 + 0.5;

  function toX(i: number) {
    return logs.length === 1
      ? pad.l + plotW / 2
      : pad.l + (i / (logs.length - 1)) * plotW;
  }
  function toY(w: number) {
    return pad.t + plotH - ((w - minW) / (maxW - minW)) * plotH;
  }

  const goalY   = toY(goalWeight);
  const pts     = logs.map((l, i) => ({ x: toX(i), y: toY(l.weight_lbs) }));
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = logs.length > 1
    ? `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(H - pad.b).toFixed(1)} L${pts[0].x.toFixed(1)},${(H - pad.b).toFixed(1)} Z`
    : "";
  const last = pts[pts.length - 1];
  const lastWeight = logs[logs.length - 1].weight_lbs;

  // X-axis date labels (first and last)
  const firstDate = new Date(logs[0].log_date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const lastDate  = new Date(logs[logs.length - 1].log_date).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <defs>
        <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.60 0.18 255)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="oklch(0.60 0.18 255)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Goal line */}
      <line x1={pad.l} y1={goalY} x2={W - pad.r} y2={goalY}
        stroke={goalColor} strokeWidth="1.5" strokeDasharray="5 4" strokeOpacity="0.7" />
      <text x={W - pad.r - 2} y={goalY - 3} fontSize="8.5" fill={goalColor}
        textAnchor="end" opacity="0.85">
        {goalWeight} lbs
      </text>

      {/* Area fill */}
      {areaPath && <path d={areaPath} fill="url(#wGrad)" />}

      {/* Weight line */}
      {logs.length > 1 && (
        <path d={linePath} fill="none" stroke="oklch(0.60 0.18 255)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      )}

      {/* Current weight dot */}
      <circle cx={last.x} cy={last.y} r="4" fill="oklch(0.60 0.18 255)" />
      <circle cx={last.x} cy={last.y} r="2" fill="white" />

      {/* X-axis labels */}
      {logs.length > 1 && (
        <>
          <text x={pts[0].x} y={H - 2} fontSize="8.5" fill="currentColor" opacity="0.35" textAnchor="start">{firstDate}</text>
          <text x={pts[pts.length - 1].x} y={H - 2} fontSize="8.5" fill="currentColor" opacity="0.35" textAnchor="end">{lastDate}</text>
        </>
      )}

      {/* Current weight label */}
      <text x={last.x} y={last.y - 7} fontSize="9" fill="oklch(0.60 0.18 255)"
        textAnchor={last.x > W * 0.7 ? "end" : "middle"} fontWeight="600">
        {lastWeight} lbs
      </text>
    </svg>
  );
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

  // Fetch all weigh-ins for the chart
  const { data: progressLogs } = await supabase
    .from("progress_logs").select("weight_lbs, log_date")
    .eq("user_id", user!.id)
    .order("log_date", { ascending: true })
    .limit(30);

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

  const currentWeight   = progressLogs && progressLogs.length > 0
    ? progressLogs[progressLogs.length - 1].weight_lbs
    : profile.current_weight_lbs;

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

      {/* ── Daily Targets — macro rings ── */}
      <div className="glass widget-shadow rounded-2xl px-4 pt-3 pb-4 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Daily Targets
          </p>
          <p className="text-[11px] text-muted-foreground">target</p>
        </div>
        <div className="grid grid-cols-4 gap-1 justify-items-center">
          <MacroRing label="Calories" logged={macros.calories} target={macros.calories} unit="kcal" color={CAL_COLOR} size={72} hideTarget />
          <MacroRing label="Protein"  logged={macros.protein}  target={macros.protein}  unit="g"    color={P_COLOR}   size={72} hideTarget />
          <MacroRing label="Carbs"    logged={macros.carbs}    target={macros.carbs}    unit="g"    color={C_COLOR}   size={72} hideTarget />
          <MacroRing label="Fat"      logged={macros.fat}      target={macros.fat}      unit="g"    color={F_COLOR}   size={72} hideTarget />
        </div>
      </div>

      {/* ── Goal — weight chart ── */}
      <div className="glass widget-shadow rounded-2xl px-4 pt-3 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Goal Progress</p>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {currentWeight} → {profile.goal_weight_lbs} lbs
            </span>
            <span className="text-[10px] font-bold text-primary">
              {progressPct.toFixed(0)}%
            </span>
          </div>
        </div>
        <WeightChart
          logs={progressLogs ?? []}
          startWeight={profile.current_weight_lbs}
          goalWeight={profile.goal_weight_lbs}
          phase={profile.phase}
        />
      </div>

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

      {/* ── Today's Meals — vertical compact ── */}
      <div className="glass widget-shadow rounded-2xl overflow-hidden shrink-0">
        <div className="px-4 pt-2.5 pb-2 border-b border-border">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Today&apos;s Meals
          </p>
        </div>

        {todayMeals && todayMeals.length > 0 ? (
          <div className="divide-y divide-border">
            {todayMeals.slice(0, 2).map((entry: any) => {
              const m = slotMacros(entry.meal_slot);
              return (
                <div key={entry.id} className="px-4 py-2.5">
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground leading-none">
                      {SLOT_LABEL[entry.meal_slot] ?? `Meal ${entry.meal_slot}`}
                    </p>
                    <p className="text-xs font-black tabular-nums shrink-0">{m.calories} <span className="text-muted-foreground font-normal">kcal</span></p>
                  </div>
                  <p className="text-sm font-semibold leading-tight truncate">{entry.recipes?.name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{m.protein}g P · {m.carbs}g C · {m.fat}g F</p>
                </div>
              );
            })}
            {todayMeals.length > 2 && (
              <div className="px-4 py-1.5">
                <a href="/meals" className="text-[11px] text-primary font-semibold press">
                  +{todayMeals.length - 2} more meals →
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
