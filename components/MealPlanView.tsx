"use client";

import { useState } from "react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SLOT_LABEL: Record<number, string> = { 1: "Breakfast", 2: "Lunch", 3: "Dinner", 4: "Snack" };

type Ingredient = { name: string; qty: number; unit: string };

type Recipe = {
  id: string;
  name: string;
  description?: string;
  cuisine: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  prep_time_min?: number;
  cook_time_min?: number;
  ingredients: Ingredient[];
  instructions?: string;
};

type MealEntry = {
  id: string;
  day_of_week: number;
  meal_slot: number;
  recipes: Recipe;
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
                    className="w-full flex items-center justify-between px-4 py-3 text-left press hover:bg-white/5 transition-colors"
                  >
                    <div>
                      <p className="text-xs text-muted-foreground">{SLOT_LABEL[entry.meal_slot]}</p>
                      <p className="text-sm font-medium mt-0.5">{entry.recipes?.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{entry.recipes?.cuisine}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-semibold">{entry.recipes?.calories} kcal</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.recipes?.protein_g}g P · {entry.recipes?.carbs_g}g C
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
        <div
          className="fixed inset-0 z-50 flex items-end"
          onClick={() => setSelected(null)}
        >
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
              <div>
                <p className="text-xs text-muted-foreground capitalize">
                  {SLOT_LABEL[selected.meal_slot]} · {selected.recipes.cuisine}
                </p>
                <h2 className="text-lg font-bold mt-0.5">{selected.recipes.name}</h2>
                {selected.recipes.description && (
                  <p className="text-sm text-muted-foreground mt-1">{selected.recipes.description}</p>
                )}
              </div>
              <button
                onClick={() => setSelected(null)}
                className="shrink-0 text-muted-foreground hover:text-foreground press p-1"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Macros row */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: "Calories", value: `${selected.recipes.calories}` },
                { label: "Protein", value: `${selected.recipes.protein_g}g` },
                { label: "Carbs", value: `${selected.recipes.carbs_g}g` },
                { label: "Fat", value: `${selected.recipes.fat_g}g` },
              ].map(({ label, value }) => (
                <div key={label} className="glass rounded-2xl p-3 text-center">
                  <p className="text-sm font-bold">{value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Time */}
            {(selected.recipes.prep_time_min || selected.recipes.cook_time_min) && (
              <div className="flex gap-3 text-xs text-muted-foreground">
                {selected.recipes.prep_time_min && (
                  <span>Prep: {selected.recipes.prep_time_min} min</span>
                )}
                {selected.recipes.cook_time_min && (
                  <span>Cook: {selected.recipes.cook_time_min} min</span>
                )}
              </div>
            )}

            {/* Ingredients */}
            {selected.recipes.ingredients?.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Ingredients</p>
                <ul className="space-y-1">
                  {selected.recipes.ingredients.map((ing, i) => (
                    <li key={i} className="flex items-baseline justify-between text-sm">
                      <span className="text-foreground">{ing.name}</span>
                      <span className="text-muted-foreground ml-2 shrink-0">
                        {ing.qty} {ing.unit}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Instructions */}
            {selected.recipes.instructions && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Instructions</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selected.recipes.instructions}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
