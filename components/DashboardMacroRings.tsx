"use client";

import { useEffect, useState } from "react";
import { MacroRing } from "@/components/MacroRing";

const CAL_COLOR = "oklch(0.72 0.17 42)";
const P_COLOR   = "oklch(0.68 0.20 15)";
const C_COLOR   = "oklch(0.78 0.16 80)";
const F_COLOR   = "oklch(0.68 0.16 235)";

interface SlotMacros {
  slot: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface DashboardMacroRingsProps {
  macros: { calories: number; protein: number; carbs: number; fat: number };
  slotMacrosList: SlotMacros[];
}

export function DashboardMacroRings({ macros, slotMacrosList }: DashboardMacroRingsProps) {
  const [consumed, setConsumed] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });

  useEffect(() => {
    function readEaten() {
      const today = new Date().toISOString().slice(0, 10);
      const key = `hc-eaten-${today}`;
      let eatenSlots: number[] = [];
      try {
        const raw = localStorage.getItem(key);
        if (raw) eatenSlots = JSON.parse(raw) as number[];
      } catch {
        eatenSlots = [];
      }

      const totals = slotMacrosList
        .filter((s) => eatenSlots.includes(s.slot))
        .reduce(
          (acc, s) => ({
            calories: acc.calories + s.calories,
            protein:  acc.protein  + s.protein,
            carbs:    acc.carbs    + s.carbs,
            fat:      acc.fat      + s.fat,
          }),
          { calories: 0, protein: 0, carbs: 0, fat: 0 }
        );

      setConsumed(totals);
    }

    readEaten();

    // Re-read when user navigates back to dashboard
    document.addEventListener("visibilitychange", readEaten);
    window.addEventListener("focus", readEaten);

    return () => {
      document.removeEventListener("visibilitychange", readEaten);
      window.removeEventListener("focus", readEaten);
    };
  }, [slotMacrosList]);

  return (
    <div className="grid grid-cols-4 gap-1 justify-items-center">
      <MacroRing label="Calories" logged={consumed.calories} target={macros.calories} unit=""  color={CAL_COLOR} size={72} hideTarget />
      <MacroRing label="Protein"  logged={consumed.protein}  target={macros.protein}  unit="g" color={P_COLOR}   size={72} hideTarget />
      <MacroRing label="Carbs"    logged={consumed.carbs}    target={macros.carbs}    unit="g" color={C_COLOR}   size={72} hideTarget />
      <MacroRing label="Fat"      logged={consumed.fat}      target={macros.fat}      unit="g" color={F_COLOR}   size={72} hideTarget />
    </div>
  );
}
