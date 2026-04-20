"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/Skeleton";
import Link from "next/link";
import { getExerciseInfo } from "@/lib/exercises";
import { updateProgressAfterWorkout } from "@/lib/actions/training";
import { getSuggested } from "@/lib/training-utils";
import { getActiveDayInfo, isV2 } from "@/lib/program";
import type { AnyProgram } from "@/lib/program";
import type { ExerciseConfig } from "@/lib/templates";

type SetLog = { setNumber: number; actualWeight: number | null; actualReps: number | null; completed: boolean };

const DOW_SHORT = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function todayKey() {
  return `hc-setlogs-${new Date().toISOString().split("T")[0]}`;
}

// ── ExerciseCard ──────────────────────────────────────────────────────────────

function parseDefaultReps(reps: string): string {
  if (!reps || reps === "AMRAP") return "";
  const m = reps.match(/^(\d+)/);
  return m ? m[1] : "";
}

type Draft = { weight: string; reps: string };

function ExerciseCard({
  exercise, logs, isExpanded, onToggle, onLogSet, onUnlogSet,
  suggestedWeight, isManual,
}: {
  exercise:        ExerciseConfig;
  logs:            SetLog[];
  isExpanded:      boolean;
  onToggle:        () => void;
  onLogSet:        (setNum: number, weight: number | null, reps: number | null) => void;
  onUnlogSet:      (setNum: number) => void;
  suggestedWeight: number;
  isManual:        boolean;
}) {
  const info       = getExerciseInfo(exercise.name);
  const isWeighted = info?.unit === "weight_reps";
  const isCardio   = info?.unit === "distance_time";
  const doneSets   = logs.filter((s) => s.completed).length;

  // Manual mode: show last logged weight but leave blank if none
  const defaultWeight = isManual && suggestedWeight === 0 ? "" : suggestedWeight.toString();
  const defaultReps   = parseDefaultReps(exercise.reps);

  const [drafts, setDrafts] = useState<Draft[]>(() =>
    Array.from({ length: exercise.sets }, () => ({ weight: defaultWeight, reps: defaultReps })),
  );

  useEffect(() => {
    setDrafts((prev) =>
      prev.map((d) => ({
        weight: d.weight === "" || d.weight === "45" ? defaultWeight : d.weight,
        reps:   d.reps   === ""                      ? defaultReps   : d.reps,
      })),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestedWeight]);

  function setDraft(i: number, field: keyof Draft, val: string) {
    setDrafts((prev) => prev.map((d, idx) => idx === i ? { ...d, [field]: val } : d));
  }

  function handleCheck(i: number) {
    const d      = drafts[i];
    const weight = isWeighted ? (parseFloat(d.weight) || null) : null;
    const reps   = isCardio   ? null : (parseInt(d.reps, 10) || null);
    onLogSet(i + 1, weight, reps);
  }

  function handleUncheck(i: number) {
    const log = logs.find((l) => l.setNumber === i + 1);
    if (log) {
      setDraft(i, "weight", log.actualWeight?.toString() ?? drafts[i].weight);
      setDraft(i, "reps",   log.actualReps?.toString()   ?? drafts[i].reps);
    }
    onUnlogSet(i + 1);
  }

  return (
    <div className="glass widget-shadow rounded-2xl overflow-hidden">
      <button type="button" onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left press active:bg-foreground/5 transition-colors">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{exercise.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {exercise.sets} × {exercise.reps}
            {isWeighted && !isManual && suggestedWeight > 0 && ` · ${suggestedWeight} lbs`}
            {isWeighted && isManual && " · Manual"}
            {exercise.restSeconds > 0 && ` · ${exercise.restSeconds}s`}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {Array.from({ length: exercise.sets }).map((_, i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full ${
              logs.find((l) => l.setNumber === i + 1)?.completed ? "bg-primary" : "bg-foreground/15"
            }`} />
          ))}
        </div>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`text-muted-foreground shrink-0 ml-1 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t border-border divide-y divide-border">
          {isCardio ? (
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm text-muted-foreground">{exercise.reps}</span>
              <button type="button"
                onClick={() => doneSets > 0 ? onUnlogSet(1) : onLogSet(1, null, null)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold press transition-all ${
                  doneSets > 0 ? "bg-primary/15 text-primary" : "bg-foreground/8 text-muted-foreground"
                }`}>
                {doneSets > 0 ? "Done ✓" : "Mark Done"}
              </button>
            </div>
          ) : (
            Array.from({ length: exercise.sets }).map((_, i) => {
              const done = logs.find((l) => l.setNumber === i + 1)?.completed ?? false;
              return (
                <div key={i} className={`flex items-center gap-2 px-4 py-2.5 transition-opacity ${done ? "opacity-60" : ""}`}>
                  <span className="text-xs text-muted-foreground shrink-0 w-8">Set {i + 1}</span>
                  {isWeighted && (
                    <input type="number" inputMode="decimal" placeholder="lbs"
                      value={drafts[i]?.weight ?? defaultWeight}
                      onChange={(e) => setDraft(i, "weight", e.target.value)}
                      readOnly={done}
                      className="w-20 shrink-0 bg-foreground/5 rounded-lg px-2 py-1.5 text-sm text-center tabular-nums outline-none focus:ring-1 focus:ring-primary/50 read-only:opacity-60"
                    />
                  )}
                  {isWeighted && <span className="text-xs text-muted-foreground shrink-0">×</span>}
                  <input type="number" inputMode="numeric"
                    placeholder={exercise.reps === "AMRAP" ? "reps" : exercise.reps}
                    value={drafts[i]?.reps ?? defaultReps}
                    onChange={(e) => setDraft(i, "reps", e.target.value)}
                    readOnly={done}
                    className="w-20 shrink-0 bg-foreground/5 rounded-lg px-2 py-1.5 text-sm text-center tabular-nums outline-none focus:ring-1 focus:ring-primary/50 read-only:opacity-60"
                  />
                  <div className="flex-1" />
                  <button type="button"
                    onPointerUp={() => done ? handleUncheck(i) : handleCheck(i)}
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 press transition-all ${
                      done ? "border-primary bg-primary" : "border-border"
                    }`}>
                    {done && (
                      <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TrainPage() {
  const [program,    setProgram]    = useState<AnyProgram | null>(null);
  const [prs,        setPrs]        = useState<Record<string, number>>({});
  const [progress,   setProgress]   = useState<Record<string, { weight: number }>>({});
  const [bodyweight, setBodyweight] = useState<number>(0);
  const [gender,     setGender]     = useState<string>("male");
  const [loading,    setLoading]    = useState(true);
  const [setLogs,    setSetLogs]    = useState<Record<string, SetLog[]>>({});
  const [expandedEx, setExpandedEx] = useState<string | null>(null);
  const [completed,  setCompleted]  = useState(false);
  const [, startTransition] = useTransition();

  const todayDow = new Date().getDay();

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("training_program, training_prs, training_progress, current_weight_lbs, gender")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) { setLoading(false); return; }

    if (profile?.training_program)  setProgram(profile.training_program as AnyProgram);
    if (profile?.training_prs)       setPrs(profile.training_prs as Record<string, number>);
    if (profile?.training_progress)  setProgress(profile.training_progress as Record<string, { weight: number }>);
    if (profile?.current_weight_lbs) setBodyweight(profile.current_weight_lbs as number);
    if (profile?.gender)             setGender(profile.gender as string);

    try {
      const saved = localStorage.getItem(todayKey());
      if (saved) setSetLogs(JSON.parse(saved));
    } catch { /* ignore */ }

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Resolve active day + phase info
  const activeInfo = program ? getActiveDayInfo(program, todayDow) : null;
  const todayDay   = activeInfo?.day ?? null;

  // Overload mode — read from the active phase (V2) or default auto
  const overloadMode = activeInfo?.phase?.overload?.type ?? "auto";
  const isManual     = overloadMode === "manual";

  // Week strip — use V2 phase days if available, else V1 program days
  const weekDays = program
    ? (isV2(program) && activeInfo?.phase ? activeInfo.phase.days : (program as any).days ?? [])
    : [];

  function handleLogSet(exercise: string, setNum: number, weight: number | null, reps: number | null) {
    setSetLogs((prev) => {
      const existing = prev[exercise] ?? [];
      const idx = existing.findIndex((s) => s.setNumber === setNum);
      const entry: SetLog = { setNumber: setNum, actualWeight: weight, actualReps: reps, completed: true };
      const updated = idx >= 0 ? existing.map((s, i) => i === idx ? entry : s) : [...existing, entry];
      const next = { ...prev, [exercise]: updated };
      try { localStorage.setItem(todayKey(), JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  function handleUnlogSet(exercise: string, setNum: number) {
    setSetLogs((prev) => {
      const existing = prev[exercise] ?? [];
      const updated = existing.map((s) => s.setNumber === setNum ? { ...s, completed: false } : s);
      const next = { ...prev, [exercise]: updated };
      try { localStorage.setItem(todayKey(), JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }

  function handleCompleteWorkout() {
    setCompleted(true);
    if (!todayDay) return;

    const completedData: Record<string, { targetReps: string; loggedSets: { reps: number | null; weight: number | null; completed: boolean }[] }> = {};
    for (const ex of todayDay.exercises) {
      const info = getExerciseInfo(ex.name);
      if (info?.unit !== "weight_reps") continue;
      completedData[ex.name] = {
        targetReps: ex.reps,
        loggedSets: (setLogs[ex.name] ?? []).map((s) => ({
          reps: s.actualReps,
          weight: s.actualWeight,
          completed: s.completed,
        })),
      };
    }

    startTransition(async () => {
      const result = await updateProgressAfterWorkout(completedData);
      if (result?.error) console.error("Progress update failed:", result.error);
    });
  }

  const totalSets = todayDay?.exercises.reduce((acc, ex) => acc + ex.sets, 0) ?? 0;
  const doneSets  = Object.values(setLogs).reduce((acc, sets) => acc + sets.filter((s) => s.completed).length, 0);
  const allDone   = totalSets > 0 && doneSets >= totalSets;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Training</h1>
          {program && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {program.name}
              {activeInfo?.phase && ` · ${activeInfo.phase.name}`}
            </p>
          )}
        </div>
        <Link href="/train/setup" className="text-xs text-muted-foreground press px-3 py-1.5 glass rounded-full">
          Change
        </Link>
      </div>

      {loading && (
        <div className="space-y-3">
          {[0,1,2].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      )}

      {!loading && !program && (
        <div className="glass widget-shadow rounded-2xl px-6 py-14 text-center space-y-3">
          <p className="text-2xl">🏋️</p>
          <p className="font-semibold">No training plan yet</p>
          <p className="text-sm text-muted-foreground">Pick a template or build your own.</p>
          <Link href="/train/setup"
            className="mt-1 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold press inline-block">
            Set Up Training →
          </Link>
        </div>
      )}

      {!loading && program && todayDay && (
        <>
          {/* Day summary + week strip */}
          <div className="glass widget-shadow rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-primary mb-1">
                  Today
                  {activeInfo?.weekInPhase != null && (
                    <span className="ml-2 text-muted-foreground normal-case tracking-normal font-medium">
                      Week {activeInfo.weekInPhase}{activeInfo.totalWeeks != null ? `/${activeInfo.totalWeeks}` : ""}
                    </span>
                  )}
                </p>
                <p className="text-xl font-bold">{todayDay.name}</p>
                {activeInfo?.phase && (
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    {activeInfo.phase.name}
                    {activeInfo.phase.isDeload && (
                      <span className="text-[10px] font-bold uppercase text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">Deload</span>
                    )}
                  </p>
                )}
              </div>
              {todayDay.isRest ? (
                <span className="text-2xl">😴</span>
              ) : totalSets > 0 ? (
                <div className="text-right">
                  <p className="text-2xl font-bold tabular-nums">
                    {doneSets}<span className="text-base text-muted-foreground font-normal">/{totalSets}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">sets done</p>
                </div>
              ) : null}
            </div>

            {!todayDay.isRest && totalSets > 0 && (
              <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (doneSets / totalSets) * 100)}%` }}
                />
              </div>
            )}

            {/* Week strip */}
            <div className="flex gap-1">
              {Array.from({ length: 7 }).map((_, dow) => {
                const day     = weekDays.find((d: any) => d.dayOfWeek === dow);
                const isToday = dow === todayDow;
                const isRest  = !day || day.isRest;
                return (
                  <div key={dow} className="flex-1 flex flex-col items-center gap-1">
                    <span className={`text-[10px] font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                      {DOW_SHORT[dow]}
                    </span>
                    <div className={`w-full max-w-[36px] aspect-square rounded-full flex items-center justify-center text-[9px] font-semibold transition-all ${
                      isToday  ? "bg-primary text-primary-foreground"
                      : isRest ? "bg-foreground/5 text-muted-foreground"
                               : "bg-foreground/10 text-foreground"
                    }`}>
                      {isRest ? "–" : day?.name?.slice(0, 2)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Program done banner */}
            {activeInfo?.programDone && (
              <div className="bg-emerald-500/10 rounded-xl px-3 py-2 text-center">
                <p className="text-xs font-semibold text-emerald-600">Program complete — great work!</p>
              </div>
            )}
          </div>

          {todayDay.isRest && (
            <div className="glass widget-shadow rounded-2xl px-6 py-10 text-center space-y-2">
              <p className="text-3xl">😴</p>
              <p className="font-semibold">Rest Day</p>
              <p className="text-sm text-muted-foreground">Recover, hydrate, sleep well.</p>
            </div>
          )}

          {!todayDay.isRest && todayDay.exercises.map((ex) => (
            <ExerciseCard
              key={ex.name}
              exercise={ex}
              logs={setLogs[ex.name] ?? []}
              isExpanded={expandedEx === ex.name}
              onToggle={() => setExpandedEx((prev) => prev === ex.name ? null : ex.name)}
              onLogSet={(setNum, weight, reps) => handleLogSet(ex.name, setNum, weight, reps)}
              onUnlogSet={(setNum) => handleUnlogSet(ex.name, setNum)}
              suggestedWeight={getSuggested(ex.name, progress, prs, bodyweight, gender)}
              isManual={isManual}
            />
          ))}

          {!todayDay.isRest && doneSets > 0 && !completed && (
            <button type="button" onClick={handleCompleteWorkout}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm press">
              {allDone ? "Complete Workout ✓" : `Finish Workout (${doneSets}/${totalSets} sets)`}
            </button>
          )}

          {completed && (
            <div className="glass widget-shadow rounded-2xl px-6 py-6 text-center space-y-1">
              <p className="text-emerald-500 font-semibold text-base">Workout Complete!</p>
              <p className="text-sm text-muted-foreground">
                {isManual ? "Sets logged." : "Weights updated for next session."}
              </p>
            </div>
          )}
        </>
      )}

      {/* No workout scheduled today but program exists */}
      {!loading && program && !todayDay && (
        <div className="glass widget-shadow rounded-2xl px-6 py-10 text-center space-y-2">
          <p className="text-3xl">📅</p>
          <p className="font-semibold">No workout today</p>
          <p className="text-sm text-muted-foreground">
            {isV2(program) && activeInfo?.phase
              ? `${activeInfo.phase.name} — rest day`
              : "Rest up and come back tomorrow."}
          </p>
        </div>
      )}
    </div>
  );
}
