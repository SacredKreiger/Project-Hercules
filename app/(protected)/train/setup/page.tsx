"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TEMPLATES } from "@/lib/templates";
import { saveTrainingProgramFromTemplate } from "@/lib/actions/training";

const TEMPLATE_ICONS: Record<string, string> = {
  runner:       "🏃",
  calisthenics: "🤸",
  bodybuilder:  "🏋️",
};

const FOCUS_COLORS: Record<string, string> = {
  "Endurance":           "text-sky-500",
  "Bodyweight Strength": "text-emerald-500",
  "Hypertrophy":         "text-violet-500",
};

export default function TrainSetupPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [pending,  startTransition] = useTransition();

  function handleSelect(id: string) {
    setSelected((prev) => prev === id ? null : id);
    setError(null);
  }

  function handleStart() {
    if (!selected) return;
    setError(null);
    startTransition(async () => {
      const result = await saveTrainingProgramFromTemplate(selected);
      if (result.error) {
        setError(result.error);
      } else {
        window.location.href = "/train";
      }
    });
  }

  const selectedTemplate = TEMPLATES.find((t) => t.id === selected);

  return (
    <div className="space-y-4">

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Choose a Plan</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Start with a template or build your own.
        </p>
      </div>

      {/* Template cards */}
      {TEMPLATES.map((t) => {
        const isSelected = selected === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => handleSelect(t.id)}
            className={`w-full text-left glass widget-shadow rounded-2xl overflow-hidden press transition-all ${
              isSelected ? "ring-2 ring-primary" : ""
            }`}
          >
            <div className="flex items-center gap-4 px-4 py-4">
              <div className="w-12 h-12 rounded-2xl bg-foreground/5 flex items-center justify-center text-2xl shrink-0">
                {TEMPLATE_ICONS[t.id]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{t.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.tagline}</p>
              </div>
              <span className={`text-xs font-semibold shrink-0 ${FOCUS_COLORS[t.focus] ?? "text-muted-foreground"}`}>
                {t.focus}
              </span>
            </div>

            {/* Day preview when selected */}
            {isSelected && (
              <div className="border-t border-border px-4 pb-4 pt-3 space-y-1.5">
                {t.days.map((day) => (
                  <div key={day.dayOfWeek} className="flex items-start gap-3">
                    <span className="text-xs text-muted-foreground w-6 shrink-0 pt-0.5">
                      {["Su","Mo","Tu","We","Th","Fr","Sa"][day.dayOfWeek]}
                    </span>
                    {day.isRest ? (
                      <span className="text-xs text-muted-foreground">Rest</span>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-medium">{day.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {day.exercises.length} exercise{day.exercises.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </button>
        );
      })}

      {/* Custom plan */}
      <button
        type="button"
        onClick={() => router.push("/train/builder")}
        className="w-full text-left glass widget-shadow rounded-2xl px-4 py-4 press flex items-center gap-4"
      >
        <div className="w-12 h-12 rounded-2xl bg-foreground/5 flex items-center justify-center text-2xl shrink-0">
          ✏️
        </div>
        <div>
          <p className="font-semibold">Custom Plan</p>
          <p className="text-xs text-muted-foreground mt-0.5">Build your own week from scratch</p>
        </div>
      </button>

      {/* Error */}
      {error && (
        <div className="glass rounded-2xl px-4 py-3 border border-red-500/30">
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}

      {/* Start button */}
      {selected && (
        <button
          type="button"
          onClick={handleStart}
          disabled={pending}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm press disabled:opacity-60"
        >
          {pending ? "Starting…" : `Start ${selectedTemplate?.name} →`}
        </button>
      )}
    </div>
  );
}
