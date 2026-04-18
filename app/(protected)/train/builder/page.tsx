"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EXERCISES, EXERCISE_CATEGORIES } from "@/lib/exercises";
import { saveTrainingProgram } from "@/lib/actions/training";
import type { ProgramDay, ExerciseConfig } from "@/lib/templates";

const DOW_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOW_SHORT  = ["Su",  "Mo",  "Tu",  "We",  "Th",  "Fr",  "Sa"];

type DraftExercise = ExerciseConfig & { _key: string };

type DraftDay = {
  dayOfWeek: number;
  name: string;
  isRest: boolean;
  exercises: DraftExercise[];
};

function makeDraftDay(dow: number): DraftDay {
  return { dayOfWeek: dow, name: DOW_LABELS[dow], isRest: true, exercises: [] };
}

// ── ExercisePicker ────────────────────────────────────────────────────────

function ExercisePicker({
  onAdd,
  onClose,
}: {
  onAdd: (ex: ExerciseConfig) => void;
  onClose: () => void;
}) {
  const [query,       setQuery]       = useState("");
  const [category,    setCategory]    = useState<string>("All");
  const [configuring, setConfiguring] = useState<string | null>(null);
  const [sets,        setSets]        = useState("3");
  const [reps,        setReps]        = useState("8");
  const [rest,        setRest]        = useState("90");

  const filtered = EXERCISES.filter((e) => {
    const matchCat  = category === "All" || e.category === category;
    const matchName = e.name.toLowerCase().includes(query.toLowerCase());
    return matchCat && matchName;
  });

  function startConfig(name: string) {
    setConfiguring(name);
    setSets("3"); setReps("8"); setRest("90");
  }

  function confirmAdd() {
    if (!configuring) return;
    onAdd({
      name: configuring,
      sets: parseInt(sets) || 3,
      reps: reps || "8",
      restSeconds: parseInt(rest) || 90,
    });
    setConfiguring(null);
    setQuery("");
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-3">
        <button type="button" onClick={onClose} className="press text-muted-foreground text-sm">
          Cancel
        </button>
        <h2 className="flex-1 text-center font-semibold text-sm">Add Exercise</h2>
        <div className="w-14" />
      </div>

      {/* Configure panel — shown after selecting an exercise */}
      {configuring ? (
        <div className="flex-1 px-4 space-y-5 pt-4">
          <p className="text-xl font-bold">{configuring}</p>

          <div className="space-y-3">
            {[
              { label: "Sets",      value: sets,   setter: setSets,  placeholder: "3" },
              { label: "Reps",      value: reps,   setter: setReps,  placeholder: "8" },
              { label: "Rest (sec)",value: rest,   setter: setRest,  placeholder: "90" },
            ].map(({ label, value, setter, placeholder }) => (
              <div key={label} className="flex items-center justify-between glass rounded-2xl px-4 py-3">
                <span className="text-sm font-medium">{label}</span>
                <input
                  type={label === "Reps" ? "text" : "number"}
                  inputMode={label === "Reps" ? "text" : "numeric"}
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  placeholder={placeholder}
                  className="w-24 text-right bg-transparent text-sm font-semibold tabular-nums outline-none"
                />
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Reps can be a number, range (e.g. 8-12), or AMRAP.
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setConfiguring(null)}
              className="flex-1 py-3 rounded-2xl bg-foreground/5 text-sm font-semibold press"
            >
              Back
            </button>
            <button
              type="button"
              onClick={confirmAdd}
              className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold press"
            >
              Add Exercise
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="px-4 pb-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search exercises…"
              className="w-full bg-foreground/5 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-primary/50"
              autoFocus
            />
          </div>

          {/* Category chips */}
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
            {["All", ...EXERCISE_CATEGORIES].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap press transition-all ${
                  category === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-foreground/5 text-muted-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Exercise list */}
          <div className="flex-1 overflow-y-auto px-4 space-y-1 pb-8">
            {filtered.map((ex) => (
              <button
                key={ex.name}
                type="button"
                onClick={() => startConfig(ex.name)}
                className="w-full text-left flex items-center justify-between px-4 py-3 glass rounded-2xl press"
              >
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

// ── Page ──────────────────────────────────────────────────────────────────

export default function BuilderPage() {
  const router = useRouter();
  const [planName, setPlanName]   = useState("My Plan");
  const [days,     setDays]       = useState<DraftDay[]>(() =>
    Array.from({ length: 7 }, (_, i) => makeDraftDay(i)),
  );
  const [activeDow,    setActiveDow]    = useState(1); // currently editing
  const [showPicker,   setShowPicker]   = useState(false);
  const [editingEx,    setEditingEx]    = useState<{ dow: number; key: string } | null>(null);
  const [pending,      startTransition] = useTransition();

  const activeDay = days[activeDow];

  function toggleRest(dow: number) {
    setDays((prev) => prev.map((d, i) =>
      i === dow ? { ...d, isRest: !d.isRest, exercises: [] } : d,
    ));
  }

  function renameDay(dow: number, name: string) {
    setDays((prev) => prev.map((d, i) => i === dow ? { ...d, name } : d));
  }

  function addExercise(dow: number, ex: ExerciseConfig) {
    setDays((prev) => prev.map((d, i) =>
      i === dow
        ? { ...d, exercises: [...d.exercises, { ...ex, _key: `${ex.name}-${Date.now()}` }] }
        : d,
    ));
    setShowPicker(false);
  }

  function removeExercise(dow: number, key: string) {
    setDays((prev) => prev.map((d, i) =>
      i === dow ? { ...d, exercises: d.exercises.filter((e) => e._key !== key) } : d,
    ));
  }

  function moveExercise(dow: number, key: string, dir: -1 | 1) {
    setDays((prev) => prev.map((d, i) => {
      if (i !== dow) return d;
      const idx = d.exercises.findIndex((e) => e._key === key);
      if (idx < 0) return d;
      const next = [...d.exercises];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return d;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return { ...d, exercises: next };
    }));
  }

  function handleSave() {
    const programDays: ProgramDay[] = days.map((d) => ({
      dayOfWeek: d.dayOfWeek,
      name:      d.name,
      isRest:    d.isRest,
      exercises: d.exercises.map(({ _key: _k, ...ex }) => ex),
    }));
    startTransition(async () => {
      const { error } = await saveTrainingProgram(planName, programDays);
      if (!error) { router.push("/train"); router.refresh(); }
    });
  }

  return (
    <>
      {showPicker && (
        <ExercisePicker
          onAdd={(ex) => addExercise(activeDow, ex)}
          onClose={() => setShowPicker(false)}
        />
      )}

      <div className="space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Build Your Plan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure each day of the week.
          </p>
        </div>

        {/* Plan name */}
        <div className="glass widget-shadow rounded-2xl px-4 py-3 flex items-center gap-3">
          <span className="text-xs text-muted-foreground shrink-0">Plan name</span>
          <input
            type="text"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            className="flex-1 bg-transparent text-sm font-semibold outline-none text-right"
            maxLength={40}
          />
        </div>

        {/* Day selector */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, dow) => (
            <button
              key={dow}
              type="button"
              onClick={() => setActiveDow(dow)}
              className={`flex flex-col items-center gap-1 py-2 rounded-2xl press transition-all ${
                activeDow === dow ? "bg-primary text-primary-foreground" : "glass"
              }`}
            >
              <span className="text-[10px] font-semibold">{DOW_SHORT[dow]}</span>
              <div className={`w-1.5 h-1.5 rounded-full ${
                d.isRest
                  ? (activeDow === dow ? "bg-primary-foreground/30" : "bg-foreground/15")
                  : (activeDow === dow ? "bg-primary-foreground" : "bg-primary")
              }`} />
            </button>
          ))}
        </div>

        {/* Active day editor */}
        <div className="glass widget-shadow rounded-2xl overflow-hidden">
          {/* Day header */}
          <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
            <input
              type="text"
              value={activeDay.name}
              onChange={(e) => renameDay(activeDow, e.target.value)}
              className="flex-1 bg-transparent font-semibold text-sm outline-none"
              maxLength={24}
            />
            {/* Rest toggle */}
            <button
              type="button"
              onClick={() => toggleRest(activeDow)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold press transition-all ${
                activeDay.isRest
                  ? "bg-foreground/10 text-muted-foreground"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {activeDay.isRest ? "Rest day" : "Training"}
            </button>
          </div>

          {activeDay.isRest ? (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">
              Rest & recovery — no exercises.
            </p>
          ) : (
            <>
              {activeDay.exercises.length === 0 && (
                <p className="px-4 py-6 text-sm text-muted-foreground text-center">
                  No exercises yet. Tap below to add.
                </p>
              )}

              {activeDay.exercises.map((ex, idx) => (
                <div
                  key={ex._key}
                  className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ex.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {ex.sets} × {ex.reps}
                      {ex.restSeconds > 0 && ` · ${ex.restSeconds}s`}
                    </p>
                  </div>

                  {/* Reorder */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveExercise(activeDow, ex._key, -1)}
                      className="p-1 text-muted-foreground disabled:opacity-20 press"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
                    </button>
                    <button
                      type="button"
                      disabled={idx === activeDay.exercises.length - 1}
                      onClick={() => moveExercise(activeDow, ex._key, 1)}
                      className="p-1 text-muted-foreground disabled:opacity-20 press"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                    </button>
                  </div>

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => removeExercise(activeDow, ex._key)}
                    className="p-1.5 text-muted-foreground press rounded-lg"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}

              {/* Add exercise */}
              <button
                type="button"
                onClick={() => setShowPicker(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-primary text-sm font-semibold press border-t border-border"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Add Exercise
              </button>
            </>
          )}
        </div>

        {/* Save */}
        <button
          type="button"
          onClick={handleSave}
          disabled={pending || !planName.trim()}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm press disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save Plan →"}
        </button>
      </div>
    </>
  );
}
