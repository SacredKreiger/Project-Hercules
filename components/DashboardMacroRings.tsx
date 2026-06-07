"use client";

import { MacroRing } from "@/components/MacroRing";
import type { MacroTotals } from "@/lib/types/food";

const CAL_COLOR = "oklch(0.72 0.17 42)";
const P_COLOR   = "oklch(0.68 0.20 15)";
const C_COLOR   = "oklch(0.78 0.16 80)";
const F_COLOR   = "oklch(0.68 0.16 235)";

interface Props {
  macros: { calories: number; protein: number; carbs: number; fat: number };
  consumed: MacroTotals;
}

export function DashboardMacroRings({ macros, consumed }: Props) {
  return (
    <div className="grid grid-cols-4 gap-1 justify-items-center">
      <MacroRing label="Calories" logged={Math.round(consumed.calories)} target={macros.calories} unit=""  color={CAL_COLOR} size={72} hideTarget />
      <MacroRing label="Protein"  logged={Math.round(consumed.protein)}  target={macros.protein}  unit="g" color={P_COLOR}   size={72} hideTarget />
      <MacroRing label="Carbs"    logged={Math.round(consumed.carbs)}    target={macros.carbs}    unit="g" color={C_COLOR}   size={72} hideTarget />
      <MacroRing label="Fat"      logged={Math.round(consumed.fat)}      target={macros.fat}      unit="g" color={F_COLOR}   size={72} hideTarget />
    </div>
  );
}
