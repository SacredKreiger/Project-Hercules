"use client";

import { useState, useTransition } from "react";
import { logFood } from "@/lib/actions/food-log";
import type { FoodResult, MealSlot } from "@/lib/types/food";
import { SLOT_LABELS } from "@/lib/types/food";

interface Props {
  food: FoodResult;
  mealSlot: MealSlot;
  date: string;
  onLogged: () => void;
  onBack: () => void;
}

export default function ServingPickerSheet({ food, mealSlot, date, onLogged, onBack }: Props) {
  const [servings, setServings] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const cal   = Math.round(food.calories  * servings);
  const prot  = Math.round(food.protein_g * servings * 10) / 10;
  const carbs = Math.round(food.carbs_g   * servings * 10) / 10;
  const fat   = Math.round(food.fat_g     * servings * 10) / 10;

  function adjust(delta: number) {
    setServings((s) => Math.max(0.25, Math.round((s + delta) * 4) / 4));
  }

  function handleLog() {
    setError("");
    startTransition(async () => {
      const { error } = await logFood({ date, mealSlot, food, servings });
      if (error) { setError(error); return; }
      onLogged();
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-border/50">
        <button type="button" onClick={onBack} className="p-1.5 press text-muted-foreground">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight truncate">{food.name}</p>
          {food.brand && <p className="text-xs text-muted-foreground truncate">{food.brand}</p>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
        {/* Serving size control */}
        <div className="glass widget-shadow rounded-2xl p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Serving Size</p>
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => adjust(-0.25)}
              disabled={servings <= 0.25}
              className="w-10 h-10 rounded-full bg-foreground/8 flex items-center justify-center text-lg font-bold press disabled:opacity-30"
            >−</button>

            <div className="flex-1 text-center">
              <p className="text-3xl font-bold tabular-nums">
                {servings % 1 === 0 ? servings : servings.toFixed(2).replace(/0+$/, "")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{food.serving_unit}</p>
            </div>

            <button
              type="button"
              onClick={() => adjust(0.25)}
              className="w-10 h-10 rounded-full bg-foreground/8 flex items-center justify-center text-lg font-bold press"
            >+</button>
          </div>
        </div>

        {/* Macro preview */}
        <div className="glass widget-shadow rounded-2xl p-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Nutrition</p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Calories", value: String(cal),  sub: "kcal", color: "text-primary" },
              { label: "Protein",  value: String(prot), sub: "g",    color: "text-blue-400" },
              { label: "Carbs",    value: String(carbs),sub: "g",    color: "text-amber-400" },
              { label: "Fat",      value: String(fat),  sub: "g",    color: "text-rose-400" },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="bg-foreground/5 rounded-xl p-2.5 text-center">
                <p className={`text-sm font-bold leading-none ${color}`}>
                  {value}<span className="text-[10px] font-normal text-muted-foreground ml-0.5">{sub}</span>
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
          {(food.fiber_g != null || food.sodium_mg != null) && (
            <div className="flex gap-4 mt-3 pt-3 border-t border-border/40">
              {food.fiber_g != null && (
                <p className="text-xs text-muted-foreground">Fiber <span className="font-semibold text-foreground">{Math.round(food.fiber_g * servings * 10) / 10}g</span></p>
              )}
              {food.sodium_mg != null && (
                <p className="text-xs text-muted-foreground">Sodium <span className="font-semibold text-foreground">{Math.round(food.sodium_mg * servings)}mg</span></p>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-rose-400 text-center">{error}</p>}
      </div>

      {/* CTA */}
      <div className="px-5 pb-8 pt-3 border-t border-border/30">
        <button
          type="button"
          onClick={handleLog}
          disabled={isPending}
          className="w-full py-3.5 bg-primary text-primary-foreground font-bold rounded-full press disabled:opacity-50 text-sm"
        >
          {isPending ? "Logging..." : `Log to ${SLOT_LABELS[mealSlot]}`}
        </button>
      </div>
    </div>
  );
}
