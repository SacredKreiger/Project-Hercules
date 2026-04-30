"use client";

import { useState, useTransition, useEffect } from "react";
import { reconfigureMealPlan } from "@/lib/actions/meal-plan";
import { isRedirectError } from "next/dist/client/components/redirect-error";

const CUISINES = [
  "American", "Caribbean", "Chinese", "Indian", "Italian",
  "Japanese", "Korean", "Mediterranean", "Mexican", "Middle Eastern",
  "Thai", "West African",
];

const RESTRICTIONS = [
  { value: "vegetarian",  label: "Vegetarian" },
  { value: "vegan",       label: "Vegan" },
  { value: "gluten-free", label: "Gluten-Free" },
  { value: "dairy-free",  label: "Dairy-Free" },
  { value: "nut-free",    label: "Nut-Free" },
  { value: "halal",       label: "Halal" },
];

const PREP_STYLES = [
  {
    value: "daily",
    icon: "🍳",
    label: "Daily Fresh",
    desc: "Something new every day. Cook as you go.",
  },
  {
    value: "batch_weekly",
    icon: "📦",
    label: "Weekly Batch",
    desc: "Cook once on Sunday. Meals repeat all week.",
  },
  {
    value: "batch_biweekly",
    icon: "🔄",
    label: "Twice a Week",
    desc: "Cook Sunday & Wednesday. Max freshness, more variety.",
  },
];

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const STORAGE_KEY = "hc-meal-config";

type Config = {
  mode: "auto" | "custom";
  mealsPerDay: 3 | 4 | 5;
  prepStyle: "daily" | "batch_weekly" | "batch_biweekly" | "repeat_daily";
  mixAll: boolean;
  cuisines: string[];
  restrictions: string[];
  cheatDay: number | null;
};

const DEFAULT_CONFIG: Config = {
  mode: "auto",
  mealsPerDay: 4,
  prepStyle: "daily",
  mixAll: false,
  cuisines: [],
  restrictions: [],
  cheatDay: null,
};

