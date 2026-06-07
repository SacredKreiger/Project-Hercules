"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { saveMealPlan, type PlanSlots, type MealPlanRow } from "@/lib/actions/meal-plan";
import type { FoodResult, MealSlot } from "@/lib/types/food";
import { MEAL_SLOTS, SLOT_LABELS } from "@/lib/types/food";

const FoodSearchSheet = dynamic(() => import("@/components/FoodSearchSheet"), { ssr: false });

interface Props {
  existingPlan?: MealPlanRow;
  onClose: () => void;
  onSaved: () => void;
}

export default function MealPlanBuilderSheet({ existingPlan, onClose, onSaved }: Props) {
  const [name, setName] = useState(existingPlan?.name ?? "");
  const [slots, setSlots] = useState<PlanSlots>(existingPlan?.slots ?? {});
  const [pickingSlot, setPickingSlot] = useState<MealSlot | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleFoodSelected(slot: MealSlot, food: FoodResult) {
    setSlots((prev) => ({ ...prev, [slot]: food }));
    setPickingSlot(null);
  }

  function removeSlot(slot: MealSlot) {
    setSlots((prev) => {
      const next = { ...prev };
      delete next[slot];
      return next;
    });
  }

  async function handleSave() {
    setError("");
    if (!name.trim()) { setError("Plan name is required."); return; }
    const filledSlots = MEAL_SLOTS.filter((s) => slots[s] != null);
    if (filledSlots.length === 0) { setError("Add at least one meal to your plan."); return; }
    setSaving(true);
    const result = await saveMealPlan({ id: existingPlan?.id, name: name.trim(), slots });
    setSaving(false);
    if (result.error) { setError(result.error); return; }
    onSaved();
  }

  if (pickingSlot) {
    return (
      <FoodSearchSheet
        mealSlot={pickingSlot}
        date={new Date().toISOString().slice(0, 10)}
        onClose={() => setPickingSlot(null)}
        onLogged={() => setPickingSlot(null)}
        onSelect={(food) => handleFoodSelected(pickingSlot, food)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-safe pt-5 pb-3 border-b border-border/50 shrink-0">
        <button type="button" onClick={onClose} className="p-1.5 press text-muted-foreground">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <div className="flex-1">
          <p className="font-bold text-base leading-tight">
            {existingPlan ? "Edit Plan" : "New Meal Plan"}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pt-5 pb-4">
          {/* Plan name */}
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Plan Name</p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Cutting Phase, Bulk Week..."
            className="w-full bg-foreground/8 rounded-xl px-4 h-11 text-sm outline-none placeholder:text-muted-foreground/50 font-medium"
          />
        </div>

        <div className="px-5 pb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Meals</p>
          <div className="glass widget-shadow rounded-2xl overflow-hidden divide-y divide-border/40">
            {MEAL_SLOTS.map((slot) => {
              const food = slots[slot];
              return (
                <div key={slot} className="px-4 py-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    {SLOT_LABELS[slot]}
                  </p>
                  {food ? (
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate leading-snug">{food.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {food.serving_qty} {food.serving_unit}
                          {food.brand ? ` · ${food.brand}` : ""}
                        </p>
                      </div>
                      <span className="shrink-0 bg-primary/15 text-primary text-[11px] font-bold rounded-full px-2.5 py-1 tabular-nums">
                        {food.calories} kcal
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSlot(slot)}
                        className="shrink-0 p-1.5 press text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPickingSlot(slot)}
                      className="w-full flex items-center gap-2 border border-dashed border-border/60 rounded-xl px-3 py-2.5 text-muted-foreground/60 hover:text-muted-foreground hover:border-border transition-colors press"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14"/>
                      </svg>
                      <span className="text-xs font-medium">Add food</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mx-5 mb-4 px-4 py-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
            <p className="text-sm text-rose-400 font-medium">{error}</p>
          </div>
        )}
      </div>

      {/* Save button */}
      <div className="px-5 pb-safe pb-6 pt-3 border-t border-border/50 shrink-0">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-primary text-primary-foreground font-bold rounded-full py-3.5 text-sm press disabled:opacity-50 disabled:pointer-events-none"
        >
          {saving ? "Saving..." : "Save Plan"}
        </button>
      </div>
    </div>
  );
}
