"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TEMPLATES } from "@/lib/templates";
import { getExerciseInfo } from "@/lib/exercises";
import { saveTrainingSetup } from "@/lib/actions/training";

const ICONS: Record<string, string> = {
  runner: "🏃", calisthenics: "🤸", bodybuilder: "🏋️",
};
const FOCUS_COLORS: Record<string, string> = {
  "Endurance": "text-sky-500",
  "Bodyweight Strength": "text-emerald-500",
  "Hypertrophy": "text-violet-500",
};

export default function TrainSetupPage() {
  const router = useRouter();
  const [step,    setStep]    = useState<"select" | "prs">("select");
  const [selected, setSelected] = useState<string | null>(null);
  const [prs,     setPrs]     = useState<Record<string, string>>({});
  const [error,   setError]   = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const template = TEMPLATES.find((t) => t.id === selected);

  // Unique weighted exercises in the selected template
  const weightedExercises = useMemo(() => {
    if (!template) return [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const day of template.days) {
      for (const ex of day.exercises) {
        const info = getExerciseInfo(ex.name);
        if (info?.unit === "weight_reps" && !seen.has(ex.name)) {
          seen.add(ex.name);
          out.push(ex.name);
        }
      }
    }
    return out;
  }, [template]);

  function handleStart() {
    if (!template) return;
    setError(null);
    const parsedPrs: Record<string, number> = {};
    for (const [k, v] of Object.entries(prs)) {
      const n = parseFloat(v);
      if (n > 0) parsedPrs[k] = n;
    }
    startTransition(async () => {
      const result = await saveTrainingSetup({
        name: template.name,
        days: template.days,
        prs: parsedPrs,
      });
      if (result.error) { setError(result.error); }
      else { window.location.href = "/train"; }
    });
  }

  // ── Step 1: Choose template ───────────────────────────────────────────

  if (step === "select") return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Choose a Plan</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Pick a template or build your own.</p>
      </div>

      {TEMPLATES.map((t) => {
        const isSel = selected === t.id;
        return (
          <button key={t.id} type="button" onClick={() => setSelected(isSel ? null : t.id)}
            className={`w-full text-left glass widget-shadow rounded-2xl overflow-hidden press transition-all ${isSel ? "ring-2 ring-primary" : ""}`}
          >
            <div className="flex items-center gap-3 px-4 py-4">
              <div className="w-11 h-11 rounded-xl bg-foreground/5 flex items-center justify-center text-xl shrink-0">
                {ICONS[t.id]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.tagline}</p>
              </div>
              <span className={`text-xs font-semibold shrink-0 ${FOCUS_COLORS[t.focus] ?? "text-muted-foreground"}`}>
                {t.focus}
              </span>
            </div>

            {isSel && (
              <div className="border-t border-border px-4 pb-3 pt-2.5 space-y-1">
                {t.days.map((d) => (
                  <div key={d.dayOfWeek} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-5 shrink-0">
                      {["Su","Mo","Tu","We","Th","Fr","Sa"][d.dayOfWeek]}
                    </span>
                    <span className={`text-xs ${d.isRest ? "text-muted-foreground" : "font-medium"}`}>
                      {d.isRest ? "Rest" : d.name}
                    </span>
                    {!d.isRest && (
                      <span className="text-xs text-muted-foreground">
                        · {d.exercises.length} exercises
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </button>
        );
      })}

      <button type="button" onClick={() => router.push("/train/builder")}
        className="w-full text-left glass widget-shadow rounded-2xl px-4 py-4 press flex items-center gap-3"
      >
        <div className="w-11 h-11 rounded-xl bg-foreground/5 flex items-center justify-center text-xl shrink-0">✏️</div>
        <div>
          <p className="font-semibold text-sm">Custom Plan</p>
          <p className="text-xs text-muted-foreground mt-0.5">Build your own week from scratch</p>
        </div>
      </button>

      {selected && (
        <button type="button" onClick={() => setStep("prs")}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm press"
        >
          Next: Set Your PRs →
        </button>
      )}
    </div>
  );

  // ── Step 2: Enter PRs ─────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div>
        <button type="button" onClick={() => setStep("select")} className="text-xs text-muted-foreground press mb-3 flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Your PRs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Enter your 1-rep max for each lift. The app will calculate your starting weights automatically.
        </p>
      </div>

      <div className="glass widget-shadow rounded-2xl overflow-hidden divide-y divide-border">
        {weightedExercises.map((ex) => (
          <div key={ex} className="flex items-center gap-3 px-4 py-3.5">
            <span className="flex-1 text-sm font-medium truncate">{ex}</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <input
                type="number" inputMode="decimal"
                placeholder="0"
                value={prs[ex] ?? ""}
                onChange={(e) => setPrs((p) => ({ ...p, [ex]: e.target.value }))}
                className="w-20 bg-foreground/5 rounded-lg px-2 py-1.5 text-sm text-center tabular-nums outline-none focus:ring-1 focus:ring-primary/50"
              />
              <span className="text-xs text-muted-foreground w-5">lbs</span>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground px-1">
        Skip any lift you don&apos;t know — we&apos;ll start you at the bar.
      </p>

      {error && (
        <div className="glass rounded-2xl px-4 py-3 border border-red-500/30">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      <button type="button" onClick={handleStart} disabled={pending}
        className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm press disabled:opacity-60"
      >
        {pending ? "Starting…" : `Start ${template?.name} →`}
      </button>
    </div>
  );
}
