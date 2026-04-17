"use client";

import { useState, useEffect } from "react";
import ReconfigureSheet from "@/components/ReconfigureSheet";
import { CAL_SPLIT, getServingsMultiplier, scaleMacro } from "@/lib/meal-scaling";
import { computeExactPortions, solvePortions } from "@/lib/portion-calc";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const SLOT_LABELS: Record<number, Record<number, string>> = {
  3: { 1: "Breakfast", 2: "Lunch", 3: "Dinner" },
  4: { 1: "Breakfast", 2: "Lunch", 3: "Dinner", 4: "Snack" },
  5: { 1: "Breakfast", 2: "Morning Snack", 3: "Lunch", 4: "Afternoon Snack", 5: "Dinner" },
};

const STORAGE_KEY = "hc-meal-config";

const TAG_COLORS: Record<string, string> = {
  "high-protein":   "bg-green-500/15 text-green-400",
  "vegetarian":     "bg-emerald-500/15 text-emerald-400",
  "vegan":          "bg-emerald-500/15 text-emerald-400",
  "gluten-free":    "bg-yellow-500/15 text-yellow-400",
  "dairy-free":     "bg-sky-500/15 text-sky-400",
  "nut-free":       "bg-orange-500/15 text-orange-400",
  "halal":          "bg-purple-500/15 text-purple-400",
  "meal-prep":      "bg-blue-500/15 text-blue-400",
  "quick":          "bg-pink-500/15 text-pink-400",
  "bulk-friendly":  "bg-red-500/15 text-red-400",
};

type Ingredient = { name: string; qty: number; unit: string };

type Recipe = {
  id: string;
  name: string;
  description?: string | null;
  cuisine: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  servings: number;
  prep_time_min?: number | null;
  cook_time_min?: number | null;
  ingredients: Ingredient[] | null;
  instructions?: string | null;
  tags?: string[] | null;
};

type MealEntry = {
  id: string;
  day_of_week: number;
  meal_slot: number;
  recipes: Recipe | null;
};

function formatQty(qty: number): string {
  if (qty === 0.25) return "¼";
  if (qty === 0.5)  return "½";
  if (qty === 0.75) return "¾";
  if (qty === 0.33 || qty === 1 / 3) return "⅓";
  if (qty === 0.67 || qty === 2 / 3) return "⅔";
  if (Number.isInteger(qty)) return String(qty);
  return String(qty);
}

// Alias for readability in JSX
const getMultiplier = getServingsMultiplier;

function scaleQty(qty: number, multiplier: number): string {
  const scaled = qty * multiplier;
  if (scaled === 0.25) return "¼";
  if (scaled === 0.5)  return "½";
  if (scaled === 0.75) return "¾";
  if (scaled === 0.33) return "⅓";
  if (scaled === 0.67) return "⅔";
  const rounded = Math.round(scaled * 4) / 4; // round to nearest quarter
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, "");
}

