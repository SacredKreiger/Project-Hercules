"use client";

import { useState, useEffect, useRef, useTransition, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { EXERCISES, EXERCISE_CATEGORIES, getExerciseInfo } from "@/lib/exercises";
import { upsertProgram, activateProgram, upsertPersonalRecord } from "@/lib/actions/programs";
import type { ProgramDay, ExerciseConfig } from "@/lib/templates";
import type { Phase, OverloadMode, ProgramV2 } from "@/lib/program";

const DRAFT_ID_KEY = "hc-builder-program-id";
const DOW_SHORT    = ["Su","Mo","Tu","We","Th","Fr","Sa"];
const DOW_LABELS   = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function uid() { return Math.random().toString(36).slice(2, 9); }
function makeDays(): ProgramDay[] {
  return Array.from({ length: 7 }, (_, i) => ({ dayOfWeek: i, name: DOW_LABELS[i], isRest: true, exercises: [] }));
}
function newPhase(n: number): Phase {
  return { id: uid(), name: `Phase ${n}`, weeks: 4, isDeload: false, overload: { type: "auto" }, days: makeDays() };
}
function newDeload(): Phase {
  return { id: uid(), name: "Deload", weeks: 1, isDeload: true, overload: { type: "manual" }, days: makeDays() };
}

// ── Exercise Picker ────────────────────────────────────────────────────────────

function ExercisePicker({ onAdd, onClose }: { onAdd: (ex: ExerciseConfig) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("8");
  const [rest, setRest] = useState("90");

  const filtered = EXERCISES.filter((e) => {
    const matchCat = category === "All" || e.category === category;
    return matchCat && e.name.toLowerCase().includes(query.toLowerCase());
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
        <div className="flex-1 flex flex-col px-5 pt-4 space-y-4">
          <p className="font-semibold">{configuring}</p>
          <div className="grid grid-cols-3 gap-3">
            {[["Sets", sets, setSets], ["Reps", reps, setReps], ["Rest (s)", rest, setRest]].map(([label, val, set]) => (
              <div key={label as string} className="space-y-1">
                <label className="text-[10px] text-muted-foreground">{label as string}</label>
                <input type={label === "Reps" ? "text" : "number"} value={val as string}
                  onChange={(e) => (set as any)(e.target.value)}
                  className="w-full bg-foreground/5 rounded-xl h-10 px-3 text-sm text-center outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
            ))}
          </div>
          <button type="button" onClick={confirmAdd}
            className="w-full h-11 rounded-full bg-primary text-primary-foreground font-semibold text-sm press">
            Add to Day
          </button>
          <button type="button" onClick={() => setConfiguring(null)}
            className="text-sm text-muted-foreground text-center press">← Back</button>
        </div>
      ) : (
        <>
          <div className="px-4 pb-2">
            <input autoFocus type="text" placeholder="Search exercises…" value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-foreground/5 rounded-xl h-10 px-4 text-sm outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto hide-scrollbar">
            {["All", ...EXERCISE_CATEGORIES].map((c) => (
              <button key={c} type="button" onClick={() => setCategory(c)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium press transition-colors ${c === category ? "bg-primary text-primary-foreground" : "bg-foreground/8 text-muted-foreground"}`}>
                {c}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto px-4 space-y-1 pb-8">
            {filtered.map((ex) => (
              <button key={ex.name} type="button"
                onClick={() => { setSets("3"); setReps("8"); setRest("90"); setConfiguring(ex.name); }}
                className="w-full text-left flex items-center justify-between px-4 py-3 glass rounded-2xl press">
                <span className="text-sm font-medium">{ex.name}</span>
                <span className="text-xs text-muted-foreground">{ex.category}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-10">No exercises found.</p>}
          </div>
        </>
      )}
    </div>
  );
}

// ── Overload Picker ────────────────────────────────────────────────────────────

function OverloadPicker({ overload, onChange }: { overload: OverloadMode; onChange: (o: OverloadMode) => void }) {
  const [incrLbs, setIncrLbs] = useState(overload.type === "configured" ? String((overload as any).incrementLbs) : "5");
  const [incrEvery, setIncrEvery] = useState(overload.type === "configured" ? String((overload as any).everyNSessions) : "1");

  function select(type: OverloadMode["type"]) {
    if (type === "configured") onChange({ type: "configured", incrementLbs: parseFloat(incrLbs) || 5, everyNSessions: parseInt(incrEvery) || 1 } as any);
    else onChange({ type } as OverloadMode);
  }

  const MODES = [
    { type: "auto" as const, title: "Auto", desc: "Add weight when all sets hit target reps" },
    { type: "configured" as const, title: "Configured", desc: "Add a fixed amount every N sessions" },
    { type: "manual" as const, title: "Manual", desc: "You enter your own weights each session" },
  ];

  return (
    <div className="bg-foreground/3 rounded-xl overflow-hidden border border-border/50">
      <p className="px-3 pt-2.5 pb-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Progressive Overload</p>
      {MODES.map((m) => {
        const active = overload.type === m.type;
        return (
          <button key={m.type} type="button" onClick={() => select(m.type)}
            className={`w-full flex items-start gap-2.5 px-3 py-2.5 border-t border-border/40 press transition-colors text-left ${active ? "bg-primary/6" : ""}`}>
            <div className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${active ? "border-primary" : "border-border"}`}>
              {active && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
            </div>
            <div>
              <p className="text-xs font-semibold">{m.title}</p>
              <p className="text-[10px] text-muted-foreground">{m.desc}</p>
            </div>
          </button>
        );
      })}
      {overload.type === "configured" && (
        <div className="border-t border-border/40 px-3 py-2.5 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Add</span>
            <input type="number" value={incrLbs} onChange={(e) => setIncrLbs(e.target.value)}
              onBlur={() => onChange({ type: "configured", incrementLbs: parseFloat(incrLbs) || 5, everyNSessions: parseInt(incrEvery) || 1 } as any)}
              className="w-14 bg-foreground/8 rounded-lg px-2 py-1 text-xs text-center outline-none focus:ring-1 focus:ring-primary/50" />
            <span className="text-xs text-muted-foreground">lbs every</span>
            <input type="number" value={incrEvery} onChange={(e) => setIncrEvery(e.target.value)}
              onBlur={() => onChange({ type: "configured", incrementLbs: parseFloat(incrLbs) || 5, everyNSessions: parseInt(incrEvery) || 1 } as any)}
              className="w-14 bg-foreground/8 rounded-lg px-2 py-1 text-xs text-center outline-none focus:ring-1 focus:ring-primary/50" />
            <span className="text-xs text-muted-foreground">sessions</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Phase Card ─────────────────────────────────────────────────────────────────

function PhaseCard({
  phase, phaseIdx, isExpanded, activeDow,
  onToggle, onDelete, onMove, onUpdate, onToggleDow, onAddExercise,
  onRemoveExercise, onMoveExercise, onUpdateExercisePr,
  canMoveUp, canMoveDown, prModeEnabled, prs,
}: {
  phase: Phase; phaseIdx: number; isExpanded: boolean; activeDow: number;
  onToggle: () => void; onDelete: () => void; onMove: (dir: -1|1) => void;
  onUpdate: (updated: Phase) => void;
  onToggleDow: (dow: number) => void;
  onAddExercise: () => void;
  onRemoveExercise: (dow: number, idx: number) => void;
  onMoveExercise: (dow: number, idx: number, dir: -1|1) => void;
  onUpdateExercisePr: (dow: number, idx: number, pct: number | undefined) => void;
  canMoveUp: boolean; canMoveDown: boolean;
  prModeEnabled: boolean; prs: Record<string, string>;
}) {
  const activeDay = phase.days[activeDow];
  const trainingDays = phase.days.filter((d) => !d.isRest).length;
  const totalExercises = phase.days.reduce((s, d) => s + d.exercises.length, 0);

  return (
    <div className={`glass widget-shadow rounded-2xl overflow-hidden transition-all duration-200 ${isExpanded ? "ring-2 ring-primary/40" : ""}`}>
      {/* Header */}
      <button type="button" onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left press active:bg-foreground/5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold truncate">{phase.name}</p>
            {phase.isDeload && (
              <span className="text-[9px] font-bold uppercase tracking-wide text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full shrink-0">Deload</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {phase.weeks} {phase.weeks === 1 ? "week" : "weeks"} · {trainingDays} training days · {totalExercises} exercises
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={(e) => { e.stopPropagation(); onMove(-1); }}
            disabled={!canMoveUp}
            className="w-7 h-7 rounded-lg bg-foreground/5 flex items-center justify-center press disabled:opacity-30">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onMove(1); }}
            disabled={!canMoveDown}
            className="w-7 h-7 rounded-lg bg-foreground/5 flex items-center justify-center press disabled:opacity-30">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <button type="button" onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center press">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          </button>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={`text-muted-foreground ml-1 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </button>

      {/* Expanded editor */}
      {isExpanded && (
        <div className="border-t border-border px-4 pb-4 space-y-4 pt-3">
          {/* Name + weeks + deload row */}
          <div className="flex items-center gap-2">
            <input type="text" value={phase.name}
              onChange={(e) => onUpdate({ ...phase, name: e.target.value })}
              className="flex-1 bg-foreground/5 rounded-xl h-9 px-3 text-sm font-semibold outline-none focus:ring-1 focus:ring-primary/50"
              placeholder="Phase name"
            />
            <div className="flex items-center gap-1.5 bg-foreground/5 rounded-xl h-9 px-3 shrink-0">
              <button type="button" onClick={() => onUpdate({ ...phase, weeks: Math.max(1, phase.weeks - 1) })}
                className="text-muted-foreground press font-bold text-base leading-none">−</button>
              <span className="text-sm font-semibold tabular-nums w-6 text-center">{phase.weeks}</span>
              <button type="button" onClick={() => onUpdate({ ...phase, weeks: phase.weeks + 1 })}
                className="text-muted-foreground press font-bold text-base leading-none">+</button>
              <span className="text-xs text-muted-foreground ml-0.5">wk</span>
            </div>
            <button type="button"
              onClick={() => onUpdate({ ...phase, isDeload: !phase.isDeload })}
              className={`h-9 px-3 rounded-xl text-xs font-semibold press shrink-0 transition-colors ${phase.isDeload ? "bg-amber-500/15 text-amber-500" : "bg-foreground/5 text-muted-foreground"}`}>
              Deload
            </button>
          </div>

          {/* Overload picker */}
          <OverloadPicker overload={phase.overload} onChange={(o) => onUpdate({ ...phase, overload: o })} />

          {/* Day strip */}
          <div className="flex gap-1">
            {Array.from({ length: 7 }).map((_, dow) => {
              const day = phase.days[dow];
              const isRest = day?.isRest ?? true;
              const isActive = dow === activeDow;
              return (
                <button key={dow} type="button"
                  onClick={() => onToggleDow(dow)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl press transition-colors ${isActive ? "bg-primary/10" : "active:bg-foreground/5"}`}>
                  <span className={`text-[9px] font-semibold ${isActive ? "text-primary" : "text-muted-foreground"}`}>{DOW_SHORT[dow]}</span>
                  <div className={`w-full max-w-[28px] h-1.5 rounded-full transition-colors ${
                    isActive ? "bg-primary" : isRest ? "bg-foreground/10" : "bg-primary/40"
                  }`} />
                </button>
              );
            })}
          </div>

          {/* Selected day */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">{DOW_LABELS[activeDow]}</p>
              <button type="button"
                onClick={() => onUpdate({
                  ...phase,
                  days: phase.days.map((d, i) => i === activeDow ? { ...d, isRest: !d.isRest, exercises: [] } : d),
                })}
                className={`text-[10px] font-semibold px-2.5 py-1 rounded-full press transition-colors ${
                  activeDay?.isRest ? "bg-foreground/8 text-muted-foreground" : "bg-primary/10 text-primary"
                }`}>
                {activeDay?.isRest ? "Rest Day" : "Training Day"}
              </button>
            </div>

            {!activeDay?.isRest && (
              <>
                {activeDay?.exercises.map((ex, idx) => (
                  <div key={idx} className="bg-foreground/4 rounded-xl px-3 py-2.5 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{ex.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {ex.sets} × {ex.reps} · {ex.restSeconds}s rest
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => onMoveExercise(activeDow, idx, -1)} disabled={idx === 0}
                          className="w-6 h-6 rounded-md bg-foreground/8 flex items-center justify-center press disabled:opacity-30">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>
                        </button>
                        <button type="button" onClick={() => onMoveExercise(activeDow, idx, 1)} disabled={idx === (activeDay?.exercises.length ?? 0) - 1}
                          className="w-6 h-6 rounded-md bg-foreground/8 flex items-center justify-center press disabled:opacity-30">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                        </button>
                        <button type="button" onClick={() => onRemoveExercise(activeDow, idx)}
                          className="w-6 h-6 rounded-md bg-rose-500/10 flex items-center justify-center press">
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                    </div>
                    {prModeEnabled && getExerciseInfo(ex.name)?.unit === "weight_reps" && (
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="text-[10px] text-muted-foreground">% of PR</span>
                        <input
                          type="number" min="1" max="100"
                          placeholder="e.g. 75"
                          value={ex.prPercent ?? ""}
                          onChange={(e) => {
                            const v = e.target.value === "" ? undefined : Math.min(100, Math.max(1, parseInt(e.target.value)));
                            onUpdateExercisePr(activeDow, idx, v);
                          }}
                          className="w-16 bg-foreground/8 rounded-lg px-2 py-1 text-xs text-center outline-none focus:ring-1 focus:ring-primary/50"
                        />
                        {ex.prPercent && prs[ex.name] && (
                          <span className="text-[10px] text-primary font-semibold">
                            = {Math.round(parseFloat(prs[ex.name]) * ex.prPercent / 100 / 5) * 5} lbs
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                <button type="button" onClick={onAddExercise}
                  className="w-full h-9 rounded-xl border border-dashed border-border text-xs text-muted-foreground font-medium press flex items-center justify-center gap-1.5">
                  <span className="text-base leading-none">+</span> Add Exercise
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlId = searchParams.get("id");

  const [programId, setProgramId]   = useState<string | null>(null);
  const [programName, setProgramName] = useState("My Program");
  const [phases, setPhases]           = useState<Phase[]>([newPhase(1)]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);
  const [activeDow, setActiveDow]     = useState(1);
  const [showPicker, setShowPicker]   = useState(false);
  const [prs, setPrs]                 = useState<Record<string, string>>({});
  const [prModeEnabled, setPrModeEnabled] = useState(false);
  const [saveStatus, setSaveStatus]   = useState<"idle" | "saving" | "saved">("idle");
  const [initialized, setInitialized] = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [starting, startTransition]   = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from("profiles")
        .select("pr_mode_enabled").eq("id", user.id).single();
      if (profile?.pr_mode_enabled) setPrModeEnabled(true);

      const { data: prRows } = await supabase.from("personal_records")
        .select("exercise_name, weight_lbs").eq("user_id", user.id);
      if (prRows?.length) {
        const map: Record<string, string> = {};
        prRows.forEach((r) => { map[r.exercise_name] = String(r.weight_lbs); });
        setPrs(map);
      }

      const targetId = urlId || localStorage.getItem(DRAFT_ID_KEY);
      if (targetId) {
        const { data: prog } = await supabase.from("programs")
          .select("*").eq("id", targetId).eq("user_id", user.id).single();
        if (prog) {
          setProgramId(prog.id);
          setProgramName(prog.name);
          const p = prog.program as ProgramV2;
          if (p?.phases?.length) {
            setPhases(p.phases);
            setExpandedIdx(null);
          }
        }
      }

      setInitialized(true);
    })();
  }, [urlId]);

  // ── Autosave ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!initialized) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSaveStatus("saving");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const programData: ProgramV2 = { version: 2, name: programName.trim() || "My Program", startDate: "", phases };
      let id = programId;

      if (id) {
        await supabase.from("programs").update({
          name: programData.name, program: programData, updated_at: new Date().toISOString(),
        }).eq("id", id).eq("user_id", user.id);
      } else {
        const { data } = await supabase.from("programs")
          .insert({ user_id: user.id, name: programData.name, program: programData })
          .select("id").single();
        if (data?.id) {
          id = data.id;
          setProgramId(id);
          localStorage.setItem(DRAFT_ID_KEY, id as string);
        }
      }

      // Save PRs
      const prRows = Object.entries(prs)
        .filter(([, v]) => parseFloat(v) > 0)
        .map(([exercise_name, weight_lbs]) => ({
          user_id: user.id, exercise_name, weight_lbs: parseFloat(weight_lbs),
          updated_at: new Date().toISOString(),
        }));
      if (prRows.length > 0) {
        await supabase.from("personal_records").upsert(prRows, { onConflict: "user_id,exercise_name" });
      }

      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1500);
    }, 900);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [initialized, programName, phases, prs]);

  // ── Phase helpers ─────────────────────────────────────────────────────────

  function updatePhase(idx: number, updated: Phase) {
    setPhases((prev) => prev.map((p, i) => i === idx ? updated : p));
  }

  function addPhase() {
    setPhases((prev) => {
      const next = [...prev, newPhase(prev.length + 1)];
      setExpandedIdx(next.length - 1);
      setActiveDow(1);
      return next;
    });
  }

  function addDeload() {
    setPhases((prev) => {
      const next = [...prev, newDeload()];
      setExpandedIdx(next.length - 1);
      setActiveDow(1);
      return next;
    });
  }

  function deletePhase(idx: number) {
    setPhases((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      setExpandedIdx(null);
      return next;
    });
  }

  function movePhase(idx: number, dir: -1 | 1) {
    setPhases((prev) => {
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      setExpandedIdx(swap);
      return next;
    });
  }

  function toggleDow(phaseIdx: number, dow: number) {
    setActiveDow(dow);
  }

  function toggleDayRest(phaseIdx: number, dow: number) {
    updatePhase(phaseIdx, {
      ...phases[phaseIdx],
      days: phases[phaseIdx].days.map((d) =>
        d.dayOfWeek === dow ? { ...d, isRest: !d.isRest, exercises: [] } : d
      ),
    });
  }

  function addExercise(ex: ExerciseConfig) {
    if (expandedIdx === null) return;
    const phase = phases[expandedIdx];
    updatePhase(expandedIdx, {
      ...phase,
      days: phase.days.map((d) => d.dayOfWeek === activeDow ? { ...d, exercises: [...d.exercises, ex] } : d),
    });
    setShowPicker(false);
  }

  function removeExercise(phaseIdx: number, dow: number, exIdx: number) {
    const phase = phases[phaseIdx];
    updatePhase(phaseIdx, {
      ...phase,
      days: phase.days.map((d) => d.dayOfWeek === dow ? { ...d, exercises: d.exercises.filter((_, i) => i !== exIdx) } : d),
    });
  }

  function moveExercise(phaseIdx: number, dow: number, exIdx: number, dir: -1 | 1) {
    const phase = phases[phaseIdx];
    updatePhase(phaseIdx, {
      ...phase,
      days: phase.days.map((d) => {
        if (d.dayOfWeek !== dow) return d;
        const exs = [...d.exercises];
        const swap = exIdx + dir;
        if (swap < 0 || swap >= exs.length) return d;
        [exs[exIdx], exs[swap]] = [exs[swap], exs[exIdx]];
        return { ...d, exercises: exs };
      }),
    });
  }

  function updateExercisePr(phaseIdx: number, dow: number, exIdx: number, pct: number | undefined) {
    const phase = phases[phaseIdx];
    updatePhase(phaseIdx, {
      ...phase,
      days: phase.days.map((d) => {
        if (d.dayOfWeek !== dow) return d;
        return {
          ...d,
          exercises: d.exercises.map((ex, i) => i === exIdx ? { ...ex, prPercent: pct } : ex),
        };
      }),
    });
  }

  // ── PR helpers ────────────────────────────────────────────────────────────

  const prDebounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  function updatePr(exercise: string, value: string) {
    setPrs((p) => ({ ...p, [exercise]: value }));
    if (prDebounceRef.current[exercise]) clearTimeout(prDebounceRef.current[exercise]);
    prDebounceRef.current[exercise] = setTimeout(async () => {
      const n = parseFloat(value);
      if (n > 0) await upsertPersonalRecord(exercise, n);
    }, 800);
  }

  // ── Weighted exercises across all phases ──────────────────────────────────

  const weightedExercises = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const phase of phases) {
      for (const day of phase.days) {
        for (const ex of day.exercises) {
          const info = getExerciseInfo(ex.name);
          if (info?.unit === "weight_reps" && !seen.has(ex.name)) { seen.add(ex.name); out.push(ex.name); }
        }
      }
    }
    return out;
  }, [phases]);

  // ── Start program ─────────────────────────────────────────────────────────

  function handleStart() {
    if (phases.length === 0) { setError("Add at least one phase before starting."); return; }
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const programData: ProgramV2 = {
        version: 2, name: programName.trim() || "My Program",
        startDate: new Date().toISOString().split("T")[0], phases,
      };
      let id = programId;
      if (id) {
        await supabase.from("programs").update({
          name: programData.name, program: programData, updated_at: new Date().toISOString(),
        }).eq("id", id);
      } else {
        const { data } = await supabase.from("programs")
          .insert({ user_id: user.id, name: programData.name, program: programData })
          .select("id").single();
        id = data?.id ?? null;
      }
      if (!id) { setError("Failed to save program."); return; }

      const { error: actErr } = await activateProgram(id);
      if (actErr) { setError(actErr); return; }

      localStorage.removeItem(DRAFT_ID_KEY);
      window.location.href = "/train";
    });
  }

  const totalWeeks = phases.reduce((s, p) => s + p.weeks, 0);

  return (
    <>
      {showPicker && <ExercisePicker onAdd={addExercise} onClose={() => setShowPicker(false)} />}

      <div className="space-y-3 pb-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => router.push("/train/programs")}
            className="press text-muted-foreground flex items-center gap-1 text-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            Programs
          </button>
          <div className="flex-1" />
          <span className={`text-[10px] font-medium transition-colors ${
            saveStatus === "saving" ? "text-primary" : saveStatus === "saved" ? "text-emerald-500" : "text-muted-foreground/40"
          }`}>
            {saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved ✓" : "Auto-saved"}
          </span>
        </div>

        {/* Program name */}
        <div className={`glass widget-shadow rounded-2xl px-4 py-3 transition-all duration-300 ${saveStatus === "saved" ? "ring-2 ring-primary/40" : "ring-2 ring-transparent"}`}>
          <input
            type="text"
            value={programName}
            onChange={(e) => setProgramName(e.target.value)}
            className="w-full text-xl font-bold bg-transparent outline-none placeholder:text-muted-foreground/40"
            placeholder="Program name…"
            maxLength={50}
          />
          <p className="text-xs text-muted-foreground mt-0.5">
            {phases.length} {phases.length === 1 ? "phase" : "phases"} · {totalWeeks} {totalWeeks === 1 ? "week" : "weeks"} total
          </p>
        </div>

        {/* Phases */}
        {phases.map((phase, idx) => (
          <PhaseCard
            key={phase.id}
            phase={phase}
            phaseIdx={idx}
            isExpanded={expandedIdx === idx}
            activeDow={activeDow}
            onToggle={() => { setExpandedIdx((prev) => prev === idx ? null : idx); setActiveDow(1); }}
            onDelete={() => deletePhase(idx)}
            onMove={(dir) => movePhase(idx, dir)}
            onUpdate={(updated) => updatePhase(idx, updated)}
            onToggleDow={(dow) => toggleDow(idx, dow)}
            onAddExercise={() => setShowPicker(true)}
            onRemoveExercise={(dow, exIdx) => removeExercise(idx, dow, exIdx)}
            onMoveExercise={(dow, exIdx, dir) => moveExercise(idx, dow, exIdx, dir)}
            onUpdateExercisePr={(dow, exIdx, pct) => updateExercisePr(idx, dow, exIdx, pct)}
            canMoveUp={idx > 0}
            canMoveDown={idx < phases.length - 1}
            prModeEnabled={prModeEnabled}
            prs={prs}
          />
        ))}

        {/* Add phase buttons */}
        <div className="flex gap-2">
          <button type="button" onClick={addPhase}
            className="flex-1 h-11 rounded-2xl border border-dashed border-border text-sm font-semibold text-muted-foreground press flex items-center justify-center gap-2">
            <span className="text-lg leading-none">+</span> Add Phase
          </button>
          <button type="button" onClick={addDeload}
            className="h-11 px-4 rounded-2xl border border-dashed border-amber-500/30 text-xs font-semibold text-amber-500 press flex items-center justify-center gap-1.5">
            + Deload
          </button>
        </div>

        {/* PRs section */}
        {prModeEnabled && weightedExercises.length > 0 && (
          <div className="glass widget-shadow rounded-2xl overflow-hidden">
            <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Personal Records (PRs)</p>
            <div className="divide-y divide-border">
              {weightedExercises.map((ex) => (
                <div key={ex} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex-1 text-sm font-medium truncate">{ex}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number" inputMode="decimal" placeholder="0"
                      value={prs[ex] ?? ""}
                      onChange={(e) => updatePr(ex, e.target.value)}
                      className="w-20 bg-foreground/5 rounded-lg px-2 py-1.5 text-sm text-center tabular-nums outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <span className="text-xs text-muted-foreground">lbs</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive px-1">{error}</p>}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={() => router.push("/train/programs")}
            className="flex-1 h-12 rounded-2xl glass font-semibold text-sm press">
            Save Draft
          </button>
          <button type="button" onClick={handleStart} disabled={starting}
            className="flex-1 h-12 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm press disabled:opacity-60">
            {starting ? "Starting…" : "Start Program →"}
          </button>
        </div>
      </div>
    </>
  );
}
