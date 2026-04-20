"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { EXERCISES, EXERCISE_CATEGORIES, getExerciseInfo } from "@/lib/exercises";
import { saveTrainingProgramV2 } from "@/lib/actions/training";
import type { ProgramDay, ExerciseConfig } from "@/lib/templates";
import type { Phase, OverloadMode, ProgramV2 } from "@/lib/program";

const DOW_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9); }

function makeDays(): ProgramDay[] {
  return Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    name: ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][i],
    isRest: true,
    exercises: [],
  }));
}

function makePhase(n: number): Phase {
  return { id: uid(), name: `Phase ${n}`, weeks: 4, isDeload: false, days: makeDays() };
}

// ─── ExercisePicker ───────────────────────────────────────────────────────────

function ExercisePicker({ onAdd, onClose }: {
  onAdd: (ex: ExerciseConfig) => void;
  onClose: () => void;
}) {
  const [query,       setQuery]       = useState("");
  const [category,    setCategory]    = useState("All");
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [sets,        setSets]        = useState("3");
  const [reps,        setReps]        = useState("8");
  const [rest,        setRest]        = useState("90");

  const filtered = EXERCISES.filter((e) => {
    const matchCat  = category === "All" || e.category === category;
    const matchName = e.name.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchName;
  });

  function confirmAdd() {
    if (!configuring) return;
    onAdd({ name: configuring, sets: parseInt(sets) || 3, reps: reps || "8", restSeconds: parseInt(rest) || 90 });
    setConfiguring(null);
    setQuery("");
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/97 backdrop-blur-sm">
      <div className="flex items-center gap-3 px-4 pt-6 pb-3">
        <button type="button" onClick={onClose} className="press text-muted-foreground text-sm">Cancel</button>
        <h2 className="flex-1 text-center font-semibold text-sm">Add Exercise</h2>
        <div className="w-14" />
      </div>

      {configuring ? (
        <div className="flex-1 px-4 space-y-5 pt-4">
          <p className="text-xl font-bold">{configuring}</p>
          <div className="space-y-3">
            {[
              { label: "Sets",      value: sets, setter: setSets,  placeholder: "3",  type: "number" },
              { label: "Reps",      value: reps, setter: setReps,  placeholder: "8",  type: "text"   },
              { label: "Rest (sec)",value: rest, setter: setRest,  placeholder: "90", type: "number" },
            ].map(({ label, value, setter, placeholder, type }) => (
              <div key={label} className="flex items-center justify-between glass rounded-2xl px-4 py-3">
                <span className="text-sm font-medium">{label}</span>
                <input
                  type={type} inputMode={type === "text" ? "text" : "numeric"}
                  value={value} onChange={(e) => setter(e.target.value)}
                  placeholder={placeholder}
                  className="w-24 text-right bg-transparent text-sm font-semibold tabular-nums outline-none"
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Reps can be a number, range (8–12), or AMRAP.</p>
          <div className="flex gap-3">
            <button type="button" onClick={() => setConfiguring(null)}
              className="flex-1 py-3 rounded-2xl bg-foreground/5 text-sm font-semibold press">Back</button>
            <button type="button" onClick={confirmAdd}
              className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold press">
              Add Exercise
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="px-4 pb-2">
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search exercises…" autoFocus
              className="w-full bg-foreground/5 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
            {["All", ...EXERCISE_CATEGORIES].map((cat) => (
              <button key={cat} type="button" onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap press transition-all ${
                  category === cat ? "bg-primary text-primary-foreground" : "bg-foreground/5 text-muted-foreground"
                }`}>
                {cat}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto px-4 space-y-1 pb-8">
            {filtered.map((ex) => (
              <button key={ex.name} type="button" onClick={() => setConfiguring(ex.name)}
                className="w-full text-left flex items-center justify-between px-4 py-3 glass rounded-2xl press">
                <span className="text-sm font-medium">{ex.name}</span>
                <span className="text-xs text-muted-foreground">{ex.category}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-10">No exercises found.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── PhaseEditor ──────────────────────────────────────────────────────────────

function PhaseEditor({ phase, onChange }: {
  phase: Phase;
  onChange: (updated: Phase) => void;
}) {
  const [activeDow, setActiveDow] = useState(1);
  const [showPicker, setShowPicker] = useState(false);

  const activeDay = phase.days[activeDow];

  function updateDay(dow: number, updater: (d: ProgramDay) => ProgramDay) {
    onChange({ ...phase, days: phase.days.map((d) => d.dayOfWeek === dow ? updater(d) : d) });
  }

  function toggleRest(dow: number) {
    updateDay(dow, (d) => ({ ...d, isRest: !d.isRest, exercises: [] }));
  }

  function addExercise(ex: ExerciseConfig) {
    updateDay(activeDow, (d) => ({ ...d, exercises: [...d.exercises, ex] }));
    setShowPicker(false);
  }

  function removeExercise(dow: number, idx: number) {
    updateDay(dow, (d) => ({ ...d, exercises: d.exercises.filter((_, i) => i !== idx) }));
  }

  function moveExercise(dow: number, idx: number, dir: -1 | 1) {
    updateDay(dow, (d) => {
      const exs = [...d.exercises];
      const swap = idx + dir;
      if (swap < 0 || swap >= exs.length) return d;
      [exs[idx], exs[swap]] = [exs[swap], exs[idx]];
      return { ...d, exercises: exs };
    });
  }

  return (
    <>
      {showPicker && <ExercisePicker onAdd={addExercise} onClose={() => setShowPicker(false)} />}

      {/* Day strip */}
      <div className="flex gap-1 px-3 pb-2 pt-3">
        {phase.days.map((d) => (
          <button key={d.dayOfWeek} type="button" onClick={() => setActiveDow(d.dayOfWeek)}
            className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl press transition-all ${
              activeDow === d.dayOfWeek ? "bg-primary text-primary-foreground" : "glass"
            }`}>
            <span className="text-[10px] font-semibold">{DOW_SHORT[d.dayOfWeek]}</span>
            <div className={`w-1 h-1 rounded-full ${
              d.isRest
                ? (activeDow === d.dayOfWeek ? "bg-primary-foreground/30" : "bg-foreground/15")
                : (activeDow === d.dayOfWeek ? "bg-primary-foreground" : "bg-primary")
            }`} />
          </button>
        ))}
      </div>

      {/* Day exercises */}
      <div className="border-t border-border mx-3 rounded-2xl overflow-hidden glass">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold">
            {activeDay.isRest ? "Rest Day" : activeDay.name}
          </span>
          <button type="button" onClick={() => toggleRest(activeDow)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold press transition-all ${
              activeDay.isRest ? "bg-foreground/10 text-muted-foreground" : "bg-primary/10 text-primary"
            }`}>
            {activeDay.isRest ? "Rest" : "Training"}
          </button>
        </div>

        {activeDay.isRest ? (
          <p className="px-4 py-5 text-sm text-muted-foreground text-center">No exercises — rest & recover.</p>
        ) : (
          <>
            {activeDay.exercises.length === 0 && (
              <p className="px-4 py-5 text-sm text-muted-foreground text-center">No exercises yet. Tap below to add.</p>
            )}
            {activeDay.exercises.map((ex, idx) => (
              <div key={`${ex.name}-${idx}`}
                className="flex items-center gap-2 px-4 py-3 border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{ex.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ex.sets} × {ex.reps}{ex.restSeconds > 0 && ` · ${ex.restSeconds}s`}
                  </p>
                </div>
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button type="button" disabled={idx === 0} onClick={() => moveExercise(activeDow, idx, -1)}
                    className="p-1 text-muted-foreground disabled:opacity-20 press">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
                  </button>
                  <button type="button" disabled={idx === activeDay.exercises.length - 1} onClick={() => moveExercise(activeDow, idx, 1)}
                    className="p-1 text-muted-foreground disabled:opacity-20 press">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                  </button>
                </div>
                <button type="button" onClick={() => removeExercise(activeDow, idx)}
                  className="p-1.5 text-muted-foreground press rounded-lg">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setShowPicker(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-primary text-sm font-semibold press border-t border-border">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Exercise
            </button>
          </>
        )}
      </div>
      <div className="h-3" />
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Step = "program" | "phases" | "weights";

export default function BuilderPage() {
  const router = useRouter();

  // ── Step 1: Program settings ──────────────────────────────────────────────
  const [planName,    setPlanName]    = useState("My Program");
  const [startDate,   setStartDate]   = useState(new Date().toISOString().split("T")[0]);
  const [overload,    setOverload]    = useState<OverloadMode>({ type: "auto" });
  const [incrLbs,     setIncrLbs]     = useState("5");
  const [incrEvery,   setIncrEvery]   = useState("1");

  // ── Step 2: Phases ────────────────────────────────────────────────────────
  const [phases,         setPhases]         = useState<Phase[]>([makePhase(1)]);
  const [expandedPhaseId, setExpandedPhaseId] = useState<string | null>(phases[0].id);

  // ── Step 3: Starting weights ──────────────────────────────────────────────
  const [prs, setPrs] = useState<Record<string, string>>({});

  const [step,    setStep]    = useState<Step>("program");
  const [pending, startTransition] = useTransition();

  // ── Collect all unique weighted exercises across all phases ───────────────
  const weightedExercises = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const phase of phases) {
      for (const day of phase.days) {
        for (const ex of day.exercises) {
          const info = getExerciseInfo(ex.name);
          if (info?.unit === "weight_reps" && !seen.has(ex.name)) {
            seen.add(ex.name);
            out.push(ex.name);
          }
        }
      }
    }
    return out;
  }, [phases]);

  // ── Phase mutations ───────────────────────────────────────────────────────

  function addPhase() {
    const p = makePhase(phases.length + 1);
    setPhases((prev) => [...prev, p]);
    setExpandedPhaseId(p.id);
  }

  function addDeload() {
    const p: Phase = { id: uid(), name: "Deload", weeks: 1, isDeload: true, days: makeDays() };
    setPhases((prev) => [...prev, p]);
    setExpandedPhaseId(p.id);
  }

  function removePhase(id: string) {
    setPhases((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (expandedPhaseId === id) setExpandedPhaseId(next[next.length - 1]?.id ?? null);
      return next;
    });
  }

  function updatePhase(id: string, updater: (p: Phase) => Phase) {
    setPhases((prev) => prev.map((p) => p.id === id ? updater(p) : p));
  }

  function movePhase(id: string, dir: -1 | 1) {
    setPhases((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx < 0) return prev;
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  function handleSave() {
    const resolvedOverload: OverloadMode = overload.type === "configured"
      ? { type: "configured", incrementLbs: parseFloat(incrLbs) || 5, everyNSessions: parseInt(incrEvery) || 1 }
      : overload;

    const program: ProgramV2 = {
      version: 2,
      name: planName.trim() || "My Program",
      startDate,
      overload: resolvedOverload,
      phases,
    };

    const parsedPrs: Record<string, number> = {};
    for (const [k, v] of Object.entries(prs)) {
      const n = parseFloat(v);
      if (n > 0) parsedPrs[k] = n;
    }

    startTransition(async () => {
      const { error } = await saveTrainingProgramV2({ program, prs: parsedPrs });
      if (!error) { window.location.href = "/train"; }
    });
  }

  // ── Total weeks helper ────────────────────────────────────────────────────
  const totalWeeks = phases.reduce((s, p) => s + p.weeks, 0);

  // ════════════════════════════════════════════════════════════════════════════
  // Step: "program"
  // ════════════════════════════════════════════════════════════════════════════
  if (step === "program") return (
    <div className="space-y-4">
      <div>
        <button type="button" onClick={() => router.back()} className="text-xs text-muted-foreground press mb-3 flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Build Your Plan</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Name your program and choose how to track progress.</p>
      </div>

      {/* Name */}
      <div className="glass widget-shadow rounded-2xl px-4 py-3.5 flex items-center gap-3">
        <span className="text-xs text-muted-foreground shrink-0">Plan name</span>
        <input type="text" value={planName} onChange={(e) => setPlanName(e.target.value)}
          className="flex-1 bg-transparent text-sm font-semibold outline-none text-right" maxLength={50}
        />
      </div>

      {/* Start date */}
      <div className="glass widget-shadow rounded-2xl px-4 py-3.5 flex items-center gap-3">
        <span className="text-xs text-muted-foreground shrink-0">Start date</span>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
          className="flex-1 bg-transparent text-sm font-semibold outline-none text-right"
        />
      </div>

      {/* Overload mode */}
      <div className="glass widget-shadow rounded-2xl overflow-hidden">
        <p className="px-4 pt-4 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
          Progressive Overload
        </p>
        {(["auto","configured","manual"] as const).map((mode) => {
          const labels: Record<typeof mode, { title: string; desc: string }> = {
            auto:       { title: "Auto",       desc: "Add weight when all sets complete at target reps" },
            configured: { title: "Configured", desc: "Add a fixed amount every N sessions per exercise" },
            manual:     { title: "Manual",     desc: "You enter your own weights each session, no suggestions" },
          };
          const active = overload.type === mode;
          return (
            <button key={mode} type="button" onClick={() => setOverload({ type: mode } as OverloadMode)}
              className={`w-full flex items-start gap-3 px-4 py-3.5 border-t border-border first:border-0 press transition-colors ${
                active ? "bg-primary/5" : ""
              }`}>
              <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                active ? "border-primary" : "border-border"
              }`}>
                {active && <div className="w-2 h-2 rounded-full bg-primary" />}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold">{labels[mode].title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{labels[mode].desc}</p>
              </div>
            </button>
          );
        })}

        {/* Configured settings */}
        {overload.type === "configured" && (
          <div className="border-t border-border px-4 py-3 space-y-3 bg-foreground/3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Add weight (lbs)</span>
              <input type="number" inputMode="decimal" value={incrLbs} onChange={(e) => setIncrLbs(e.target.value)}
                className="w-20 bg-foreground/8 rounded-xl px-3 py-1.5 text-sm text-center tabular-nums outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Every N sessions</span>
              <input type="number" inputMode="numeric" value={incrEvery} onChange={(e) => setIncrEvery(e.target.value)}
                className="w-20 bg-foreground/8 rounded-xl px-3 py-1.5 text-sm text-center tabular-nums outline-none focus:ring-1 focus:ring-primary/50"
              />
            </div>
          </div>
        )}
      </div>

      <button type="button" onClick={() => setStep("phases")}
        className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm press">
        Next: Build Phases →
      </button>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // Step: "phases"
  // ════════════════════════════════════════════════════════════════════════════
  if (step === "phases") return (
    <div className="space-y-4">
      <div>
        <button type="button" onClick={() => setStep("program")} className="text-xs text-muted-foreground press mb-3 flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Phases</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {planName} · {totalWeeks} week{totalWeeks !== 1 ? "s" : ""} total
        </p>
      </div>

      {phases.map((phase, phaseIdx) => {
        const isExpanded = expandedPhaseId === phase.id;
        const trainingDays = phase.days.filter((d) => !d.isRest).length;
        return (
          <div key={phase.id} className="glass widget-shadow rounded-2xl overflow-hidden">
            {/* Phase header */}
            <div className="flex items-center gap-2 px-4 py-3.5">
              {/* Name */}
              <input type="text" value={phase.name}
                onChange={(e) => updatePhase(phase.id, (p) => ({ ...p, name: e.target.value }))}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 min-w-0 bg-transparent font-semibold text-sm outline-none"
                maxLength={30}
              />
              {phase.isDeload && (
                <span className="text-[10px] font-bold uppercase tracking-wide text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full shrink-0">
                  Deload
                </span>
              )}
              {/* Weeks */}
              <div className="flex items-center gap-1 shrink-0">
                <button type="button" onClick={() => updatePhase(phase.id, (p) => ({ ...p, weeks: Math.max(1, p.weeks - 1) }))}
                  className="w-6 h-6 rounded-full bg-foreground/8 flex items-center justify-center press text-sm font-bold">−</button>
                <span className="text-xs font-semibold tabular-nums w-10 text-center">{phase.weeks}w</span>
                <button type="button" onClick={() => updatePhase(phase.id, (p) => ({ ...p, weeks: Math.min(52, p.weeks + 1) }))}
                  className="w-6 h-6 rounded-full bg-foreground/8 flex items-center justify-center press text-sm font-bold">+</button>
              </div>
              {/* Reorder */}
              <div className="flex flex-col shrink-0">
                <button type="button" disabled={phaseIdx === 0} onClick={() => movePhase(phase.id, -1)}
                  className="p-0.5 text-muted-foreground disabled:opacity-20 press">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
                </button>
                <button type="button" disabled={phaseIdx === phases.length - 1} onClick={() => movePhase(phase.id, 1)}
                  className="p-0.5 text-muted-foreground disabled:opacity-20 press">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
              </div>
              {/* Delete */}
              {phases.length > 1 && (
                <button type="button" onClick={() => removePhase(phase.id)}
                  className="p-1.5 text-muted-foreground press rounded-lg shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              )}
              {/* Expand */}
              <button type="button" onClick={() => setExpandedPhaseId(isExpanded ? null : phase.id)}
                className="p-1.5 text-muted-foreground press rounded-lg shrink-0">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
            </div>

            {/* Phase summary row */}
            {!isExpanded && (
              <div className="px-4 pb-3 flex gap-3">
                <span className="text-xs text-muted-foreground">
                  {trainingDays === 0 ? "No training days — tap to configure" : `${trainingDays} training day${trainingDays !== 1 ? "s" : ""}/week`}
                </span>
              </div>
            )}

            {/* Inline day editor */}
            {isExpanded && (
              <div className="border-t border-border">
                <PhaseEditor phase={phase} onChange={(updated) => updatePhase(phase.id, () => updated)} />
              </div>
            )}
          </div>
        );
      })}

      {/* Add phase buttons */}
      <div className="flex gap-3">
        <button type="button" onClick={addPhase}
          className="flex-1 glass widget-shadow rounded-2xl px-4 py-3.5 flex items-center justify-center gap-2 text-sm font-semibold press text-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Phase
        </button>
        <button type="button" onClick={addDeload}
          className="glass widget-shadow rounded-2xl px-4 py-3.5 flex items-center gap-2 text-sm font-semibold press text-amber-500">
          + Deload
        </button>
      </div>

      <button type="button" onClick={() => setStep("weights")} disabled={phases.length === 0}
        className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm press disabled:opacity-60">
        Next: Starting Weights →
      </button>
    </div>
  );

  // ════════════════════════════════════════════════════════════════════════════
  // Step: "weights"
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-4">
      <div>
        <button type="button" onClick={() => setStep("phases")} className="text-xs text-muted-foreground press mb-3 flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Starting Weights</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Enter your 1-rep max for each lift. Leave blank to start at the bar (45 lbs).
        </p>
      </div>

      {weightedExercises.length === 0 ? (
        <div className="glass widget-shadow rounded-2xl px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">No weighted exercises in your program.</p>
          <p className="text-xs text-muted-foreground mt-1">Go back to add exercises to your phases.</p>
        </div>
      ) : (
        <div className="glass widget-shadow rounded-2xl overflow-hidden divide-y divide-border">
          {weightedExercises.map((ex) => (
            <div key={ex} className="flex items-center gap-3 px-4 py-3.5">
              <span className="flex-1 text-sm font-medium truncate">{ex}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <input type="number" inputMode="decimal"
                  placeholder="0"
                  value={prs[ex] ?? ""}
                  onChange={(e) => setPrs((p) => ({ ...p, [ex]: e.target.value }))}
                  className="w-20 bg-foreground/5 rounded-xl px-2 py-1.5 text-sm text-center tabular-nums outline-none focus:ring-1 focus:ring-primary/50"
                />
                <span className="text-xs text-muted-foreground w-5">lbs</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground px-1">
        These are your 1RM PRs — the app will start you at ~70% automatically.
      </p>

      <button type="button" onClick={handleSave} disabled={pending}
        className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm press disabled:opacity-60">
        {pending ? "Saving…" : `Start ${planName} →`}
      </button>
    </div>
  );
}