export default function ReconfigureSheet({
  open,
  onClose,
  savedCuisines,
  savedRestrictions,
  isFirstSetup,
}: {
  open: boolean;
  onClose: () => void;
  savedCuisines: string[];
  savedRestrictions: string[];
  isFirstSetup?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [mode, setMode]             = useState<"auto" | "custom">(DEFAULT_CONFIG.mode);
  const [mealsPerDay, setMealsPerDay] = useState<3 | 4 | 5>(DEFAULT_CONFIG.mealsPerDay);
  const [prepStyle, setPrepStyle]   = useState<Config["prepStyle"]>(DEFAULT_CONFIG.prepStyle);
  const [mixAll, setMixAll]         = useState(false);
  const [cheatDay, setCheatDay]     = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [cuisines, setCuisines]     = useState<Set<string>>(new Set(savedCuisines));
  const [restrictions, setRestrictions] = useState<Set<string>>(new Set(savedRestrictions));

  // Load persisted config from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved: Config = JSON.parse(raw);
        setMode(saved.mode ?? "auto");
        setMealsPerDay(saved.mealsPerDay ?? DEFAULT_CONFIG.mealsPerDay);
        setPrepStyle(saved.prepStyle ?? DEFAULT_CONFIG.prepStyle);
        setMixAll(saved.mixAll ?? false);
        const savedCheatDay = saved.cheatDay ?? null;
        setCheatDay(savedCheatDay);
        if (saved.prepStyle === "repeat_daily" || savedCheatDay !== null) setShowAdvanced(true);
        if (saved.cuisines?.length) setCuisines(new Set(saved.cuisines));
        if (saved.restrictions?.length) setRestrictions(new Set(saved.restrictions));
      } else if (savedCuisines.length) {
        setCuisines(new Set(savedCuisines));
        setRestrictions(new Set(savedRestrictions));
      }
    } catch {}
  }, []);

  function toggleCuisine(c: string) {
    setCuisines((prev) => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });
  }

  function toggleRestriction(r: string) {
    setRestrictions((prev) => {
      const next = new Set(prev);
      next.has(r) ? next.delete(r) : next.add(r);
      return next;
    });
  }

  function handleSave() {
    if (mode === "auto" && !mixAll && cuisines.size === 0) {
      setError("Pick at least one cuisine or use Mix it up.");
      return;
    }
    setError(null);

    // Persist to localStorage
    const config: Config = {
      mode, mealsPerDay, prepStyle,
      mixAll, cuisines: [...cuisines], restrictions: [...restrictions],
      cheatDay,
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(config)); } catch {}

    // Custom mode: just save settings and close — user picks meals themselves
    if (mode === "custom") {
      onClose();
      return;
    }

    // Auto mode: generate the full plan
    const fd = new FormData();
    fd.append("meals_per_day", String(mealsPerDay));
    fd.append("prep_style", prepStyle);
    if (mixAll) {
      fd.append("mix", "true");
    } else {
      cuisines.forEach((c) => fd.append("cuisines", c));
    }
    restrictions.forEach((r) => fd.append("restrictions", r));
    fd.append("cheat_day", cheatDay !== null ? String(cheatDay) : "none");

    startTransition(async () => {
      try {
        const result = await reconfigureMealPlan(fd);
        if (result?.error) setError(result.error);
      } catch (err: unknown) {
        if (isRedirectError(err)) throw err;
        setError("Something went wrong. Please try again.");
      }
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative w-full max-h-[94dvh] overflow-y-auto glass rounded-t-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle + header */}
        <div className="sticky top-0 z-10 glass rounded-t-3xl px-6 pt-5 pb-4 border-b border-border/40">
          <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">
                {isFirstSetup ? "Set Up Your Plan" : "Reconfigure Your Plan"}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                We&apos;ll handle the details. Just tell us how you want to eat.
              </p>
            </div>
            <button onClick={onClose} className="shrink-0 text-muted-foreground p-1 mt-0.5">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-6 pt-5 pb-10 space-y-8">

          {error && (
            <p className="text-sm text-destructive glass rounded-2xl px-4 py-3">{error}</p>
          )}

          {/* ── Auto / Custom ── */}
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">How do you want to manage meals?</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: "auto",   icon: "⚡", label: "Auto",   desc: "App builds and picks your meals." },
                { value: "custom", icon: "✏️", label: "Custom", desc: "You pick every meal yourself." },
              ] as const).map((opt) => {
                const active = mode === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMode(opt.value)}
                    className={`flex flex-col items-start gap-2 p-4 rounded-2xl border text-left transition-all press ${
                      active ? "border-primary bg-primary/10" : "border-border glass hover:border-foreground/20"
                    }`}
                  >
                    <span className="text-xl">{opt.icon}</span>
                    <div>
                      <p className={`text-sm font-semibold ${active ? "text-primary" : ""}`}>{opt.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Meals per Day (both modes) ── */}
          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Meals per Day</p>
              <p className="text-xs text-muted-foreground mt-0.5">Your daily calories split across each meal automatically.</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([3, 4, 5] as const).map((n) => {
                const labels = { 3: "Keep it simple", 4: "Recommended", 5: "High volume" };
                const active = mealsPerDay === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setMealsPerDay(n)}
                    className={`flex flex-col items-center py-3.5 rounded-2xl border transition-all press ${
                      active ? "border-primary bg-primary/10" : "border-border glass hover:border-foreground/20"
                    }`}
                  >
                    <span className={`text-xl font-bold ${active ? "text-primary" : ""}`}>{n}</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 text-center px-1">{labels[n]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Auto-only options ── */}
          {mode === "auto" && (
            <>
              {/* Prep Style */}
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Prep Style</p>
                  <p className="text-xs text-muted-foreground mt-0.5">How do you want to structure your cooking?</p>
                </div>
                <div className="space-y-2">
                  {PREP_STYLES.map((s) => {
                    const active = prepStyle === s.value;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setPrepStyle(s.value as Config["prepStyle"])}
                        className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all press ${
                          active ? "border-primary bg-primary/10" : "border-border glass hover:border-foreground/20"
                        }`}
                      >
                        <span className="text-2xl shrink-0">{s.icon}</span>
                        <div>
                          <p className={`text-sm font-semibold ${active ? "text-primary" : ""}`}>{s.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                        </div>
                        {active && (
                          <svg className="ml-auto shrink-0 text-primary" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cuisines */}
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Cuisines</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {mixAll ? "Pulling from all available cuisines." : "Your plan pulls from these cuisines only."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setMixAll((v) => !v); setCuisines(new Set()); }}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all press ${
                      mixAll ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-foreground/20"
                    }`}
                  >
                    Mix it up
                  </button>
                </div>
                {!mixAll && (
                  <div className="flex flex-wrap gap-2">
                    {CUISINES.map((c) => {
                      const active = cuisines.has(c);
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => toggleCuisine(c)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all press ${
                            active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-foreground/20"
                          }`}
                        >
                          {c}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Dietary Restrictions */}
              <div className="space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Dietary Restrictions</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Optional — we filter your recipes automatically.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {RESTRICTIONS.map(({ value, label }) => {
                    const active = restrictions.has(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggleRestriction(value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all press ${
                          active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-foreground/20"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── Advanced Options (both modes) ── */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border border-dashed border-border text-left press"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-muted-foreground">Advanced Options</span>
                {(prepStyle === "repeat_daily" || cheatDay !== null) && (
                  <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">Active</span>
                )}
              </div>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className={`text-muted-foreground transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>

            {showAdvanced && (
              <div className="space-y-6 pt-1">

                {/* Same Every Day (Auto only) */}
                {mode === "auto" && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground px-1">Repeat Style</p>
                    {(() => {
                      const active = prepStyle === "repeat_daily";
                      return (
                        <button
                          type="button"
                          onClick={() => setPrepStyle(active ? "daily" : "repeat_daily")}
                          className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all press ${
                            active ? "border-primary bg-primary/10" : "border-border glass hover:border-foreground/20"
                          }`}
                        >
                          <span className="text-2xl shrink-0">🔁</span>
                          <div>
                            <p className={`text-sm font-semibold ${active ? "text-primary" : ""}`}>Same Every Day</p>
                            <p className="text-xs text-muted-foreground mt-0.5">Pick your meals once. Eat the same thing all week.</p>
                          </div>
                          {active && (
                            <svg className="ml-auto shrink-0 text-primary" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </button>
                      );
                    })()}
                  </div>
                )}

                {/* Cheat Day (both modes) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Cheat Day</p>
                    {cheatDay !== null && (
                      <button type="button" onClick={() => setCheatDay(null)}
                        className="text-xs text-muted-foreground underline underline-offset-2 press">
                        Clear
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground px-1">One day a week — no meals, no tracking. Enjoy it.</p>
                  <div className="grid grid-cols-7 gap-1.5">
                    {DAY_LABELS.map((label, d) => {
                      const active = cheatDay === d;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setCheatDay(active ? null : d)}
                          className={`flex flex-col items-center py-2.5 rounded-xl border text-xs font-semibold transition-all press ${
                            active ? "border-rose-500 bg-rose-500 text-white" : "border-border glass text-muted-foreground hover:border-foreground/20"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {cheatDay !== null && (
                    <p className="text-xs text-muted-foreground px-1">
                      🍕 {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][cheatDay]} — free day.
                    </p>
                  )}
                </div>

              </div>
            )}
          </div>

          {/* ── CTA ── */}
          <button
            type="button"
            disabled={isPending || (mode === "auto" && !mixAll && cuisines.size === 0)}
            onClick={handleSave}
            className="w-full h-12 rounded-full bg-primary text-primary-foreground font-semibold text-sm press disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
          >
            {isPending ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                Building your plan…
              </>
            ) : mode === "auto" ? "Build My Plan →" : "Save Settings →"}
          </button>

        </div>
      </div>
    </div>
  );
}
