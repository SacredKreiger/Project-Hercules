"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/Skeleton";
import Link from "next/link";
import { getExerciseInfo } from "@/lib/exercises";
import { updateProgressAfterWorkout } from "@/lib/actions/training";
import { getSuggested } from "@/lib/training-utils";
import type { ProgramDay, ExerciseConfig } from "@/lib/templates";

type Program  = { name: string; days: ProgramDay[] };
type SetLog   = { setNumber: number; actualWeight: number | null; actualReps: number | null; completed: boolean };

const DOW_SHORT = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function todayKey() {
  return `hc-setlogs-${new Date().toISOString().split("T")[0]}`;
}

// ── ExerciseCard ──────────────────────────────────────────────────────────

function ExerciseCard({
  exercise, logs, isExpanded, onToggle, onLogSet, suggestedWeight,
}: {
  exercise:        ExerciseConfig;
  logs:            SetLog[];
  isExpanded:      boolean;
  onToggle:        () => void;
  onLogSet:        (setNum: number, weight: number | null, reps: number | null) => void;
  suggestedWeight: number | null;
}) {
  const info      = getExerciseInfo(exercise.name);
  const isWeighted = info?.unit === "weight_reps";
  const isCardio   = info?.unit === "distance_time";
  const doneSets   = logs.filter((s) => s.completed).length;

  const [drafts, setDrafts] = useState(() =>
    Array.from({ length: exercise.sets }, () => ({
      weight: suggestedWeight?.toString() ?? "",
      reps:   "",
    })),
  );

  function setDraft(i: number, field: "weight" | "reps", val: string) {
    setDrafts((prev) => prev.map((d, idx) => idx === i ? { ...d, [field]: val } : d));
  }

  function handleCheck(i: number) {
    const d = drafts[i];
    const weight = isWeighted ? (parseFloat(d.weight) || null) : null;
    const reps   = isCardio   ? null : (parseInt(d.reps) || null);
    onLogSet(i + 1, weight, reps);
  }

  return (
    <div className="glass widget-shadow rounded-2xl overflow-hidden">
      {/* Header row */}
      <button type="button" onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left press active:bg-foreground/5 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{exercise.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {exercise.sets} × {exercise.reps}
            {isWeighted && suggestedWeight && ` · ${suggestedWeight} lbs`}
            {exercise.restSeconds > 0 && ` · ${exercise.restSeconds}s`}
          </p>
        </div>
        {/* Set dots */}
        <div className="flex items-center gap-1 shrink-0">
          {Array.from({ length: exercise.sets }).map((_, i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full ${
              logs.find((l) => l.setNumber === i + 1)?.completed ? "bg-primary" : "bg-foreground/15"
            }`} />
          ))}
        </div>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`text-muted-foreground shrink-0 ml-1 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expanded set rows */}
      {isExpanded && (
        <div className="border-t border-border divide-y divide-border">
          {isCardio ? (
            <div className="flex items-center justify-between px-4 py-3.5">
              <span className="text-sm text-muted-foreground">{exercise.reps}</span>
              <button type="button" onClick={() => onLogSet(1, null, null)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold press transition-all ${
                  doneSets > 0 ? "bg-primary/15 text-primary" : "bg-foreground/8 text-muted-foreground"
                }`}
              >
                {doneSets > 0 ? "Done ✓" : "Mark Done"}
              </button>
            </div>
          ) : (
            Array.from({ length: exercise.sets }).map((_, i) => {
              const log  = logs.find((l) => l.setNumber === i + 1);
              const done = log?.completed ?? false;
              return (
                <div key={i} className={`flex items-center gap-2 px-4 py-2.5 transition-opacity ${done ? "opacity-50" : ""}`}>
                  <span className="text-xs text-muted-foreground shrink-0 w-8">Set {i + 1}</span>

                  {isWeighted && (
                    <input type="number" inputMode="decimal" placeholder="lbs"
                      value={done ? (log?.actualWeight?.toString() ?? "") : drafts[i]?.weight}
                      onChange={(e) => setDraft(i, "weight", e.target.value)}
                      disabled={done}
                      className="w-20 shrink-0 bg-foreground/5 rounded-lg px-2 py-1.5 text-sm text-center tabular-nums outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-60"
                    />
                  )}

                  {isWeighted && <span className="text-xs text-muted-foreground shrink-0">×</span>}

                  <input type="number" inputMode="numeric"
                    placeholder={exercise.reps === "AMRAP" ? "reps" : exercise.reps}
                    value={done ? (log?.actualReps?.toString() ?? "") : drafts[i]?.reps}
                    onChange={(e) => setDraft(i, "reps", e.target.value)}
                    disabled={done}
                    className="w-20 shrink-0 bg-foreground/5 rounded-lg px-2 py-1.5 text-sm text-center tabular-nums outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-60"
                  />

                  <div className="flex-1" />

                  <button type="button" onClick={() => !done && handleCheck(i)} disabled={done}
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 press transition-all ${
                      done ? "border-primary bg-primary" : "border-border"
                    }`}
                  >
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

// ── Page ──────────────────────────────────────────────────────────────────

export default function TrainPage() {
  const [program,    setProgram]    = useState<Program | null>(null);
  const [prs,        setPrs]        = useState<Record<string, number>>({});
  const [progress,   setProgress]   = useState<Record<string, { weight: number }>>({});
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("training_program, training_prs, training_progress")
      .eq("id", user.id)
      .single();

    if (profile?.training_program) setProgram(profile.training_program as Program);
    if (profile?.training_prs)      setPrs(profile.training_prs as Record<string, number>);
    if (profile?.training_progress) setProgress(profile.training_progress as Record<string, { weight: number }>);

    try {
      const saved = localStorage.getItem(todayKey());
      if (saved) setSetLogs(JSON.parse(saved));
    } catch { /* ignore */ }

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const todayDay = program?.days.find((d) => d.dayOfWeek === todayDow);

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

  function handleCompleteWorkout() {
    setCompleted(true);
    if (!todayDay) return;

    // Build payload for progressive overload update
    const completedData: Record<string, { targetReps: string; loggedSets: { reps: number | null; completed: boolean }[] }> = {};
    for (const ex of todayDay.exercises) {
      const info = getExerciseInfo(ex.name);
      if (info?.unit !== "weight_reps") continue;
      completedData[ex.name] = {
        targetReps: ex.reps,
        loggedSets: (setLogs[ex.name] ?? []).map((s) => ({ reps: s.actualReps, completed: s.completed })),
      };
    }

    startTransition(async () => {
      await updateProgressAfterWorkout(completedData);
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
          {program && <p className="text-sm text-muted-foreground mt-0.5">{program.name}</p>}
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
            className="mt-1 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold press inline-block"
          >
            Set Up Training →
          </Link>
        </div>
      )}

      {!loading && program && todayDay && (
        <>
          {/* Day summary + week strip merged */}
          <div className="glass widget-shadow rounded-2xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-primary mb-1">Today</p>
                <p className="text-xl font-bold">{todayDay.name}</p>
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
                const day     = program.days.find((d) => d.dayOfWeek === dow);
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
              suggestedWeight={getSuggested(ex.name, progress, prs)}
            />
          ))}

          {!todayDay.isRest && allDone && !completed && (
            <button type="button" onClick={handleCompleteWorkout}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm press"
            >
              Complete Workout ✓
            </button>
          )}

          {completed && (
            <div className="glass widget-shadow rounded-2xl px-6 py-6 text-center space-y-1">
              <p className="text-emerald-500 font-semibold text-base">Workout Complete!</p>
              <p className="text-sm text-muted-foreground">
                Weights updated for next session.
              </p>
            </div>
          )}

        </>
      )}
    </div>
  );
}
