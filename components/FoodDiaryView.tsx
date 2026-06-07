"use client";

import { useState, useOptimistic, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { deleteFoodLog } from "@/lib/actions/food-log";
import MacroProgressCard from "@/components/MacroProgressCard";
import type { FoodLogEntry, MacroTotals, MealSlot } from "@/lib/types/food";
import { MEAL_SLOTS, SLOT_LABELS } from "@/lib/types/food";

const FoodSearchSheet = dynamic(() => import("@/components/FoodSearchSheet"), { ssr: false });
const RecipeBuilderSheet = dynamic(() => import("@/components/RecipeBuilderSheet"), { ssr: false });
const MealPlansSheet = dynamic(() => import("@/components/MealPlansSheet"), { ssr: false });

interface Props {
  entries: FoodLogEntry[];
  totals: MacroTotals;
  targets: MacroTotals;
  date: string;
}

export default function FoodDiaryView({ entries, totals, targets, date }: Props) {
  const router = useRouter();
  const [activeSlot, setActiveSlot] = useState<MealSlot | null>(null);
  const [showRecipeBuilder, setShowRecipeBuilder] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!showMenu) return;
    function handleOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    }
    window.addEventListener("mousedown", handleOutside);
    return () => window.removeEventListener("mousedown", handleOutside);
  }, [showMenu]);

  const [optimisticEntries, removeOptimistic] = useOptimistic<FoodLogEntry[], string>(
    entries,
    (state, idToRemove) => state.filter((e) => e.id !== idToRemove)
  );

  const optimisticTotals = optimisticEntries.reduce<MacroTotals>(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein:  acc.protein  + e.protein_g,
      carbs:    acc.carbs    + e.carbs_g,
      fat:      acc.fat      + e.fat_g,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  function handleDelete(id: string) {
    startTransition(async () => {
      removeOptimistic(id);
      await deleteFoodLog(id);
      router.refresh();
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const isToday = date === today;

  const displayDate = isToday
    ? "Today"
    : new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">{displayDate}</p>
            <h1 className="text-xl font-bold tracking-tight mt-0.5">Food Diary</h1>
          </div>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowMenu((v) => !v)}
              className="w-8 h-8 flex items-center justify-center glass widget-shadow rounded-full press text-muted-foreground"
              aria-label="More options"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
              </svg>
            </button>
            {showMenu && (
              <div className="absolute right-0 top-10 z-40 glass widget-shadow rounded-xl overflow-hidden min-w-[160px]">
                <button
                  type="button"
                  onClick={() => { setShowMenu(false); setShowPlans(true); }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-foreground press active:bg-foreground/5 text-left"
                >
                  <span>📋</span> Meal Plans
                </button>
                <button
                  type="button"
                  onClick={() => { setShowMenu(false); setShowRecipeBuilder(true); }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-foreground press active:bg-foreground/5 text-left border-t border-border/40"
                >
                  <span>🍳</span> Build Recipe
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Macro progress */}
        <MacroProgressCard target={targets} consumed={optimisticTotals} />

        {/* Meal slots */}
        {MEAL_SLOTS.map((slot) => {
          const slotEntries = optimisticEntries.filter((e) => e.meal_slot === slot);
          const slotTotals = slotEntries.reduce(
            (acc, e) => ({ cal: acc.cal + e.calories, prot: acc.prot + e.protein_g }),
            { cal: 0, prot: 0 }
          );

          return (
            <div key={slot} className="glass widget-shadow rounded-2xl overflow-hidden">
              {/* Slot header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                  {SLOT_LABELS[slot]}
                </p>
                {slotEntries.length > 0 && (
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {Math.round(slotTotals.cal)} kcal · {Math.round(slotTotals.prot * 10) / 10}P
                  </p>
                )}
              </div>

              {/* Entries */}
              {slotEntries.map((entry) => (
                <EntryRow key={entry.id} entry={entry} onDelete={() => handleDelete(entry.id)} />
              ))}

              {/* Add food button */}
              <button
                type="button"
                onClick={() => setActiveSlot(slot)}
                className="w-full flex items-center gap-2 px-4 py-3 text-muted-foreground/60 hover:text-muted-foreground transition-colors active:bg-foreground/5"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
                <span className="text-xs font-medium">Add food</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Food search sheet */}
      {activeSlot && (
        <FoodSearchSheet
          mealSlot={activeSlot}
          date={date}
          onClose={() => setActiveSlot(null)}
          onLogged={() => { setActiveSlot(null); router.refresh(); }}
        />
      )}

      {/* Recipe builder */}
      {showRecipeBuilder && (
        <RecipeBuilderSheet
          onClose={() => setShowRecipeBuilder(false)}
          onSaved={() => setShowRecipeBuilder(false)}
        />
      )}

      {/* Meal plans sheet */}
      {showPlans && (
        <MealPlansSheet
          date={date}
          onClose={() => setShowPlans(false)}
          onApplied={() => { setShowPlans(false); router.refresh(); }}
        />
      )}
    </>
  );
}

function EntryRow({ entry, onDelete }: { entry: FoodLogEntry; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="flex items-center px-4 py-3 border-b border-border/30 last:border-0 gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{entry.food_name}</p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {entry.serving_qty} {entry.serving_unit}
          {entry.brand_name ? ` · ${entry.brand_name}` : ""}
        </p>
      </div>
      <div className="text-right shrink-0 mr-1">
        <p className="text-sm font-bold tabular-nums">{entry.calories}</p>
        <p className="text-[10px] text-muted-foreground tabular-nums">
          {Math.round(entry.protein_g * 10) / 10}P · {Math.round(entry.carbs_g * 10) / 10}C · {Math.round(entry.fat_g * 10) / 10}F
        </p>
      </div>
      {confirming ? (
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onDelete}
            className="text-[10px] font-bold text-rose-400 press px-2 py-1 bg-rose-500/10 rounded-lg"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-[10px] font-bold text-muted-foreground press px-2 py-1"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="shrink-0 p-1.5 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors press"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      )}
    </div>
  );
}
