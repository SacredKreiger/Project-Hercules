import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { MealsEnabledGate } from "@/components/MealsEnabledGate";
import { getEffectiveMacros } from "@/lib/macros";
import { redirect } from "next/navigation";
import { getActiveDayInfo, isV2 } from "@/lib/program";
import { DashboardMacroRings } from "@/components/DashboardMacroRings";
import type { AnyProgram } from "@/lib/program";
import type { MacroTotals } from "@/lib/types/food";

const PHASE_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  bulk:        { label: "Bulk",        bg: "bg-amber-500/12",   text: "text-amber-500" },
  cut:         { label: "Cut",         bg: "bg-rose-500/12",    text: "text-rose-500" },
  maintenance: { label: "Maintenance", bg: "bg-emerald-500/12", text: "text-emerald-500" },
};

const DOW_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const SLOT_LABELS: Record<string, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" };

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

  const macros = getEffectiveMacros(profile);
  const now = new Date();
  const dayOfWeek = now.getDay();
  const today = now.toISOString().slice(0, 10);

  const rawProgram = profile?.training_program as AnyProgram | null;
  const activeInfo = rawProgram ? getActiveDayInfo(rawProgram, dayOfWeek) : null;
  const todayDay   = activeInfo?.day ?? null;

  // Today's food log totals
  const { data: logData } = await supabase
    .from("food_log")
    .select("calories, protein_g, carbs_g, fat_g")
    .eq("user_id", user!.id)
    .eq("logged_date", today);

  const consumed: MacroTotals = (logData ?? []).reduce(
    (acc: MacroTotals, e: any) => ({
      calories: acc.calories + e.calories,
      protein:  acc.protein  + e.protein_g,
      carbs:    acc.carbs    + e.carbs_g,
      fat:      acc.fat      + e.fat_g,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  // Today's diary entries for the summary card
  const { data: todayEntries } = await supabase
    .from("food_log")
    .select("id, meal_slot, food_name, calories")
    .eq("user_id", user!.id)
    .eq("logged_date", today)
    .order("created_at")
    .limit(8);

  // Latest weigh-in
  const { data: progressLogs } = await supabase
    .from("progress_logs")
    .select("weight_lbs, log_date")
    .eq("user_id", user!.id)
    .order("log_date", { ascending: false })
    .limit(1);

  const currentWeight = progressLogs?.[0]?.weight_lbs ?? profile.current_weight_lbs;
  const progressPct = Math.min(100, Math.abs(
    (currentWeight - profile.current_weight_lbs) /
    Math.max(1, profile.goal_weight_lbs - profile.current_weight_lbs)
  ) * 100);

  const trainingPhase   = activeInfo?.phase ?? null;
  const weekInPhase     = activeInfo?.weekInPhase ?? null;
  const totalPhaseWeeks = activeInfo?.totalWeeks ?? null;
  const programDone     = activeInfo?.programDone ?? false;
  const programName     = rawProgram?.name ?? null;

  const weekDays: any[] = rawProgram
    ? (isV2(rawProgram) && trainingPhase ? trainingPhase.days : (rawProgram as any).days ?? [])
    : [];

  // Group today's entries by slot
  const bySlot: Record<string, any[]> = {};
  for (const e of (todayEntries ?? [])) {
    if (!bySlot[e.meal_slot]) bySlot[e.meal_slot] = [];
    bySlot[e.meal_slot].push(e);
  }
  const loggedSlots = Object.keys(bySlot);

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

      {/* ── Daily Intake ── */}
      <MealsEnabledGate>
      <div className="glass widget-shadow rounded-2xl px-4 pt-3 pb-4 shrink-0">
        <div className="mb-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Daily Intake</p>
        </div>
        <DashboardMacroRings macros={macros} consumed={consumed} />
      </div>

      {/* ── Goal Progress ── */}
      {(() => {
        const SEGS = 20;
        const filled = Math.round((progressPct / 100) * SEGS);
        const lbsLeft = Math.abs(currentWeight - profile.goal_weight_lbs).toFixed(1);
        return (
          <div className="glass widget-shadow rounded-2xl px-4 pt-3 pb-3 shrink-0">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Goal Progress</p>
              <p className="text-[11px] font-bold tabular-nums text-primary">
                {lbsLeft} <span className="font-normal text-muted-foreground">lbs left</span>
              </p>
            </div>
            <div className="flex gap-[3px] mb-2.5">
              {Array.from({ length: SEGS }).map((_, i) => (
                <div key={i} className={`flex-1 h-2 rounded-full ${i < filled ? "bg-primary" : "bg-foreground/10"}`} />
              ))}
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] text-muted-foreground tabular-nums">{currentWeight} lbs now</span>
              <span className="text-[10px] text-muted-foreground tabular-nums">{profile.goal_weight_lbs} lbs goal</span>
            </div>
          </div>
        );
      })()}

      {/* ── Today's Diary ── */}
      <div className="glass widget-shadow rounded-2xl px-3 pt-2.5 pb-3 shrink-0">
        <div className="mb-2">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Today&apos;s Diary</p>
        </div>
        {loggedSlots.length > 0 ? (
          <div className="space-y-1.5">
            {loggedSlots.map((slot) => {
              const slotEntries = bySlot[slot];
              const slotCal = slotEntries.reduce((s: number, e: any) => s + e.calories, 0);
              return (
                <Link key={slot} href="/meals" className="flex items-center justify-between bg-foreground/5 rounded-xl px-3 py-2.5 press">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{SLOT_LABELS[slot] ?? slot}</p>
                    <p className="text-sm font-semibold leading-snug mt-0.5 truncate max-w-[180px]">
                      {slotEntries[0].food_name}{slotEntries.length > 1 ? ` +${slotEntries.length - 1} more` : ""}
                    </p>
                  </div>
                  <p className="text-sm font-black tabular-nums shrink-0">
                    {Math.round(slotCal)}<span className="text-[10px] font-normal text-muted-foreground ml-0.5">kcal</span>
                  </p>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground">Nothing logged yet.</p>
            <Link href="/meals" className="text-xs text-primary font-semibold mt-1 inline-block press">Log food →</Link>
          </div>
        )}
      </div>
      </MealsEnabledGate>

      {/* ── Today's Training ── */}
      <div className="glass widget-shadow rounded-2xl overflow-hidden shrink-0">
        <div className="px-4 pt-3 pb-2.5 border-b border-border flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Today&apos;s Training</p>
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
              <div className="flex gap-1">
                {Array.from({ length: 7 }).map((_, dow) => {
                  const day = weekDays.find((d: any) => d.dayOfWeek === dow);
                  const isToday = dow === dayOfWeek;
                  const isRest = !day || day.isRest;
                  return (
                    <div key={dow} className="flex-1 flex flex-col items-center gap-1">
                      <span className={`text-[9px] font-semibold ${isToday ? "text-primary" : "text-muted-foreground"}`}>{DOW_SHORT[dow]}</span>
                      <div className={`w-full h-1.5 rounded-full transition-colors ${isToday ? "bg-primary" : isRest ? "bg-foreground/8" : "bg-foreground/20"}`} />
                    </div>
                  );
                })}
              </div>
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
                      <p className="text-base font-black text-primary tracking-tight leading-tight truncate">{todayDay.name}</p>
                      {trainingPhase && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {trainingPhase.name}{weekInPhase != null && totalPhaseWeeks != null && ` · Wk ${weekInPhase}/${totalPhaseWeeks}`}
                        </p>
                      )}
                    </div>
                    <Link href="/train" className="shrink-0 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl press">Start →</Link>
                  </div>
                )
              ) : (
                <p className="text-xs text-muted-foreground">No workout scheduled today.</p>
              )}
            </>
          ) : (
            <div className="text-center py-1 space-y-1">
              <p className="text-sm text-muted-foreground">No training plan set up.</p>
              <Link href="/train/setup" className="text-xs text-primary font-semibold press inline-block">Set up training →</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
