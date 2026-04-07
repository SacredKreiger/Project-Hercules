"use client";

import { useState } from "react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SLOT_LABEL: Record<number, string> = { 1: "Breakfast", 2: "Lunch", 3: "Dinner", 4: "Snack" };

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
  prep_time_min?: number | null;
  cook_time_min?: number | null;
  ingredients: Ingredient[] | null;
  instructions?: string | null;
};

type MealEntry = {
  id: string;
  day_of_week: number;
  meal_slot: number;
  recipes: Recipe | null;
};

export default function MealPlanView({
  mealPlan,
  weekNumber,
  phase,
  todayDow,
}: {
  mealPlan: MealEntry[];
  weekNumber: number;
  phase: string;
  todayDow: number;
}) {
  const [selected, setSelected] = useState<MealEntry | null>(null);

  const byDay: Record<number, MealEntry[]> = {};
  mealPlan.forEach((entry) => {
    if (!byDay[entry.day_of_week]) byDay[entry.day_of_week] = [];
    byDay[entry.day_of_week].push(entry);
  });

  const recipe = selected?.recipes ?? null;
  const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
  const steps = recipe?.instructions
    ? recipe.instructions
        .split(/\.\s+/)
        .map((s) => s.replace(/\.$/, "").trim())
        .filter(Boolean)
    : [];

  return (
    <>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meal Plan</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Week {weekNumber} · <span className="capitalize">{phase}</span> phase
          </p>
        </div>

        {DAYS.map((day, dow) => (
          <div
            key={dow}
            className={`glass widget-shadow rounded-2xl overflow-hidden transition-all ${
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
                    className="w-full flex items-center justify-between px-4 py-3 text-left press active:bg-white/5 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">{SLOT_LABEL[entry.meal_slot]}</p>
                      <p className="text-sm font-medium mt-0.5 truncate">{entry.recipes?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{entry.recipes?.cuisine ?? ""}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-semibold">{entry.recipes?.calories ?? "—"} kcal</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.recipes?.protein_g ?? "—"}g P · {entry.recipes?.carbs_g ?? "—"}g C
                      </p>
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

      {/* Recipe detail sheet */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setSelected(null)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Sheet */}
          <div
            className="relative w-full max-h-[85dvh] overflow-y-auto glass rounded-t-3xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div className="w-10 h-1 bg-border rounded-full mx-auto -mt-1 mb-1" />

            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground capitalize">
                  {SLOT_LABEL[selected.meal_slot]}{recipe?.cuisine ? ` · ${recipe.cuisine}` : ""}
                </p>
                <h2 className="text-lg font-bold mt-0.5">{recipe?.name ?? "Recipe"}</h2>
                {recipe?.description && (
                  <p className="text-sm text-muted-foreground mt-1">{recipe.description}</p>
                )}
              </div>
              <button
                onClick={() => setSelected(null)}
                className="shrink-0 text-muted-foreground press p-1"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {recipe ? (
              <>
                {/* Macros */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Calories", value: String(recipe.calories ?? "—") },
                    { label: "Protein",  value: `${recipe.protein_g ?? "—"}g` },
                    { label: "Carbs",    value: `${recipe.carbs_g ?? "—"}g` },
                    { label: "Fat",      value: `${recipe.fat_g ?? "—"}g` },
                  ].map(({ label, value }) => (
                    <div key={label} className="glass rounded-2xl p-3 text-center">
                      <p className="text-sm font-bold">{value}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Time */}
                {(recipe.prep_time_min || recipe.cook_time_min) && (
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    {recipe.prep_time_min && <span>Prep {recipe.prep_time_min} min</span>}
                    {recipe.cook_time_min && <span>Cook {recipe.cook_time_min} min</span>}
                  </div>
                )}

                {/* Ingredients */}
                {ingredients.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold tracking-wide uppercase text-xs text-muted-foreground">Ingredients</p>
                    <ul className="divide-y divide-border/50">
                      {ingredients.map((ing, i) => (
                        <li key={i} className="flex items-center gap-3 py-2.5">
                          <span className="shrink-0 min-w-[56px] text-right text-sm font-semibold tabular-nums">
                            {ing.qty % 1 === 0 ? ing.qty : ing.qty}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground w-10">{ing.unit}</span>
                          <span className="text-sm">{ing.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Instructions */}
                {steps.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold tracking-wide uppercase text-xs text-muted-foreground">Instructions</p>
                    <ol className="space-y-4">
                      {steps.map((step, i) => (
                        <li key={i} className="flex gap-3">
                          <span className="shrink-0 w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                            {i + 1}
                          </span>
                          <p className="text-sm leading-relaxed">{step}.</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Recipe details unavailable.</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