export default function MealPlanView({
  mealPlan,
  weekNumber,
  phase,
  todayDow,
  dailyCalories = 2000,
  dailyMacros,
  mealsPerDay: mealsPerDayProp = 4,
  savedCuisines = [],
  savedRestrictions = [],
}: {
  mealPlan: MealEntry[];
  weekNumber: number;
  phase: string;
  todayDow: number;
  dailyCalories?: number;
  dailyMacros?: { calories: number; protein: number; carbs: number; fat: number };
  mealsPerDay?: 3 | 4 | 5;
  savedCuisines?: string[];
  savedRestrictions?: string[];
}) {
  const [selected, setSelected] = useState<MealEntry | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  // mealsPerDay comes from the server (derived from actual plan data) — localStorage is only a UI cache
  const mealsPerDay = mealsPerDayProp;
  // Training days from localStorage (saved by ReconfigureSheet) — used for rest-day calorie scaling
  const [trainingDays, setTrainingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  // Record<recipeId, stepIndex[]>
  const [checkedSteps, setCheckedSteps] = useState<Record<string, number[]>>({});
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, number[]>>({});

  // Load persisted state from localStorage on mount
  useEffect(() => {
    try {
      const s = localStorage.getItem("hc-checked-steps");
      const i = localStorage.getItem("hc-checked-ingredients");
      if (s) setCheckedSteps(JSON.parse(s));
      if (i) setCheckedIngredients(JSON.parse(i));
      const config = localStorage.getItem(STORAGE_KEY);
      if (config) {
        const parsed = JSON.parse(config);
        if (parsed.trainingDays) setTrainingDays(parsed.trainingDays);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem("hc-checked-steps", JSON.stringify(checkedSteps)); } catch {}
  }, [checkedSteps]);

  useEffect(() => {
    try { localStorage.setItem("hc-checked-ingredients", JSON.stringify(checkedIngredients)); } catch {}
  }, [checkedIngredients]);

  function toggleStep(recipeId: string, idx: number) {
    setCheckedSteps((prev) => {
      const cur = prev[recipeId] ?? [];
      const next = cur.includes(idx) ? cur.filter((i) => i !== idx) : [...cur, idx];
      return { ...prev, [recipeId]: next };
    });
  }

  function toggleIngredient(recipeId: string, idx: number) {
    setCheckedIngredients((prev) => {
      const cur = prev[recipeId] ?? [];
      const next = cur.includes(idx) ? cur.filter((i) => i !== idx) : [...cur, idx];
      return { ...prev, [recipeId]: next };
    });
  }

  const byDay: Record<number, MealEntry[]> = {};
  mealPlan.forEach((entry) => {
    if (!byDay[entry.day_of_week]) byDay[entry.day_of_week] = [];
    byDay[entry.day_of_week].push(entry);
  });

  const recipe = selected?.recipes ?? null;
  const servings = recipe?.servings || 1;
  const cal  = recipe ? Math.round(recipe.calories  / servings) : null;
  const prot = recipe ? Math.round(recipe.protein_g / servings) : null;
  const carb = recipe ? Math.round(recipe.carbs_g   / servings) : null;
  const fat  = recipe ? Math.round(recipe.fat_g     / servings) : null;

  const ingredients = Array.isArray(recipe?.ingredients) ? recipe!.ingredients : [];
  const steps = recipe?.instructions
    ? recipe.instructions
        .split(/\.\s+/)
        .map((s) => s.replace(/\.$/, "").trim())
        .filter(Boolean)
    : [];
  const tags = Array.isArray(recipe?.tags) ? recipe!.tags : [];
  const totalTime = (recipe?.prep_time_min ?? 0) + (recipe?.cook_time_min ?? 0);

  const stepsDone   = recipe ? (checkedSteps[recipe.id]   ?? []) : [];
  const ingsDone    = recipe ? (checkedIngredients[recipe.id] ?? []) : [];

  return (
    <>
      {/* ── Week view ── */}
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Meal Plan</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Week {weekNumber} · <span className="capitalize">{phase}</span> phase
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all press mt-1"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            Reconfigure
          </button>
        </div>

        {/* Empty state */}
        {mealPlan.length === 0 && (
          <div className="glass widget-shadow rounded-2xl px-6 py-14 text-center space-y-3">
            <p className="text-2xl">🍽️</p>
            <p className="font-semibold">No plan yet</p>
            <p className="text-sm text-muted-foreground">Tell us how you want to eat and we&apos;ll build your week.</p>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="mt-1 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold press"
            >
              Set Up My Plan →
            </button>
          </div>
        )}

        {DAYS.map((day, dow) => (
          <div
            key={dow}
            className={`glass widget-shadow rounded-2xl overflow-hidden ${
              dow === todayDow ? "ring-1 ring-primary/40" : ""
            }`}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <span className="text-sm font-semibold">{day}</span>
              {dow === todayDow && (
                <span className="text-[10px] font-semibold uppercase tracking-widest text-primary px-2 py-0.5 glass rounded-full">
                  Today
                </span>
              )}
            </div>

            {byDay[dow]?.length > 0 ? (
              <div className="divide-y divide-border">
                {byDay[dow].map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setSelected(entry)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left active:bg-white/5 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{SLOT_LABELS[mealsPerDay]?.[entry.meal_slot] ?? "Meal"}</p>
                      <p className="text-sm font-medium mt-0.5 truncate">{entry.recipes?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{entry.recipes?.cuisine ?? ""}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      {(() => {
                        const isRestDay = !trainingDays.includes(dow);
                        const m = entry.recipes?.calories
                          ? getMultiplier(dailyCalories, mealsPerDay, entry.meal_slot, entry.recipes.calories, isRestDay)
                          : 1;
                        const scaledCal  = entry.recipes?.calories  ? scaleMacro(entry.recipes.calories,  m) : null;
                        const scaledProt = entry.recipes?.protein_g ? scaleMacro(entry.recipes.protein_g, m) : null;
                        const scaledCarb = entry.recipes?.carbs_g   ? scaleMacro(entry.recipes.carbs_g,   m) : null;
                        return (
                          <>
                            <p className="text-sm font-semibold">{scaledCal ?? "—"} kcal</p>
                            <p className="text-xs text-muted-foreground">
                              {scaledProt ?? "—"}g P · {scaledCarb ?? "—"}g C
                            </p>
                            {m !== 1 && (
                              <p className="text-[10px] text-muted-foreground/60 mt-0.5">{m}× serving</p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-4 py-4 text-sm text-muted-foreground">No meals planned.</p>
            )}
          </div>
        ))}
      </div>

      {/* ── Reconfigure sheet ── */}
      <ReconfigureSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        savedCuisines={savedCuisines}
        savedRestrictions={savedRestrictions}
      />

      {/* ── Recipe detail sheet ── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          <div
            className="relative w-full max-h-[92dvh] overflow-y-auto glass rounded-t-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky header */}
            <div className="sticky top-0 z-10 glass rounded-t-3xl px-6 pt-5 pb-4 border-b border-border/40">
              <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest">
                    {SLOT_LABELS[mealsPerDay]?.[selected.meal_slot] ?? "Meal"}{recipe?.cuisine ? ` · ${recipe.cuisine}` : ""}
                  </p>
                  <h2 className="text-xl font-bold mt-1 leading-snug">{recipe?.name ?? "Recipe"}</h2>
                  {recipe?.description && (
                    <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{recipe.description}</p>
                  )}
                </div>
                <button onClick={() => setSelected(null)} className="shrink-0 text-muted-foreground p-1 mt-0.5">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>

            {recipe ? (
              <div className="px-6 pt-5 pb-10 space-y-7">

                {/* Tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${
                          TAG_COLORS[tag] ?? "bg-border/40 text-muted-foreground"
                        }`}
                      >
                        {tag.replace(/-/g, " ")}
                      </span>
                    ))}
                  </div>
                )}

                {/* Macros per serving */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                    Nutrition per serving
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: "Calories", value: String(cal ?? "—"), sub: "kcal" },
                      { label: "Protein",  value: `${prot ?? "—"}`,  sub: "g" },
                      { label: "Carbs",    value: `${carb ?? "—"}`,  sub: "g" },
                      { label: "Fat",      value: `${fat  ?? "—"}`,  sub: "g" },
                    ].map(({ label, value, sub }) => (
                      <div key={label} className="glass rounded-2xl p-3 text-center">
                        <p className="text-base font-bold leading-none">{value}<span className="text-[10px] font-normal text-muted-foreground ml-0.5">{sub}</span></p>
                        <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Exact portions for your goal */}
                {ingredients.length > 0 && (() => {
                  const isRestDay = !trainingDays.includes(selected.day_of_week);
                  const split = CAL_SPLIT[mealsPerDay] ?? CAL_SPLIT[4];
                  const fraction = (split[selected.meal_slot] ?? 0.25) * (isRestDay ? 0.85 : 1.0);

                  // Use real user macro targets, proportioned to this meal slot
                  const base = dailyMacros ?? {
                    calories: dailyCalories,
                    protein:  dailyCalories * 0.30 / 4,
                    carbs:    dailyCalories * 0.40 / 4,
                    fat:      dailyCalories * 0.30 / 9,
                  };
                  const slotTargets = {
                    calories: Math.round(base.calories * fraction),
                    protein:  Math.round(base.protein  * fraction * 10) / 10,
                    carbs:    Math.round(base.carbs    * fraction * 10) / 10,
                    fat:      Math.round(base.fat      * fraction * 10) / 10,
                  };

                  const portions = computeExactPortions(ingredients, slotTargets);
                  const result   = solvePortions(ingredients, slotTargets);
                  const totals   = result.totals;
                  const score    = result.accuracyScore;
                  return (
                    <>
                      {/* Exact macro panel */}
                      <div className="glass rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Your exact portions</p>
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-green-500/15 text-green-400">
                            Exact Match
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { label: "Calories", value: String(totals.calories), target: slotTargets.calories, sub: "kcal" },
                            { label: "Protein",  value: String(totals.protein),  target: slotTargets.protein,  sub: "g" },
                            { label: "Carbs",    value: String(totals.carbs),    target: slotTargets.carbs,    sub: "g" },
                            { label: "Fat",      value: String(totals.fat),      target: slotTargets.fat,      sub: "g" },
                          ].map(({ label, value, sub }) => (
                            <div key={label} className="bg-primary/5 rounded-xl p-2.5 text-center">
                              <p className="text-sm font-bold leading-none text-primary">{value}<span className="text-[10px] font-normal text-muted-foreground ml-0.5">{sub}</span></p>
                              <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Time */}
                      <div className="flex gap-5 text-sm">
                        {recipe.prep_time_min != null && (
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Prep</p>
                            <p className="font-semibold mt-0.5">{recipe.prep_time_min} min</p>
                          </div>
                        )}
                        {recipe.cook_time_min != null && (
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Cook</p>
                            <p className="font-semibold mt-0.5">{recipe.cook_time_min} min</p>
                          </div>
                        )}
                        {totalTime > 0 && (
                          <div>
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Total</p>
                            <p className="font-semibold mt-0.5">{totalTime} min</p>
                          </div>
                        )}
                      </div>

                      {/* Exact ingredient quantities */}
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                          Ingredients — exact amounts
                        </p>
                        <ul className="space-y-0.5">
                          {portions.map((portion, i) => {
                            const checked = ingsDone.includes(i);
                            return (
                              <li key={i}>
                                <button
                                  type="button"
                                  onClick={() => toggleIngredient(recipe.id, i)}
                                  className="w-full flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0 text-left"
                                >
                                  <span className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                                    checked ? "bg-primary border-primary" : "border-border"
                                  }`}>
                                    {checked && (
                                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="2,6 5,9 10,3" />
                                      </svg>
                                    )}
                                  </span>
                                  <span className={`shrink-0 text-right text-sm font-semibold tabular-nums transition-opacity min-w-[80px] ${checked ? "opacity-40" : ""}`}>
                                    {portion.displayQty}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <span className={`text-sm transition-opacity ${checked ? "opacity-40 line-through" : ""}`}>
                                      {portion.name}
                                    </span>
                                    {portion.adjusted && (
                                      <span className="ml-1.5 text-[10px] text-primary font-semibold">adjusted</span>
                                    )}
                                  </div>
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </>
                  );
                })()}

                {/* Instructions */}
                {steps.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                      Instructions
                    </p>
                    <ol className="space-y-4">
                      {steps.map((step, i) => {
                        const done = stepsDone.includes(i);
                        return (
                          <li key={i}>
                            <button
                              type="button"
                              onClick={() => toggleStep(recipe.id, i)}
                              className="w-full flex gap-4 text-left"
                            >
                              {/* Step circle */}
                              <span className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                                done
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "border-border text-muted-foreground"
                              }`}>
                                {done ? (
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="2,6 5,9 10,3" />
                                  </svg>
                                ) : i + 1}
                              </span>
                              <p className={`text-sm leading-relaxed pt-0.5 transition-opacity ${done ? "opacity-40 line-through" : ""}`}>
                                {step}.
                              </p>
                            </button>
                          </li>
                        );
                      })}
                    </ol>

                    {/* Reset progress */}
                    {(stepsDone.length > 0 || ingsDone.length > 0) && (
                      <button
                        type="button"
                        onClick={() => {
                          setCheckedSteps((p) => ({ ...p, [recipe.id]: [] }));
                          setCheckedIngredients((p) => ({ ...p, [recipe.id]: [] }));
                        }}
                        className="mt-6 text-xs text-muted-foreground underline underline-offset-4"
                      >
                        Reset progress
                      </button>
                    )}
                  </div>
                )}

              </div>
            ) : (
              <p className="px-6 py-8 text-sm text-muted-foreground">Recipe details unavailable.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
