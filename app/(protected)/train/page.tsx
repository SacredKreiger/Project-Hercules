"use client";

import { useEffect, useState, useTransition, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/Skeleton";
import Link from "next/link";
import { getExerciseInfo } from "@/lib/exercises";
import { updateProgressAfterWorkout } from "@/lib/actions/training";
import { getSuggested, increment, prWeight } from "@/lib/training-utils";
import { resetProgram } from "@/lib/actions/programs";
import { getActiveDayInfo, isV2 } from "@/lib/program";
import type { AnyProgram, ProgramV1, ProgramV2, Phase } from "@/lib/program";
import type { ExerciseConfig } from "@/lib/templates";

type SetLog = { setNumber: number; actualWeight: number | null; actualReps: number | null; completed: boolean };
type WorkoutSession = { date: string; exercises: Record<string, { sets: number; weight: number; reps: string }> };

const DOW_SHORT = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function todayKey() {
  return `hc-setlogs-${new Date().toISOString().split("T")[0]}`;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function parseDefaultReps(reps: string): string {
  if (!reps || reps === "AMRAP") return "";
  const m = reps.match(/^(\d+)/);
  return m ? m[1] : "";
}

type Draft = { weight: string; reps: string };

// ── RenderItem type ───────────────────────────────────────────────────────────

type RenderItem =
  | { type: "single"; exercise: ExerciseConfig; originalIndex: number }
  | { type: "group"; exercises: ExerciseConfig[]; groupId: string; originalIndices: number[] };

function buildRenderItems(exercises: ExerciseConfig[]): RenderItem[] {
  const items: RenderItem[] = [];
  const seen = new Set<string>();
  exercises.forEach((ex, i) => {
    if (ex.groupId) {
      if (seen.has(ex.groupId)) return;
      seen.add(ex.groupId);
      const groupExercises = exercises
        .map((e, idx) => ({ e, idx }))
        .filter(({ e }) => e.groupId === ex.groupId);
      items.push({
        type: "group",
        exercises: groupExercises.map(x => x.e),
        groupId: ex.groupId,
        originalIndices: groupExercises.map(x => x.idx),
      });
    } else {
      items.push({ type: "single", exercise: ex, originalIndex: i });
    }
  });
  return items;
}

/** Replace exercises for a given dayOfWeek inside any program shape. */
function updateDayExercises(program: AnyProgram, dow: number, exercises: ExerciseConfig[]): AnyProgram {
  if (!isV2(program)) {
    const p1 = program as ProgramV1;
    return {
      ...p1,
      days: p1.days.map(d => d.dayOfWeek === dow ? { ...d, exercises } : d),
    };
  }
  const p2 = program as ProgramV2;
  // We need to find the active phase — use today's week to determine it
  const start = new Date(p2.startDate);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - start.getTime()) / 86_400_000);
  const weekNum = Math.max(0, Math.floor(diffDays / 7));
  let accumulated = 0;
  let activePhaseIdx = p2.phases.length - 1;
  for (let i = 0; i < p2.phases.length; i++) {
    if (weekNum < accumulated + p2.phases[i].weeks) {
      activePhaseIdx = i;
      break;
    }
    accumulated += p2.phases[i].weeks;
  }
  const updatedPhases: Phase[] = p2.phases.map((phase, idx) => {
    if (idx !== activePhaseIdx) return phase;
    return {
      ...phase,
      days: phase.days.map(d => d.dayOfWeek === dow ? { ...d, exercises } : d),
    };
  });
  return { ...p2, phases: updatedPhases };
}

// ── SupersetBlock ─────────────────────────────────────────────────────────────

