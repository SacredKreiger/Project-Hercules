"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { EXERCISES, EXERCISE_CATEGORIES, getExerciseInfo } from "@/lib/exercises";
import { saveTrainingProgramV2 } from "@/lib/actions/training";
import type { ProgramDay, ExerciseConfig } from "@/lib/templates";
import type { Phase, OverloadMode, ProgramV2 } from "@/lib/program";

const DOW_SHORT  = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DOW_LABELS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 9); }

function makeDays(): ProgramDay[] {
  return Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    name: DOW_LABELS[i],
    isRest: true,
    exercises: [],
  }));
}

function defaultPhase(n: number): Phase {
  return {
    id: uid(),
    name: `Phase ${n}`,
    weeks: 4,
    isDeload: false,
    overload: { type: "auto" },
    days: makeDays(),
  };
}

function defaultDeload(): Phase {
  return {
    id: uid(),
    name: "Deload",
    weeks: 1,
    isDeload: true,
    overload: { type: "manual" },
    days: makeDays(),
  };
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
        <div className="flex-1 px-4 space-y-4 pt-2">
          <p className="text-xl font-bold">{configuring}</p>
          <div className="space-y-3">
            {[
              { label: "Sets",       value: sets, setter: setSets, placeholder: "3",  mode: "numeric" },
              { label: "Reps",       value: reps, setter: setReps, placeholder: "8",  mode: "text"    },
              { label: "Rest (sec)", value: rest, setter: setRest, placeholder: "90", mode: "numeric" },
            ].map(({ label, value, setter, placeholder, mode }) => (
              <div key={label} className="flex items-center justify-between glass rounded-2xl px-4 py-3.5">
                <span className="text-sm font-medium">{label}</span>
                <input
                  type={mode === "text" ? "text" : "number"}
                  inputMode={mode as any}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  placeholder={placeholder}
                  className="w-24 text-right bg-transparent text-sm font-semibold tabular-nums outline-none"
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Reps: number (8), range (8–12), or AMRAP.</p>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setConfiguring(null)}
              className="flex-1 py-3.5 rounded-2xl bg-foreground/5 text-sm font-semibold press">Back</button>
            <button type="button" onClick={confirmAdd}
              className="flex-1 py-3.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold press">
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
              <button key={ex.name} type="button" onClick={() => { setSets("3"); setReps("8"); setRest("90"); setConfiguring(ex.name); }}
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

// ─── OverloadPicker ───────────────────────────────────────────────────────────

function OverloadPicker({ overload, onChange }: {
  overload: OverloadMode;
  onChange: (o: OverloadMode) => void;
}) {
  const [incrLbs,   setIncrLbs]   = useState(
    overload.type === "configured" ? String(overload.incrementLbs) : "5"
  );
  const [incrEvery, setIncrEvery] = useState(
    overload.type === "configured" ? String(overload.everyNSessions) : "1"
  );

  function select(type: OverloadMode["type"]) {
    if (type === "configured") {
      onChange({ type: "configured", incrementLbs: parseFloat(incrLbs) || 5, everyNSessions: parseInt(incrEvery) || 1 });
    } else {
      onChange({ type } as OverloadMode);
    }
  }

  function updateConfigured() {
    if (overload.type === "configured") {
      onChange({ type: "configured", incrementLbs: parseFloat(incrLbs) || 5, everyNSessions: parseInt(incrEvery) || 1 });
    }
  }

  const MODES: { type: OverloadMode["type"]; title: string; desc: string }[] = [
    { type: "auto",       title: "Auto",       desc: "Add weight when all sets hit target reps" },
    { type: "configured", title: "Configured", desc: "Add a fixed amount every N sessions" },
    { type: "manual",     title: "Manual",     desc: "You enter your own weights — no suggestions" },
  ];

  return (
    <div className="glass widget-shadow rounded-2xl overflow-hidden">
      <p className="px-4 pt-3.5 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Progressive Overload
      </p>
      {MODES.map((m) => {
        const active = overload.type === m.type;
        return (
          <button key={m.type} type="button" onClick={() => select(m.type)}
            className={`w-full flex items-start gap-3 px-4 py-3 border-t border-border press transition-colors ${active ? "bg-primary/5" : ""}`}>
            <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${active ? "border-primary" : "border-border"}`}>
              {active && <div className="w-2 h-2 rounded-full bg-primary" />}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold">{m.title}</p>
              <p className="text-xs text-muted-foreground">{m.desc}</p>
            </div>
          </button>
        );
      })}
      {overload.type === "configured" && (
        <div className="border-t border-border px-4 py-3 space-y-2.5 bg-foreground/5">
          <div className="flex items-center justify-between">
            <span className="text-sm">Add (lbs)</span>
            <input type="number" inputMode="decimal" value={incrLbs}
              onChange={(e) => { setIncrLbs(e.target.value); }}
              onBlur={updateConfigured}
              className="w-20 bg-foreground/8 rounded-xl px-3 py-1.5 text-sm text-center tabular-nums outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Every N sessions</span>
            <input type="number" inputMode="numeric" value={incrEvery}
              onChange={(e) => { setIncrEvery(e.target.value); }}
              onBlur={updateConfigured}
              className="w-20 bg-foreground/8 rounded-xl px-3 py-1.5 text-sm text-center tabular-nums outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Step = "info" | "phase-editor" | "overview" | "weights";

export default function BuilderPage() {
  const router = useRouter();

  // Program-level state
  const [planName,  setPlanName]  = useState("My Program");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);

  // Saved phases
  const [phases, setPhases] = useState<Phase[]>([]);

  // Phase currently being edited
  const [draft,       setDraft]       = useState<Phase>(defaultPhase(1));
  const [activeDow,   setActiveDow]   = useState(1);
  const [showPicker,  setShowPicker]  = useState(false);
  const [editingIdx,  setEditingIdx]  = useState<number | null>(null); // index in phases[] being re-edited

  // Starting weights
  const [prs, setPrs] = useState<Record<string, string>>({});

  const [step,    setStep]    = useState<Step>("info");
  const [pending, startTransition] = useTransition();

  // ── Draft helpers ──────────────────────────────────────────────────────────

  function updateDraftDay(dow: number, updater: (d: ProgramDay) => ProgramDay) {
    setDraft((prev) => ({
      ...prev,
      days: prev.days.map((d) => d.dayOfWeek === dow ? updater(d) : d),
    }));
  }

  function toggleRest(dow: number) {
    updateDraftDay(dow, (d) => ({ ...d, isRest: !d.isRest, exercises: [] }));
  }

  function addExercise(ex: ExerciseConfig) {
    updateDraftDay(activeDow, (d) => ({ ...d, exercises: [...d.exercises, ex] }));
    setShowPicker(false);
  }

  function removeExercise(dow: number, idx: number) {
    updateDraftDay(dow, (d) => ({ ...d, exercises: d.exercises.filter((_, i) => i !== idx) }));
  }

  function moveExercise(dow: number, idx: number, dir: -1 | 1) {
    updateDraftDay(dow, (d) => {
      const exs  = [...d.exercises];
      const swap = idx + dir;
      if (swap < 0 || swap >= exs.length) return d;
      [exs[idx], exs[swap]] = [exs[swap], exs[idx]];
      return { ...d, exercises: exs };
    });
  }

  // ── Phase save / navigation ────────────────────────────────────────────────

  function savePhaseAndAdd() {
    if (editingIdx !== null) {
      setPhases((prev) => prev.map((p, i) => i === editingIdx ? draft : p));
      setEditingIdx(null);
    } else {
      setPhases((prev) => [...prev, draft]);
    }
    const nextN = phases.length + (editingIdx !== null ? 0 : 1) + 1;
    setDraft(defaultPhase(nextN));
    setActiveDow(1);
    setStep("phase-editor");
  }

  function savePhaseAndContinue() {
    let updated: Phase[];
    if (editingIdx !== null) {
      updated = phases.map((p, i) => i === editingIdx ? draft : p);
      setEditingIdx(null);
    } else {
      updated = [...phases, draft];
    }
    setPhases(updated);
    setStep("overview");
  }

  function editPhase(idx: number) {
    setDraft(phases[idx]);
    setActiveDow(1);
    setEditingIdx(idx);
    setStep("phase-editor");
  }

  function deletePhase(idx: number) {
    setPhases((prev) => prev.filter((_, i) => i !== idx));
  }

  function movePhase(idx: number, dir: -1 | 1) {
    setPhases((prev) => {
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  }

  function addAnotherFromOverview() {
    const nextN = phases.length + 1;
    setDraft(defaultPhase(nextN));
    setActiveDow(1);
    setEditingIdx(null);
    setStep("phase-editor");
  }

  function addDeloadFromOverview() {
    setDraft(defaultDeload());
    setActiveDow(1);
    setEditingIdx(null);
    setStep("phase-editor");
  }

  // ── Weighted exercises across all phases ────────────────────────────────────

  const weightedExercises = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    const allPhases = step === "weights" ? phases : [...phases, draft];
    for (const phase of allPhases) {
      for (const day of phase.days) {
        for (const ex of day.exercises) {
          const info = getExerciseInfo(ex.name);
          if (info?.unit === "weight_reps" && !seen.has(ex.name)) {
            seen.add(ex.name); out.push(ex.name);
          }
        }
      }
    }
    return out;
  }, [phases, draft, step]);

  // ── Save ───────────────────────────────────────────────────────────────────

  function handleSave() {
    const program: ProgramV2 = {
      version:   2,
      name:      planName.trim() || "My Program",
      startDate,
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

  // ── Back helper ────────────────────────────────────────────────────────────

  function BackBtn({ to }: { to: Step | "router-back" }) {
    return (
      <button type="button"
        onClick={() => to === "router-back" ? router.back() : setStep(to)}
        className="text-xs text-muted-foreground press mb-3 flex items-center gap-1">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back
      </button>
    );
  }

  const totalWeeks = phases.reduce((s, p) => s + p.weeks, 0);
  const activeDay  = draft.days[activeDow];

  // ══════════════════════════════════════════════════════════════════════════
  // STEP: info
  // ══════════════════════════════════════════════════════════════════════════

  if (step === "info") return (
    <div className="space-y-4">
      <div>
        <BackBtn to="router-back" />
        <h1 className="text-2xl font-bold tracking-tight">New Program</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Give it a name, then build your phases one by one.</p>
      </div>

      <div className="glass widget-shadow rounded-2xl divide-y divide-border overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span className="text-sm text-muted-foreground shrink-0">Name</span>
          <input type="text" value={planName} onChange={(e) => setPlanName(e.target.value)}
            className="flex-1 bg-transparent text-sm font-semibold outline-none text-right" maxLength={50}
            placeholder="My Program"
          />
        </div>
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span className="text-sm text-muted-foreground shrink-0">Start date</span>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="flex-1 bg-transparent text-sm font-semibold outline-none text-right"
          />
        </div>
      </div>

      <button type="button"
        onClick={() => { setDraft(defaultPhase(1)); setActiveDow(1); setStep("phase-editor"); }}
        className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm press">
        Build Phase 1 →
      </button>
    </div>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // STEP: phase-editor
  // ══════════════════════════════════════════════════════════════════════════

  if (step === "phase-editor") return (
    <>
      {showPicker && <ExercisePicker onAdd={addExercise} onClose={() => setShowPicker(false)} />}

      <div className="space-y-4">
        <div>
          <BackBtn to={phases.length > 0 || editingIdx !== null ? "overview" : "info"} />
          <h1 className="text-2xl font-bold tracking-tight">
            {editingIdx !== null ? "Edit Phase" : `Phase ${phases.length + 1}`}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Build the weekly schedule — it repeats for the number of weeks you set.
          </p>
        </div>

        {/* Phase name + weeks */}
        <div className="glass widget-shadow rounded-2xl divide-y divide-border overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="text-sm text-muted-foreground shrink-0">Phase name</span>
            <input type="text" value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
              className="flex-1 bg-transparent text-sm font-semibold outline-none text-right" maxLength={40}
            />
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="text-sm text-muted-foreground shrink-0 flex-1">Repeat for</span>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setDraft((p) => ({ ...p, weeks: Math.max(1, p.weeks - 1) }))}
                className="w-8 h-8 rounded-full bg-foreground/8 flex items-center justify-center press text-lg font-bold">−</button>
              <span className="text-sm font-semibold tabular-nums w-16 text-center">
                {draft.weeks} week{draft.weeks !== 1 ? "s" : ""}
              </span>
              <button type="button" onClick={() => setDraft((p) => ({ ...p, weeks: Math.min(52, p.weeks + 1) }))}
                className="w-8 h-8 rounded-full bg-foreground/8 flex items-center justify-center press text-lg font-bold">+</button>
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5">
            <span className="text-sm text-muted-foreground">Deload week</span>
            <button
              type="button"
              role="switch"
              aria-checked={draft.isDeload}
              onClick={() => setDraft((p) => ({ ...p, isDeload: !p.isDeload }))}
              style={{
                background: draft.isDeload ? "#f59e0b" : "oklch(0 0 0 / 15%)",
                transition: "background 0.2s ease",
              }}
              className="relative w-12 h-7 rounded-full flex-shrink-0"
            >
              <span
                style={{
                  transform: draft.isDeload ? "translateX(22px)" : "translateX(2px)",
                  transition: "transform 0.2s ease",
                }}
                className="absolute top-1 w-5 h-5 rounded-full bg-white shadow-md block"
              />
            </button>
          </div>
        </div>

        {/* 7-day strip */}
        <div className="glass widget-shadow rounded-2xl overflow-hidden">
          <p className="px-4 pt-3.5 pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Weekly Schedule
          </p>
          <div className="flex gap-1 px-3 pb-3">
            {draft.days.map((d) => (
              <button key={d.dayOfWeek} type="button" onClick={() => setActiveDow(d.dayOfWeek)}
                className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl press transition-all ${
                  activeDow === d.dayOfWeek ? "bg-primary text-primary-foreground" : "bg-foreground/5"
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

          {/* Day editor */}
          <div className="border-t border-border">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold">{activeDay.name}</span>
              <button type="button" onClick={() => toggleRest(activeDow)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold press transition-all ${
                  activeDay.isRest ? "bg-foreground/10 text-muted-foreground" : "bg-primary/10 text-primary"
                }`}>
                {activeDay.isRest ? "Rest" : "Training"}
              </button>
            </div>

            {activeDay.isRest ? (
              <p className="px-4 py-6 text-sm text-muted-foreground text-center">Rest & recovery — no exercises.</p>
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
                        {ex.sets} × {ex.reps}{ex.restSeconds > 0 && ` · ${ex.restSeconds}s rest`}
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
        </div>

        {/* Overload settings */}
        <OverloadPicker
          overload={draft.overload}
          onChange={(o) => setDraft((p) => ({ ...p, overload: o }))}
        />

        {/* Save buttons */}
        <div className="flex gap-3 pb-4">
          <button type="button" onClick={savePhaseAndAdd}
            className="flex-1 py-4 rounded-2xl bg-foreground/8 text-foreground text-sm font-semibold press">
            Save &amp; Add Phase
          </button>
          <button type="button" onClick={savePhaseAndContinue}
            className="flex-1 py-4 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold press">
            Save &amp; Continue →
          </button>
        </div>
      </div>
    </>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // STEP: overview
  // ══════════════════════════════════════════════════════════════════════════

  if (step === "overview") return (
    <div className="space-y-4">
      <div>
        <BackBtn to="phase-editor" />
        <h1 className="text-2xl font-bold tracking-tight">Program Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {planName} · {totalWeeks} week{totalWeeks !== 1 ? "s" : ""} total
        </p>
      </div>

      {/* Phase timeline */}
      <div className="flex gap-1 h-2">
        {phases.map((p) => (
          <div key={p.id}
            className={`rounded-full flex-none transition-all ${p.isDeload ? "bg-amber-400" : "bg-primary"}`}
            style={{ flexBasis: `${(p.weeks / totalWeeks) * 100}%` }}
          />
        ))}
      </div>

      {/* Phase list */}
      <div className="space-y-2">
        {phases.map((phase, idx) => {
          const trainingDays = phase.days.filter((d) => !d.isRest).length;
          const overloadLabel = phase.overload.type === "auto" ? "Auto"
            : phase.overload.type === "manual" ? "Manual"
            : `+${(phase.overload as any).incrementLbs}lbs / ${(phase.overload as any).everyNSessions} sessions`;
          return (
            <div key={phase.id} className="glass widget-shadow rounded-2xl px-4 py-3.5 flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full shrink-0 ${phase.isDeload ? "bg-amber-400" : "bg-primary"}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold truncate">{phase.name}</p>
                  {phase.isDeload && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full shrink-0">Deload</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {phase.weeks}w · {trainingDays} training days/wk · {overloadLabel}
                </p>
              </div>
              {/* Reorder */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button type="button" disabled={idx === 0} onClick={() => movePhase(idx, -1)}
                  className="p-1 text-muted-foreground disabled:opacity-20 press">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
                </button>
                <button type="button" disabled={idx === phases.length - 1} onClick={() => movePhase(idx, 1)}
                  className="p-1 text-muted-foreground disabled:opacity-20 press">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
              </div>
              {/* Edit */}
              <button type="button" onClick={() => editPhase(idx)}
                className="p-1.5 text-muted-foreground press rounded-lg shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              {/* Delete */}
              <button type="button" onClick={() => deletePhase(idx)}
                className="p-1.5 text-muted-foreground press rounded-lg shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {/* Add phase buttons */}
      <div className="flex gap-3">
        <button type="button" onClick={addAnotherFromOverview}
          className="flex-1 glass widget-shadow rounded-2xl px-4 py-3.5 flex items-center justify-center gap-2 text-sm font-semibold press text-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Phase
        </button>
        <button type="button" onClick={addDeloadFromOverview}
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

  // ══════════════════════════════════════════════════════════════════════════
  // STEP: weights
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-4">
      <div>
        <BackBtn to="overview" />
        <h1 className="text-2xl font-bold tracking-tight">Starting Weights</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Enter your 1RM for each lift — we'll start you at ~70%. Leave blank to start at the bar.
        </p>
      </div>

      {weightedExercises.length === 0 ? (
        <div className="glass widget-shadow rounded-2xl px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">No weighted exercises in your program.</p>
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
        1RM = your 1-rep max. The app sets your working weight to ~70% automatically.
      </p>

      <button type="button" onClick={handleSave} disabled={pending}
        className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm press disabled:opacity-60">
        {pending ? "Saving…" : `Start ${planName} →`}
      </button>
    </div>
  );
}