function SupersetBlock({
  exercises,
  setLogs,
  onLogSet,
  onUnlogSet,
  suggestedWeights,
  personalRecords,
  prModeEnabled,
  prevSession,
  onUngroup,
}: {
  exercises: ExerciseConfig[];
  setLogs: Record<string, SetLog[]>;
  onLogSet: (name: string, setNum: number, weight: number | null, reps: number | null) => void;
  onUnlogSet: (name: string, setNum: number) => void;
  suggestedWeights: Record<string, number>;
  personalRecords: Record<string, number>;
  prModeEnabled: boolean;
  prevSession: Record<string, { sets: number; weight: number; reps: string }>;
  onUngroup: (exerciseName: string) => void;
}) {
  const isCircuit = exercises.length >= 3;
  const label = isCircuit ? "Circuit" : "Superset";
  const maxSets = Math.max(...exercises.map(e => e.sets));

  // Per-exercise draft state keyed by exercise name
  const [draftsMap, setDraftsMap] = useState<Record<string, Draft[]>>(() => {
    const m: Record<string, Draft[]> = {};
    for (const ex of exercises) {
      const info = getExerciseInfo(ex.name);
      const isWeighted = info?.unit === "weight_reps";
      // Mirror ExerciseCard: PR mode overrides suggested weight
      const prLbs = personalRecords[ex.name];
      const usePr = prModeEnabled && ex.prPercent && prLbs && prLbs > 0;
      const effectiveWeight = usePr
        ? prWeight(prLbs!, ex.prPercent!)
        : (suggestedWeights[ex.name] ?? 0);
      const defaultWeight = effectiveWeight > 0 ? effectiveWeight.toString() : "";
      const defaultReps = parseDefaultReps(ex.reps);
      m[ex.name] = Array.from({ length: ex.sets }, () => ({
        weight: isWeighted ? defaultWeight : "",
        reps: defaultReps,
      }));
    }
    return m;
  });

  function setDraft(exName: string, setIdx: number, field: keyof Draft, val: string) {
    setDraftsMap(prev => ({
      ...prev,
      [exName]: (prev[exName] ?? []).map((d, i) => i === setIdx ? { ...d, [field]: val } : d),
    }));
  }

  // Rest timer (shared for the block — fires after each round completes)
  const lastRestSeconds = exercises[exercises.length - 1]?.restSeconds ?? 0;
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);
  const [restDone, setRestDone] = useState(false);
  const timerEndRef = useRef<number>(0);

  useEffect(() => {
    const id = setInterval(() => {
      if (timerEndRef.current === 0) return;
      const remaining = Math.max(0, Math.ceil((timerEndRef.current - Date.now()) / 1000));
      setRestSecondsLeft(remaining);
      if (remaining <= 0) { timerEndRef.current = 0; setRestDone(true); }
    }, 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function onVisible() {
      if (document.hidden || timerEndRef.current === 0) return;
      const remaining = Math.max(0, Math.ceil((timerEndRef.current - Date.now()) / 1000));
      setRestSecondsLeft(remaining);
      if (remaining === 0) setRestDone(true);
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    if (!restDone) return;
    const id = setTimeout(() => setRestDone(false), 2000);
    return () => clearTimeout(id);
  }, [restDone]);

  function startRestTimer() {
    if (lastRestSeconds > 0) {
      setRestDone(false);
      setRestSecondsLeft(lastRestSeconds);
      timerEndRef.current = Date.now() + lastRestSeconds * 1000;
    }
  }

  function handleCheck(ex: ExerciseConfig, setIdx: number, justLoggedName: string) {
    const info = getExerciseInfo(ex.name);
    const isWeighted = info?.unit === "weight_reps";
    const isCardio = info?.unit === "distance_time";
    const d = (draftsMap[ex.name] ?? [])[setIdx] ?? { weight: "", reps: "" };
    const weight = isWeighted ? (parseFloat(d.weight) || null) : null;
    const reps = isCardio ? null : (parseInt(d.reps, 10) || null);
    const setNum = setIdx + 1;
    onLogSet(ex.name, setNum, weight, reps);

    // Check if round is complete (optimistic: treat just-logged ex as done)
    const eligibleForThisSet = exercises.filter(e => e.sets >= setNum);
    const allDone = eligibleForThisSet.every(e => {
      if (e.name === justLoggedName) return true;
      return (setLogs[e.name] ?? []).some(l => l.setNumber === setNum && l.completed);
    });
    if (allDone) startRestTimer();
  }

  function handleUncheck(ex: ExerciseConfig, setIdx: number) {
    const setNum = setIdx + 1;
    const log = (setLogs[ex.name] ?? []).find(l => l.setNumber === setNum);
    if (log) {
      if (log.actualWeight != null) setDraft(ex.name, setIdx, "weight", log.actualWeight.toString());
      if (log.actualReps != null) setDraft(ex.name, setIdx, "reps", log.actualReps.toString());
    }
    onUnlogSet(ex.name, setNum);
  }

  // Long-press state for ungroup
  const ungroupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleLabelPressStart(exName: string) {
    ungroupTimerRef.current = setTimeout(() => {
      onUngroup(exName);
    }, 700);
  }

  function handleLabelPressEnd() {
    if (ungroupTimerRef.current) clearTimeout(ungroupTimerRef.current);
  }

  return (
    <div className="glass widget-shadow rounded-2xl overflow-hidden border-l-4 border-purple-500">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50">
        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-purple-500/15 text-purple-400 rounded-full">
          {label}
        </span>
        <span className="text-[10px] text-muted-foreground">{exercises.length} exercises · {maxSets} rounds</span>
        <span className="ml-auto text-[9px] text-muted-foreground/50">hold label to ungroup</span>
      </div>

      {/* Rest timer */}
      {lastRestSeconds > 0 && (restSecondsLeft > 0 || restDone) && (
        <div className="px-4 py-3 flex flex-col gap-1.5 border-b border-border/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {restDone ? "Ready" : `Rest ${Math.floor(restSecondsLeft / 60)}:${String(restSecondsLeft % 60).padStart(2, "0")}`}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {restDone ? "" : `/ ${Math.floor(lastRestSeconds / 60)}:${String(lastRestSeconds % 60).padStart(2, "0")}`}
            </span>
          </div>
          <div className="h-1 bg-foreground/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-linear ${restDone ? "bg-emerald-500" : "bg-purple-500"}`}
              style={{ width: restDone ? "100%" : `${((lastRestSeconds - restSecondsLeft) / lastRestSeconds) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Exercises */}
      {exercises.map((ex, exIdx) => {
        const info = getExerciseInfo(ex.name);
        const isWeighted = info?.unit === "weight_reps";
        const exLogs = setLogs[ex.name] ?? [];
        const doneSetsCount = exLogs.filter(s => s.completed).length;
        const prevData = prevSession[ex.name];

        return (
          <div key={ex.name} className="px-4 py-3 border-b border-border/30 last:border-0">
            {/* Exercise header row */}
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onPointerDown={() => handleLabelPressStart(ex.name)}
                onPointerUp={handleLabelPressEnd}
                onPointerLeave={handleLabelPressEnd}
                className="text-sm font-semibold flex-1 text-left press"
              >
                {ex.name}
              </button>
              {/* Set dots */}
              <div className="flex items-center gap-1 shrink-0">
                {Array.from({ length: ex.sets }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${
                      exLogs.find(l => l.setNumber === i + 1)?.completed
                        ? "bg-purple-500"
                        : "border border-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                {doneSetsCount}/{ex.sets}
              </span>
            </div>

            {prevData && (
              <p className="text-[10px] text-muted-foreground mb-2">
                Last: {prevData.sets}×{prevData.reps} @ {prevData.weight} lbs
              </p>
            )}

            {/* Set rows */}
            {Array.from({ length: ex.sets }).map((_, setIdx) => {
              const done = exLogs.find(l => l.setNumber === setIdx + 1)?.completed ?? false;
              const d = (draftsMap[ex.name] ?? [])[setIdx] ?? { weight: "", reps: "" };
              return (
                <div
                  key={setIdx}
                  className={`flex items-center gap-2 py-2 transition-opacity ${done ? "opacity-60" : ""} ${setIdx > 0 ? "border-t border-border/20" : ""}`}
                >
                  <span className="text-xs text-muted-foreground shrink-0 w-8">Set {setIdx + 1}</span>
                  {isWeighted && (
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="lbs"
                      value={d.weight}
                      onChange={e => setDraft(ex.name, setIdx, "weight", e.target.value)}
                      readOnly={done}
                      className="w-20 shrink-0 bg-foreground/5 rounded-lg px-2 py-1.5 text-sm text-center tabular-nums outline-none focus:ring-1 focus:ring-purple-500/50 read-only:opacity-60"
                    />
                  )}
                  {isWeighted && <span className="text-xs text-muted-foreground shrink-0">×</span>}
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder={ex.reps === "AMRAP" ? "reps" : ex.reps}
                    value={d.reps}
                    onChange={e => setDraft(ex.name, setIdx, "reps", e.target.value)}
                    readOnly={done}
                    className="w-20 shrink-0 bg-foreground/5 rounded-lg px-2 py-1.5 text-sm text-center tabular-nums outline-none focus:ring-1 focus:ring-purple-500/50 read-only:opacity-60"
                  />
                  <div className="flex-1" />
                  <button
                    type="button"
                    onPointerUp={() => done ? handleUncheck(ex, setIdx) : handleCheck(ex, setIdx, ex.name)}
                    className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 press transition-all ${
                      done ? "border-purple-500 bg-purple-500" : "border-border"
                    }`}
                  >
                    {done && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ── ExerciseCard ──────────────────────────────────────────────────────────────

function ExerciseCard({
  exercise, logs, isExpanded, onToggle, onLogSet, onUnlogSet,
  suggestedWeight, isManual, prevData, prLbs, prModeEnabled,
}: {
  exercise:        ExerciseConfig;
  logs:            SetLog[];
  isExpanded:      boolean;
  onToggle:        () => void;
  onLogSet:        (setNum: number, weight: number | null, reps: number | null) => void;
  onUnlogSet:      (setNum: number) => void;
  suggestedWeight: number;
  isManual:        boolean;
  prevData?:       { sets: number; weight: number; reps: string };
  prLbs?:          number;
  prModeEnabled?:  boolean;
}) {
  const info       = getExerciseInfo(exercise.name);
  const isWeighted = info?.unit === "weight_reps";
  const isCardio   = info?.unit === "distance_time";
  const doneSets   = logs.filter((s) => s.completed).length;

  // PR % mode overrides suggested weight
  const usePrMode = prModeEnabled && exercise.prPercent && prLbs && prLbs > 0;
  const effectiveWeight = usePrMode ? prWeight(prLbs!, exercise.prPercent!) : suggestedWeight;

  // Manual mode: show last logged weight but leave blank if none
  const defaultWeight = isManual && effectiveWeight === 0 ? "" : effectiveWeight.toString();
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

  // ── Rest timer ───────────────────────────────────────────────────────────────
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);
  const [restDone,        setRestDone]        = useState(false);
  const restTotal = exercise.restSeconds ?? 0;
  const timerEndRef = useRef<number>(0);

  // Always-running interval — startTimer() sets timerEndRef, interval picks it up next tick
  useEffect(() => {
    const id = setInterval(() => {
      if (timerEndRef.current === 0) return;
      const remaining = Math.max(0, Math.ceil((timerEndRef.current - Date.now()) / 1000));
      setRestSecondsLeft(remaining);
      if (remaining <= 0) { timerEndRef.current = 0; setRestDone(true); }
    }, 500);
    return () => clearInterval(id);
  }, []);

  // Re-sync when tab becomes visible again
  useEffect(() => {
    function onVisible() {
      if (document.hidden || timerEndRef.current === 0) return;
      const remaining = Math.max(0, Math.ceil((timerEndRef.current - Date.now()) / 1000));
      setRestSecondsLeft(remaining);
      if (remaining === 0) setRestDone(true);
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  // Hide "Ready" indicator after 2 s
  useEffect(() => {
    if (!restDone) return;
    const id = setTimeout(() => setRestDone(false), 2000);
    return () => clearTimeout(id);
  }, [restDone]);

  function setDraft(i: number, field: keyof Draft, val: string) {
    setDrafts((prev) => prev.map((d, idx) => idx === i ? { ...d, [field]: val } : d));
  }

  function handleCheck(i: number) {
    const d      = drafts[i];
    const weight = isWeighted ? (parseFloat(d.weight) || null) : null;
    const reps   = isCardio   ? null : (parseInt(d.reps, 10) || null);
    onLogSet(i + 1, weight, reps);
    if (restTotal > 0) {
      setRestDone(false);
      timerEndRef.current = Date.now() + restTotal * 1000;
      setRestSecondsLeft(restTotal);
    }
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
            {isWeighted && usePrMode && ` · ${exercise.prPercent}% PR → ${effectiveWeight} lbs`}
            {isWeighted && !usePrMode && !isManual && effectiveWeight > 0 && ` · ${effectiveWeight} lbs`}
            {isWeighted && isManual && !usePrMode && " · Manual"}
            {exercise.restSeconds > 0 && ` · ${exercise.restSeconds}s`}
          </p>
          {prevData && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Last: {prevData.sets}×{prevData.reps} @ {prevData.weight} lbs
            </p>
          )}
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
          {/* Rest timer — shown when counting down or briefly at 0 ("Ready") */}
          {restTotal > 0 && (restSecondsLeft > 0 || restDone) && (
            <div className="px-4 py-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {restDone ? "Ready" : `Rest ${Math.floor(restSecondsLeft / 60)}:${String(restSecondsLeft % 60).padStart(2, "0")}`}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {restDone ? "" : `/ ${Math.floor(restTotal / 60)}:${String(restTotal % 60).padStart(2, "0")}`}
                </span>
              </div>
              <div className="h-1 bg-foreground/10 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-1000 ease-linear ${restDone ? "bg-emerald-500" : "bg-primary"}`}
                  style={{ width: restDone ? "100%" : `${((restTotal - restSecondsLeft) / restTotal) * 100}%` }}
                />
              </div>
            </div>
          )}

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
  const [personalRecords, setPersonalRecords] = useState<Record<string, number>>({});
  const [prModeEnabled, setPrModeEnabled] = useState(false);
  const [progress,   setProgress]   = useState<Record<string, { weight: number }>>({});
  const [bodyweight, setBodyweight] = useState<number>(0);
  const [gender,     setGender]     = useState<string>("male");
  const [loading,    setLoading]    = useState(true);
  const [showReset,  setShowReset]  = useState(false);
  const [showOverflow, setShowOverflow] = useState(false);
  const [setLogs,        setSetLogs]        = useState<Record<string, SetLog[]>>({});
  const [expandedEx,     setExpandedEx]     = useState<string | null>(null);
  const [completed,      setCompleted]      = useState(false);
  const [workoutSummary, setWorkoutSummary] = useState<{ name: string; from: number; to: number }[]>([]);
  const [prevSession,    setPrevSession]    = useState<Record<string, { sets: number; weight: number; reps: string }>>({});
  const [, startTransition] = useTransition();
  const overflowRef = useRef<HTMLDivElement>(null);

  // Hold-to-select + tap-to-group state
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchMovedRef = useRef(false);
  const exerciseListRef = useRef<HTMLDivElement>(null);

  const todayDow = new Date().getDay();
  const [selectedDow, setSelectedDow] = useState<number>(todayDow);

  // Close overflow menu on outside tap
  useEffect(() => {
    if (!showOverflow) return;
    function handleClick(e: MouseEvent) {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setShowOverflow(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showOverflow]);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("training_program, training_prs, training_progress, current_weight_lbs, gender, pr_mode_enabled")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) { setLoading(false); return; }

    if (profile?.training_program)  setProgram(profile.training_program as AnyProgram);
    if (profile?.training_prs)       setPrs(profile.training_prs as Record<string, number>);
    if (profile?.training_progress)  setProgress(profile.training_progress as Record<string, { weight: number }>);
    if (profile?.current_weight_lbs) setBodyweight(profile.current_weight_lbs as number);
    if (profile?.gender)             setGender(profile.gender as string);
    if (profile?.pr_mode_enabled)    setPrModeEnabled(true);

    // Load personal records for PR mode
    const { data: prRows } = await supabase.from("personal_records")
      .select("exercise_name, weight_lbs").eq("user_id", user.id);
    if (prRows?.length) {
      const map: Record<string, number> = {};
      prRows.forEach((r: { exercise_name: string; weight_lbs: number | string }) => {
        map[r.exercise_name] = Number(r.weight_lbs);
      });
      setPersonalRecords(map);
    }

    try {
      const saved = localStorage.getItem(todayKey());
      if (saved) setSetLogs(JSON.parse(saved));
    } catch { /* ignore */ }

    try {
      const log = JSON.parse(localStorage.getItem("hc-workout-log") ?? "[]");
      const today = new Date().toISOString().split("T")[0];
      const prev = log.find((s: { date: string }) => s.date !== today);
      if (prev) setPrevSession(prev.exercises);
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
    ? (isV2(program) && activeInfo?.phase ? activeInfo.phase.days : (program as { days?: unknown[] }).days ?? [])
    : [];

  // Selected day's workout (may differ from today when tapping week strip)
  const selectedDay = (weekDays as { dayOfWeek: number; [k: string]: unknown }[]).find(d => d.dayOfWeek === selectedDow) ?? null;
  const isViewingToday = selectedDow === todayDow;

  // Sets progress always refers to today's actual workout
  const totalSets = todayDay?.exercises.reduce((acc, ex) => acc + ex.sets, 0) ?? 0;
  const doneSets  = Object.values(setLogs).reduce((acc, sets) => acc + sets.filter((s) => s.completed).length, 0);
  const allDone   = totalSets > 0 && doneSets >= totalSets;

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

  // ── Superset / grouping helpers ───────────────────────────────────────────

  /** Get the exercises array for the currently viewed day */
  function getCurrentDayExercises(): ExerciseConfig[] {
    if (!selectedDay) return [];
    return (selectedDay as { exercises?: ExerciseConfig[] }).exercises ?? [];
  }

  async function saveGroupChanges(updatedExercises: ExerciseConfig[]) {
    if (!program) return;
    const updatedProgram = updateDayExercises(program, selectedDow, updatedExercises);
    setProgram(updatedProgram);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").update({ training_program: updatedProgram }).eq("id", user.id);
  }

  function groupOrUngroup(fromIdx: number, toIdx: number) {
    const dayExercises = getCurrentDayExercises();
    const fromEx = dayExercises[fromIdx];
    const toEx = dayExercises[toIdx];
    if (!fromEx || !toEx) return;

    const existingGroupId = toEx.groupId || fromEx.groupId;
    const newGroupId = existingGroupId || crypto.randomUUID().slice(0, 8);

    const updated = dayExercises.map((ex, i) => {
      if (i === fromIdx || i === toIdx) return { ...ex, groupId: newGroupId };
      return ex;
    });

    saveGroupChanges(updated);
  }

  function ungroupExercise(exerciseName: string, dayExercises: ExerciseConfig[]) {
    // Find the groupId of this exercise
    const targetEx = dayExercises.find(e => e.name === exerciseName);
    if (!targetEx?.groupId) return;
    const groupId = targetEx.groupId;

    // Remove the exercise from the group
    const withoutEx = dayExercises.map(e =>
      e.name === exerciseName ? { ...e, groupId: undefined } : e
    );

    // Check if only 1 exercise remains in the group — if so, dissolve the group
    const remaining = withoutEx.filter(e => e.groupId === groupId);
    const updated = remaining.length <= 1
      ? withoutEx.map(e => e.groupId === groupId ? { ...e, groupId: undefined } : e)
      : withoutEx;

    saveGroupChanges(updated);
  }

  // ── Hold-to-select + tap-to-group handlers ───────────────────────────────

  function handleExTouchStart(e: React.TouchEvent, originalIndex: number) {
    touchMovedRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      if (touchMovedRef.current) return;
      navigator.vibrate?.(40);
      if (selectedIdx === null) {
        // Nothing selected yet — select this exercise
        setSelectedIdx(originalIndex);
      } else if (selectedIdx === originalIndex) {
        // Tapped same one — deselect
        setSelectedIdx(null);
      } else {
        // Second exercise held — group them
        groupOrUngroup(selectedIdx, originalIndex);
        setSelectedIdx(null);
      }
    }, 500);
  }

  function handleExTouchMove() {
    touchMovedRef.current = true;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function handleExTouchEnd() {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
  }

  function handleExTap(originalIndex: number) {
    if (selectedIdx === null) return; // no selection active, normal tap
    if (selectedIdx === originalIndex) {
      setSelectedIdx(null); // tap selected → deselect
    } else {
      groupOrUngroup(selectedIdx, originalIndex);
      setSelectedIdx(null);
    }
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

    // Build workout summary — which exercises are going up next session
    const summary: { name: string; from: number; to: number }[] = [];
    for (const ex of todayDay.exercises) {
      const info = getExerciseInfo(ex.name);
      if (info?.unit !== "weight_reps") continue;
      const logs = setLogs[ex.name] ?? [];
      const allCompleted = logs.length === ex.sets && logs.every((s) => s.completed);
      const allHitTarget = logs.every((s) => (s.actualReps ?? 0) >= parseInt(ex.reps));
      if (!allCompleted || !allHitTarget) continue;
      const curWeight = progress[ex.name]?.weight ?? 0;
      if (curWeight > 0) {
        summary.push({ name: ex.name, from: curWeight, to: curWeight + increment(ex.name) });
      }
    }
    setWorkoutSummary(summary);

    // Save session to localStorage workout log
    const session: WorkoutSession = {
      date: new Date().toISOString().split("T")[0],
      exercises: {},
    };
    for (const ex of todayDay.exercises) {
      const logs = setLogs[ex.name] ?? [];
      const completedSets = logs.filter((s) => s.completed);
      if (completedSets.length > 0) {
        const last = completedSets[completedSets.length - 1];
        session.exercises[ex.name] = {
          sets: completedSets.length,
          weight: last.actualWeight ?? 0,
          reps: String(last.actualReps ?? 0),
        };
      }
    }
    try {
      const existing = JSON.parse(localStorage.getItem("hc-workout-log") ?? "[]");
      const updated = [session, ...existing].slice(0, 10);
      localStorage.setItem("hc-workout-log", JSON.stringify(updated));
    } catch { /* ignore */ }

    startTransition(async () => {
      const result = await updateProgressAfterWorkout(completedData);
      if (result?.error) console.error("Progress update failed:", result.error);
    });
  }

  return (
    <div className="space-y-4">
      {/* Reset confirmation */}
      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-6">
          <div className="glass widget-shadow rounded-2xl p-5 w-full max-w-sm space-y-4">
            <p className="font-semibold">Reset Program?</p>
            <p className="text-sm text-muted-foreground">
              This will restart the program from Week 1 and clear all weight progression. Your program structure stays the same.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowReset(false)}
                className="flex-1 h-11 rounded-xl glass font-medium text-sm press">Cancel</button>
              <button type="button"
                onClick={() => {
                  startTransition(async () => {
                    await resetProgram();
                    setShowReset(false);
                    await load();
                  });
                }}
                className="flex-1 h-11 rounded-xl bg-rose-500 text-white font-semibold text-sm press">
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          {program ? (
            <>
              <p className="text-xs text-muted-foreground font-medium">{program.name}</p>
              {activeInfo?.weekInPhase != null && (
                <p className="text-[11px] text-muted-foreground/70">
                  Week {activeInfo.weekInPhase}{activeInfo.totalWeeks != null ? `/${activeInfo.totalWeeks}` : ""}
                  {activeInfo?.phase && ` · ${activeInfo.phase.name}`}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm font-semibold">Training</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative" ref={overflowRef}>
            <button
              type="button"
              onClick={() => setShowOverflow((v) => !v)}
              className="w-8 h-8 flex items-center justify-center glass rounded-full press text-muted-foreground"
              aria-label="More options"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
              </svg>
            </button>
            {showOverflow && (
              <div className="absolute right-0 top-10 z-40 glass widget-shadow rounded-xl overflow-hidden min-w-[160px]">
                <Link
                  href="/train/programs"
                  onClick={() => setShowOverflow(false)}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-foreground press active:bg-foreground/5"
                >
                  <span>📋</span> My Programs
                </Link>
                {program && (
                  <button
                    type="button"
                    onClick={() => { setShowOverflow(false); setShowReset(true); }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-rose-500 press active:bg-foreground/5 text-left border-t border-border/40"
                  >
                    <span>↺</span> Reset program
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
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

      {!loading && program && (
        <>
          {/* ── Day card + week strip ── */}
          <div className="glass widget-shadow rounded-2xl p-4 space-y-4">

            {/* Hero: selected day name + sets progress */}
            <div className="flex items-start justify-between">
              <div>
                {selectedDay && !(selectedDay as { isRest?: boolean }).isRest ? (
                  <>
                    <p className="text-xl font-bold leading-tight">{(selectedDay as { name?: string }).name}</p>
                    {activeInfo?.phase?.isDeload && isViewingToday && (
                      <span className="mt-1 inline-block text-[10px] font-bold uppercase text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                        Deload
                      </span>
                    )}
                  </>
                ) : (
                  <p className="text-xl font-bold leading-tight text-muted-foreground">
                    {selectedDay ? "Rest Day" : "No workout"}
                  </p>
                )}
                {!isViewingToday && (
                  <button
                    type="button"
                    onClick={() => setSelectedDow(todayDow)}
                    className="mt-1.5 text-[11px] text-primary font-semibold press"
                  >
                    ← Back to today
                  </button>
                )}
              </div>
              {isViewingToday && todayDay && !todayDay.isRest && totalSets > 0 && (
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold tabular-nums leading-none">
                    {doneSets}<span className="text-base text-muted-foreground font-normal">/{totalSets}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">sets done</p>
                </div>
              )}
            </div>

            {/* Progress bar — only when viewing today's live workout */}
            {isViewingToday && todayDay && !todayDay.isRest && totalSets > 0 && (
              <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (doneSets / totalSets) * 100)}%` }}
                />
              </div>
            )}

            {/* Week strip */}
            <div className="flex gap-1">
              {Array.from({ length: 7 }).map((_, dow) => {
                const day        = (weekDays as { dayOfWeek: number; isRest?: boolean; name?: string }[]).find(d => d.dayOfWeek === dow);
                const isToday    = dow === todayDow;
                const isSelected = dow === selectedDow;
                const isRest     = !day || day.isRest;
                const isTappable = !isRest;

                return (
                  <div key={dow} className="flex-1 flex flex-col items-center gap-1">
                    <span className={`text-[10px] font-medium ${isSelected ? "text-primary" : "text-muted-foreground"}`}>
                      {DOW_SHORT[dow]}
                    </span>
                    <div className="relative w-full flex justify-center">
                      <div
                        role={isTappable ? "button" : undefined}
                        tabIndex={isTappable ? 0 : undefined}
                        onClick={isTappable ? () => setSelectedDow(dow) : undefined}
                        onKeyDown={isTappable ? (e) => e.key === "Enter" && setSelectedDow(dow) : undefined}
                        className={`w-full max-w-[36px] aspect-square rounded-full flex items-center justify-center text-[9px] font-semibold transition-all ${
                          isSelected && !isRest ? "bg-primary text-primary-foreground"
                          : isRest             ? "bg-foreground/5 text-muted-foreground"
                          : isToday            ? "bg-foreground/15 text-foreground ring-1 ring-primary/50"
                                               : "bg-foreground/10 text-foreground press cursor-pointer"
                        }`}
                      >
                        {isRest ? "–" : day?.name?.slice(0, 2)}
                      </div>
                      {/* "Today" pip on today's dot when viewing a different day */}
                      {isToday && !isSelected && !isRest && (
                        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Program done banner */}
            {activeInfo?.programDone && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 space-y-2">
                <p className="text-sm font-bold text-emerald-600">Program complete!</p>
                <p className="text-xs text-emerald-600/80">You finished every phase. Time to level up.</p>
                <Link href="/train/setup"
                  className="inline-block text-xs font-semibold text-emerald-600 bg-emerald-500/15 px-3 py-1.5 rounded-full press">
                  Start a new program →
                </Link>
              </div>
            )}
          </div>

          {/* ── Exercise list for selected day ── */}
          {(selectedDay as { isRest?: boolean } | null)?.isRest ? (
            <div className="glass widget-shadow rounded-2xl px-6 py-10 text-center space-y-2">
              <p className="text-3xl">😴</p>
              <p className="font-semibold">Rest Day</p>
              <p className="text-sm text-muted-foreground">Recover, hydrate, sleep well.</p>
            </div>
          ) : selectedDay ? (
            <>
              {/* Selection hint */}
              {selectedIdx !== null && (
                <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                  <p className="text-xs text-purple-400 font-medium">Hold another exercise to group as superset</p>
                  <button type="button" onClick={() => setSelectedIdx(null)} className="text-xs text-purple-400 font-bold press px-2">✕</button>
                </div>
              )}

              <div ref={exerciseListRef} className="space-y-4">
              {buildRenderItems((selectedDay as { exercises?: ExerciseConfig[] }).exercises ?? []).map((item) => {
                if (item.type === "group") {
                  return (
                    <div
                      key={item.groupId}
                      onTouchStart={(e) => handleExTouchStart(e, item.originalIndices[0])}
                      onTouchMove={handleExTouchMove}
                      onTouchEnd={handleExTouchEnd}
                      className="transition-all duration-150 rounded-2xl"
                    >
                      <SupersetBlock
                        exercises={item.exercises}
                        setLogs={setLogs}
                        onLogSet={(name, setNum, w, r) => isViewingToday && handleLogSet(name, setNum, w, r)}
                        onUnlogSet={(name, setNum) => isViewingToday && handleUnlogSet(name, setNum)}
                        suggestedWeights={Object.fromEntries(
                          item.exercises.map(ex => [ex.name, getSuggested(ex.name, progress, prs, bodyweight, gender)])
                        )}
                        personalRecords={personalRecords}
                        prModeEnabled={prModeEnabled}
                        prevSession={prevSession}
                        onUngroup={(name) => ungroupExercise(name, (selectedDay as { exercises?: ExerciseConfig[] }).exercises ?? [])}
                      />
                    </div>
                  );
                }

                // Single exercise
                const isSelected = selectedIdx === item.originalIndex;
                const isTarget = selectedIdx !== null && selectedIdx !== item.originalIndex;
                return (
                  <div
                    key={item.exercise.name}
                    onTouchStart={(e) => handleExTouchStart(e, item.originalIndex)}
                    onTouchMove={handleExTouchMove}
                    onTouchEnd={handleExTouchEnd}
                    onClick={() => handleExTap(item.originalIndex)}
                    className={`transition-all duration-200 rounded-2xl ${isSelected ? "ring-2 ring-purple-500 scale-[0.98]" : ""} ${isTarget ? "ring-2 ring-purple-400/60 ring-dashed" : ""}`}
                  >
                    <ExerciseCard
                      exercise={item.exercise}
                      logs={isViewingToday ? (setLogs[item.exercise.name] ?? []) : []}
                      isExpanded={isViewingToday && expandedEx === item.exercise.name}
                      onToggle={() => isViewingToday && setExpandedEx((prev) => prev === item.exercise.name ? null : item.exercise.name)}
                      onLogSet={(setNum, weight, reps) => isViewingToday && handleLogSet(item.exercise.name, setNum, weight, reps)}
                      onUnlogSet={(setNum) => isViewingToday && handleUnlogSet(item.exercise.name, setNum)}
                      suggestedWeight={getSuggested(item.exercise.name, progress, prs, bodyweight, gender)}
                      isManual={isManual}
                      prevData={prevSession[item.exercise.name]}
                      prLbs={personalRecords[item.exercise.name]}
                      prModeEnabled={prModeEnabled}
                    />
                  </div>
                );
              })}
              </div>

              {isViewingToday && doneSets > 0 && !completed && (
                <button type="button" onClick={handleCompleteWorkout}
                  className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm press">
                  {allDone ? "Complete Workout ✓" : `Finish Workout (${doneSets}/${totalSets} sets)`}
                </button>
              )}

              {isViewingToday && completed && (
                <div className="glass widget-shadow rounded-2xl px-5 py-5 space-y-3">
                  <div className="text-center">
                    <p className="text-emerald-500 font-semibold text-base">Workout Complete!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{doneSets} sets · {new Date().toLocaleDateString("en-US", { weekday: "long" })}</p>
                  </div>
                  {workoutSummary.length > 0 && (
                    <div className="border-t border-border pt-3 space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Going up next session</p>
                      {workoutSummary.map(({ name, from, to }) => (
                        <div key={name} className="flex items-center justify-between">
                          <span className="text-xs text-foreground/80 truncate">{name}</span>
                          <span className="text-xs font-semibold tabular-nums text-emerald-500">{from} → {to} lbs</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setCompleted(false)}
                    className="w-full text-center text-xs text-muted-foreground press mt-1"
                  >
                    Edit workout
                  </button>
                </div>
              )}
            </>
          ) : (
            /* No workout scheduled on selected day */
            <div className="glass widget-shadow rounded-2xl px-6 py-10 text-center space-y-2">
              <p className="text-3xl">📅</p>
              <p className="font-semibold">No workout {isViewingToday ? "today" : DOW_SHORT[selectedDow]}</p>
              <p className="text-sm text-muted-foreground">
                {isV2(program) && activeInfo?.phase
                  ? `${activeInfo.phase.name} — rest day`
                  : "Rest up and come back tomorrow."}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
