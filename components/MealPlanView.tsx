"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ReconfigureSheet from "@/components/ReconfigureSheet";
import { CAL_SPLIT } from "@/lib/meal-scaling";
import { computeExactPortions } from "@/lib/portion-calc";
import { swapMealSlot, pickMealSlot, toggleMealLock, searchRecipes } from "@/lib/actions/meal-plan";

const DAYS       = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const SLOT_LABELS: Record<number, Record<number, string>> = {
  3: { 1: "Breakfast", 2: "Lunch", 3: "Dinner" },
  4: { 1: "Breakfast", 2: "Lunch", 3: "Dinner", 4: "Snack" },
  5: { 1: "Breakfast", 2: "Morning Snack", 3: "Lunch", 4: "Afternoon Snack", 5: "Dinner" },
};

const STORAGE_KEY = "hc-meal-config";
const MODE_KEY    = "hc-meal-mode";

const TAG_COLORS: Record<string, string> = {
  "high-protein":  "bg-green-500/15 text-green-400",
  "vegetarian":    "bg-emerald-500/15 text-emerald-400",
  "vegan":         "bg-emerald-500/15 text-emerald-400",
  "gluten-free":   "bg-yellow-500/15 text-yellow-400",
  "dairy-free":    "bg-sky-500/15 text-sky-400",
  "nut-free":      "bg-orange-500/15 text-orange-400",
  "halal":         "bg-purple-500/15 text-purple-400",
  "meal-prep":     "bg-blue-500/15 text-blue-400",
  "quick":         "bg-pink-500/15 text-pink-400",
  "bulk-friendly": "bg-red-500/15 text-red-400",
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
  week_number: number;
  day_of_week: number;
  meal_slot: number;
  locked?: boolean;
  recipes: Recipe | null;
};

function scaleQty(qty: number, multiplier: number): string {
  const scaled = qty * multiplier;
  if (scaled === 0.25) return "¼";
  if (scaled === 0.5)  return "½";
  if (scaled === 0.75) return "¾";
  if (scaled === 0.33) return "⅓";
  if (scaled === 0.67) return "⅔";
  const rounded = Math.round(scaled * 4) / 4;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, "");
}

export default function MealPlanView({
  mealPlan,
  weekNumber,
  phase,
  todayDow,
  dailyCalories = 2000,
  dailyMacros,
  hasCustomMacros = false,
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
  hasCustomMacros?: boolean;
  mealsPerDay?: 3 | 4 | 5;
  savedCuisines?: string[];
  savedRestrictions?: string[];
}) {
  const mealsPerDay = mealsPerDayProp;
  const router = useRouter();

  const [mode, setMode]                 = useState<"auto" | "custom">("auto");
  const [selectedWeek, setSelectedWeek] = useState(weekNumber);
  const [selectedDow, setSelectedDow]   = useState(todayDow);
  const [selected, setSelected]         = useState<MealEntry | null>(null);
  const [sheetOpen, setSheetOpen]       = useState(false);
  const [trainingDays, setTrainingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [cheatDay, setCheatDay]         = useState<number | null>(null);
  const [eatenIds, setEatenIds]         = useState<Set<string>>(new Set());
  const [checkedSteps, setCheckedSteps]             = useState<Record<string, number[]>>({});
  const [checkedIngredients, setCheckedIngredients] = useState<Record<string, number[]>>({});
  const [lockingId, setLockingId]   = useState<string | null>(null);
  const [swappingId, setSwappingId] = useState<string | null>(null);
  const [pickerFor, setPickerFor]   = useState<{
    weekNumber: number; dayOfWeek: number; mealSlot: number; mealType: string;
  } | null>(null);
  const [pickerRecipes, setPickerRecipes] = useState<any[]>([]);
  const [pickerQuery, setPickerQuery]     = useState("");
  const [pickerTab, setPickerTab]         = useState("all");
  const [pickerLoading, setPickerLoading] = useState(false);

  useEffect(() => {
    try {
      const m = localStorage.getItem(MODE_KEY);
      if (m === "auto" || m === "custom") setMode(m);

      const todayDate = new Date().toISOString().split("T")[0];
      const eaten = localStorage.getItem(`hc-eaten-${todayDate}`);
      if (eaten) {
        // Stored as meal_slot numbers for stability across plan regenerations — map back to entry IDs
        const eatenSlots = new Set<number>(JSON.parse(eaten));
        const todayPlan = mealPlan.filter((e) => e.week_number === weekNumber && e.day_of_week === todayDow);
        setEatenIds(new Set(todayPlan.filter((e) => eatenSlots.has(e.meal_slot)).map((e) => e.id)));
      }

      const s = localStorage.getItem("hc-checked-steps");
      const i = localStorage.getItem("hc-checked-ingredients");
      if (s) setCheckedSteps(JSON.parse(s));
      if (i) setCheckedIngredients(JSON.parse(i));

      const config = localStorage.getItem(STORAGE_KEY);
      if (config) {
        const parsed = JSON.parse(config);
        if (parsed.trainingDays) setTrainingDays(parsed.trainingDays);
        if (parsed.cheatDay !== undefined) setCheatDay(parsed.cheatDay);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem("hc-checked-steps", JSON.stringify(checkedSteps)); } catch {}
  }, [checkedSteps]);

  useEffect(() => {
    try { localStorage.setItem("hc-checked-ingredients", JSON.stringify(checkedIngredients)); } catch {}
  }, [checkedIngredients]);

  useEffect(() => {
    if (!pickerFor) return;
    const timeout = setTimeout(async () => {
      setPickerLoading(true);
      const { data } = await searchRecipes({
        mealType: pickerTab === "all" ? undefined : pickerTab,
        query: pickerQuery,
        cuisines: savedCuisines.length > 0 ? savedCuisines : undefined,
      });
      setPickerRecipes(data);
      setPickerLoading(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [pickerQuery, pickerTab, pickerFor]);

  // ── Data grouping ───────────────────────────────────────────────────────────
  const byWeekDay: Record<number, Record<number, MealEntry[]>> = {};
  for (const entry of mealPlan) {
    if (!byWeekDay[entry.week_number]) byWeekDay[entry.week_number] = {};
    if (!byWeekDay[entry.week_number][entry.day_of_week]) byWeekDay[entry.week_number][entry.day_of_week] = [];
    byWeekDay[entry.week_number][entry.day_of_week].push(entry);
  }
  const totalWeeks = Math.max(4, ...Object.keys(byWeekDay).map(Number));

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function getMealType(slot: number): string {
    const label = SLOT_LABELS[mealsPerDay]?.[slot] ?? "";
    if (label.includes("Breakfast")) return "breakfast";
    if (label.includes("Lunch")) return "lunch";
    if (label.includes("Dinner")) return "dinner";
    return "snack";
  }

  async function openPicker(wk: number, dow: number, slot: number) {
    const mealType = getMealType(slot);
    setPickerFor({ weekNumber: wk, dayOfWeek: dow, mealSlot: slot, mealType });
    setPickerQuery("");
    setPickerTab(mealType);
    setPickerLoading(true);
    const { data } = await searchRecipes({ mealType, cuisines: savedCuisines.length > 0 ? savedCuisines : undefined });
    setPickerRecipes(data);
    setPickerLoading(false);
  }

  function toggleStep(recipeId: string, idx: number) {
    setCheckedSteps((prev) => {
      const cur = prev[recipeId] ?? [];
      return { ...prev, [recipeId]: cur.includes(idx) ? cur.filter((i) => i !== idx) : [...cur, idx] };
    });
  }

  function toggleIngredient(recipeId: string, idx: number) {
    setCheckedIngredients((prev) => {
      const cur = prev[recipeId] ?? [];
      return { ...prev, [recipeId]: cur.includes(idx) ? cur.filter((i) => i !== idx) : [...cur, idx] };
    });
  }

  function toggleEaten(id: string) {
    const todayDate = new Date().toISOString().split("T")[0];
    setEatenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      const eatenSlots = mealPlan.filter((e) => next.has(e.id)).map((e) => e.meal_slot);
      try { localStorage.setItem(`hc-eaten-${todayDate}`, JSON.stringify(eatenSlots)); } catch {}
      return next;
    });
  }

  function setModeAndStore(m: "auto" | "custom") {
    setMode(m);
    try { localStorage.setItem(MODE_KEY, m); } catch {}
  }

  // ── Macro calculations ───────────────────────────────────────────────────────
  const baseMacros = dailyMacros ?? { calories: dailyCalories, protein: 0, carbs: 0, fat: 0 };
  const isRestToday  = !trainingDays.includes(todayDow);
  // Custom macros are the exact user-defined targets — never scale them by rest/training day
  const todayMult    = hasCustomMacros ? 1.0 : (isRestToday ? 0.85 : 1.0);
  const todayCalTarget  = Math.round(baseMacros.calories * todayMult);
  const todayProtTarget = Math.round(baseMacros.protein  * todayMult);
  const todayCarbTarget = Math.round(baseMacros.carbs    * todayMult);
  const todayFatTarget  = Math.round(baseMacros.fat      * todayMult);

  const todayEntries = byWeekDay[weekNumber]?.[todayDow] ?? [];
  let consumedCal = 0, consumedProt = 0, consumedCarb = 0, consumedFat = 0;
  for (const entry of todayEntries) {
    if (eatenIds.has(entry.id)) {
      if (mode === "custom" && entry.recipes) {
        // Custom mode: use actual recipe nutrition (1 serving as written)
        const svgs = entry.recipes.servings || 1;
        consumedCal  += Math.round(entry.recipes.calories  / svgs);
        consumedProt += Math.round(entry.recipes.protein_g / svgs);
        consumedCarb += Math.round(entry.recipes.carbs_g   / svgs);
        consumedFat  += Math.round(entry.recipes.fat_g     / svgs);
      } else {
        // Auto mode: use the slot target (recipes were scaled to match)
        const split    = CAL_SPLIT[mealsPerDay] ?? CAL_SPLIT[4];
        const fraction = (split[entry.meal_slot] ?? 0.25) * todayMult;
        consumedCal  += Math.round(baseMacros.calories * fraction);
        consumedProt += Math.round(baseMacros.protein  * fraction);
        consumedCarb += Math.round(baseMacros.carbs    * fraction);
        consumedFat  += Math.round(baseMacros.fat      * fraction);
      }
    }
  }
  const remainingCal = todayCalTarget - consumedCal;

  // ── View state ───────────────────────────────────────────────────────────────
  const isViewingToday = selectedWeek === weekNumber && selectedDow === todayDow;
  const selectedEntries = (byWeekDay[selectedWeek]?.[selectedDow] ?? [])
    .sort((a, b) => a.meal_slot - b.meal_slot);
  const isEmpty = mealPlan.length === 0;
  const showDiary = !isEmpty || mode === "custom";

  // ── Recipe sheet data ────────────────────────────────────────────────────────
  const recipe      = selected?.recipes ?? null;
  const servings    = recipe?.servings || 1;
  const cal         = recipe ? Math.round(recipe.calories  / servings) : null;
  const prot        = recipe ? Math.round(recipe.protein_g / servings) : null;
  const carb        = recipe ? Math.round(recipe.carbs_g   / servings) : null;
  const fat         = recipe ? Math.round(recipe.fat_g     / servings) : null;
  const ingredients = Array.isArray(recipe?.ingredients) ? recipe!.ingredients : [];
  const steps       = recipe?.instructions
    ? recipe.instructions.split(/\.\s+/).map((s) => s.replace(/\.$/, "").trim()).filter(Boolean)
    : [];
  const tags        = Array.isArray(recipe?.tags) ? recipe!.tags : [];
  const totalTime   = (recipe?.prep_time_min ?? 0) + (recipe?.cook_time_min ?? 0);
  const stepsDone   = recipe ? (checkedSteps[recipe.id]      ?? []) : [];
  const ingsDone    = recipe ? (checkedIngredients[recipe.id] ?? []) : [];

  return (
    <>
      <div className="space-y-5">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Week {weekNumber}</span>
            <span className="text-muted-foreground/30">·</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground capitalize">{phase}</span>
          </div>
          <button type="button" onClick={() => setSheetOpen(true)}
            className="p-1.5 rounded-full glass widget-shadow press text-muted-foreground">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>

        {/* ── Auto empty state ── */}
        {isEmpty && mode === "auto" && (
          <div className="glass widget-shadow rounded-2xl px-6 py-14 text-center space-y-3">
            <p className="text-2xl">🍽️</p>
            <p className="font-semibold">No plan yet</p>
            <p className="text-sm text-muted-foreground">Tell us how you want to eat and we&apos;ll build your month.</p>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="mt-1 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold press"
            >
              Build My Plan →
            </button>
          </div>
        )}

        {showDiary && (
          <>
            {/* ── Macro progress card (today only) ── */}
            {isViewingToday && cheatDay !== selectedDow && (
              <div className="glass widget-shadow rounded-2xl p-4 space-y-3">
                {/* Remaining kcal */}
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Remaining</p>
                    <p className={`text-3xl font-bold tabular-nums mt-0.5 ${remainingCal < 0 ? "text-rose-400" : ""}`}>
                      {remainingCal.toLocaleString()}
                      <span className="text-base font-normal text-muted-foreground ml-1">kcal</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground tabular-nums">{consumedCal} eaten</p>
                    <p className="text-xs text-muted-foreground tabular-nums">of {todayCalTarget} goal</p>
                  </div>
                </div>

                {/* Macro bars */}
                <div className="space-y-2">
                  {[
                    { label: "Protein", consumed: consumedProt, target: todayProtTarget, color: "bg-blue-500" },
                    { label: "Carbs",   consumed: consumedCarb, target: todayCarbTarget, color: "bg-amber-500" },
                    { label: "Fat",     consumed: consumedFat,  target: todayFatTarget,  color: "bg-rose-500" },
                  ].map(({ label, consumed, target, color }) => {
                    const pct = target > 0 ? Math.min(100, Math.round((consumed / target) * 100)) : 0;
                    return (
                      <div key={label} className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-[11px] text-muted-foreground">{label}</span>
                          <span className="text-[11px] font-semibold tabular-nums">{consumed}<span className="text-muted-foreground font-normal">/{target}g</span></span>
                        </div>
                        <div className="h-1.5 bg-foreground/8 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${color}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Cheat day ── */}
            {cheatDay === selectedDow ? (
              <div className="glass widget-shadow rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="text-sm font-semibold">{DAYS[selectedDow]}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-rose-400 px-2 py-0.5 bg-rose-500/10 rounded-full">Cheat Day</span>
                </div>
                <div className="px-6 py-10 text-center space-y-2">
                  <p className="text-3xl">🍕</p>
                  <p className="font-semibold text-sm">No tracking today</p>
                  <p className="text-xs text-muted-foreground">Enjoy your meal. You earned it.</p>
                </div>
              </div>
            ) : (
              /* ── Diary ── */
              <div className="space-y-1.5">
                {Array.from({ length: mealsPerDay }, (_, i) => i + 1).map((slot) => {
                  const entry     = selectedEntries.find((e) => e.meal_slot === slot);
                  const slotLabel = SLOT_LABELS[mealsPerDay]?.[slot] ?? "Meal";
                  const isRestDay = !trainingDays.includes(selectedDow);
                  const split     = CAL_SPLIT[mealsPerDay] ?? CAL_SPLIT[4];
                  const fraction  = (split[slot] ?? 0.25) * (hasCustomMacros ? 1.0 : (isRestDay ? 0.85 : 1.0));
                  const slotCal   = Math.round(baseMacros.calories * fraction);
                  const slotProt  = Math.round(baseMacros.protein  * fraction);
                  const slotCarb  = Math.round(baseMacros.carbs    * fraction);
                  const isEaten   = entry ? eatenIds.has(entry.id) : false;
                  const isLocked  = entry?.locked ?? false;

                  // Custom mode: show actual recipe macros if a recipe is assigned
                  const r = entry?.recipes;
                  const rServings = r?.servings || 1;
                  const displayCal  = mode === "custom" && r ? Math.round(r.calories  / rServings) : slotCal;
                  const displayProt = mode === "custom" && r ? Math.round(r.protein_g / rServings) : slotProt;
                  const displayCarb = mode === "custom" && r ? Math.round(r.carbs_g   / rServings) : slotCarb;

                  return (
                    <div key={slot} className="glass widget-shadow rounded-2xl overflow-hidden">
                      {/* Slot header */}
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{slotLabel}</p>
                        <p className="text-[11px] text-muted-foreground tabular-nums">
                          {displayCal} kcal · {displayProt}P · {displayCarb}C
                        </p>
                      </div>

                      {entry ? (
                        <div className="flex items-center">
                          {/* Eaten toggle (today only) */}
                          {isViewingToday && (
                            <button
                              type="button"
                              onClick={() => toggleEaten(entry.id)}
                              className="shrink-0 px-4 py-4"
                            >
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                                isEaten ? "border-primary bg-primary" : "border-border"
                              }`}>
                                {isEaten && (
                                  <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 12 12">
                                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                              </div>
                            </button>
                          )}

                          {/* Recipe info */}
                          <button
                            type="button"
                            onClick={() => setSelected(entry)}
                            className={`flex-1 flex items-center justify-between px-4 py-3.5 text-left active:bg-white/5 transition-colors ${!isViewingToday ? "pl-4" : ""} ${isEaten ? "opacity-50" : ""}`}
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">{entry.recipes?.name ?? "—"}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{entry.recipes?.cuisine ?? ""}</p>
                            </div>
                            <svg className="shrink-0 ml-2 text-muted-foreground/40" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="9 18 15 12 9 6"/>
                            </svg>
                          </button>

                          {/* Lock */}
                          <button
                            type="button"
                            disabled={lockingId === entry.id}
                            onClick={async () => {
                              setLockingId(entry.id);
                              const { error: lockErr } = await toggleMealLock({
                                weekNumber: entry.week_number,
                                dayOfWeek: entry.day_of_week,
                                mealSlot: entry.meal_slot,
                              });
                              setLockingId(null);
                              if (!lockErr) router.refresh();
                            }}
                            className={`shrink-0 press transition-colors p-2 ${
                              isLocked ? "text-primary" : "text-muted-foreground/30 hover:text-muted-foreground"
                            }`}
                          >
                            {isLocked ? (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                                <path d="M18 10h-1V7A5 5 0 0 0 7 7v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2zM9 7a3 3 0 1 1 6 0v3H9V7zm3 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                              </svg>
                            ) : (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                              </svg>
                            )}
                          </button>

                          {/* Swap — Auto: app picks directly; Custom: opens picker */}
                          <button
                            type="button"
                            disabled={swappingId === entry.id}
                            onClick={async () => {
                              if (mode === "auto") {
                                setSwappingId(entry.id);
                                await swapMealSlot({
                                  weekNumber: entry.week_number,
                                  dayOfWeek: entry.day_of_week,
                                  mealSlot: entry.meal_slot,
                                  currentRecipeId: entry.recipes?.id ?? "",
                                });
                                setSwappingId(null);
                                router.refresh();
                              } else {
                                await openPicker(entry.week_number, entry.day_of_week, entry.meal_slot);
                              }
                            }}
                            className="shrink-0 pr-4 pl-1 py-4 press text-muted-foreground/50 hover:text-muted-foreground transition-colors disabled:opacity-40"
                          >
                            <svg
                              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                              className={swappingId === entry.id ? "animate-spin" : ""}
                            >
                              <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
                              <path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
                            </svg>
                          </button>
                        </div>
                      ) : (
                        /* Empty slot */
                        mode === "auto" ? (
                          <button
                            type="button"
                            disabled={swappingId === `empty-${slot}`}
                            onClick={async () => {
                              setSwappingId(`empty-${slot}`);
                              await swapMealSlot({
                                weekNumber: selectedWeek,
                                dayOfWeek: selectedDow,
                                mealSlot: slot,
                                currentRecipeId: "",
                              });
                              setSwappingId(null);
                              router.refresh();
                            }}
                            className="w-full flex items-center gap-3 px-4 py-4 text-left press active:bg-white/5 transition-colors disabled:opacity-40"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={swappingId === `empty-${slot}` ? "animate-spin text-primary" : "text-muted-foreground/50"}>
                              <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
                              <path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
                            </svg>
                            <span className="text-sm text-muted-foreground">Auto-fill</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openPicker(selectedWeek, selectedDow, slot)}
                            className="w-full flex items-center gap-3 px-4 py-4 text-left press active:bg-white/5 transition-colors"
                          >
                            <div className="w-5 h-5 rounded-full border-2 border-dashed border-border flex items-center justify-center">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                              </svg>
                            </div>
                            <span className="text-sm text-muted-foreground">Add meal</span>
                          </button>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

      </div>

      {/* ── Reconfigure sheet ── */}
      <ReconfigureSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        savedCuisines={savedCuisines}
        savedRestrictions={savedRestrictions}
      />

      {/* ── Recipe Picker Modal ── */}
      {pickerFor && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background/97 backdrop-blur-sm">
          <div className="flex items-center gap-3 px-4 pt-6 pb-3 border-b border-border">
            <button type="button" onClick={() => setPickerFor(null)} className="press text-muted-foreground text-sm">Cancel</button>
            <h2 className="flex-1 text-center font-semibold text-sm">Choose Your Meal</h2>
            <div className="w-12" />
          </div>

          {/* Tabs */}
          <div className="flex gap-2 px-4 py-2 overflow-x-auto hide-scrollbar border-b border-border">
            {["all", "breakfast", "lunch", "dinner", "snack"].map((t) => (
              <button key={t} type="button" onClick={() => setPickerTab(t)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium press transition-colors capitalize ${
                  t === pickerTab ? "bg-primary text-primary-foreground" : "bg-foreground/8 text-muted-foreground"
                }`}>
                {t}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="px-4 py-2">
            <input
              type="text"
              placeholder="Search recipes…"
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              className="w-full bg-foreground/5 rounded-xl h-10 px-4 text-sm outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>

          {/* Recipe list */}
          <div className="flex-1 overflow-y-auto px-4 space-y-1.5 pb-8">
            {pickerLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
            ) : pickerRecipes.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">No recipes found.</div>
            ) : (
              pickerRecipes.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={async () => {
                    await pickMealSlot({
                      weekNumber: pickerFor.weekNumber,
                      dayOfWeek: pickerFor.dayOfWeek,
                      mealSlot: pickerFor.mealSlot,
                      recipeId: r.id,
                    });
                    setPickerFor(null);
                    router.refresh();
                  }}
                  className="w-full text-left flex items-center justify-between px-4 py-3 glass rounded-2xl press"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.cuisine} · {r.meal_type}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-semibold tabular-nums">{r.calories} kcal</p>
                    <p className="text-xs text-muted-foreground">{r.protein_g}g P</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

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
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
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
                      <span key={tag} className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize ${TAG_COLORS[tag] ?? "bg-border/40 text-muted-foreground"}`}>
                        {tag.replace(/-/g, " ")}
                      </span>
                    ))}
                  </div>
                )}

                {/* Macros per serving */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Nutrition per serving</p>
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

                {/* Time */}
                {totalTime > 0 && (
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
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Total</p>
                      <p className="font-semibold mt-0.5">{totalTime} min</p>
                    </div>
                  </div>
                )}

                {/* Exact portions (Auto mode only) */}
                {mode === "auto" && ingredients.length > 0 && (() => {
                  const isRestDay = !trainingDays.includes(selected.day_of_week);
                  const split = CAL_SPLIT[mealsPerDay] ?? CAL_SPLIT[4];
                  const fraction = (split[selected.meal_slot] ?? 0.25) * (hasCustomMacros ? 1.0 : (isRestDay ? 0.85 : 1.0));
                  const base = dailyMacros ?? {
                    calories: dailyCalories,
                    protein:  dailyCalories * 0.30 / 4,
                    carbs:    dailyCalories * 0.40 / 4,
                    fat:      dailyCalories * 0.30 / 9,
                  };
                  const slotTargets = {
                    calories: Math.round(base.calories * fraction),
                    protein:  Math.round(base.protein  * fraction),
                    carbs:    Math.round(base.carbs    * fraction),
                    fat:      Math.round(base.fat      * fraction),
                  };
                  const portions = computeExactPortions(ingredients, slotTargets);
                  return (
                    <>
                      <div className="glass rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Your exact portions</p>
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-green-500/15 text-green-400">Exact Match</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { label: "Calories", value: String(slotTargets.calories), sub: "kcal" },
                            { label: "Protein",  value: String(slotTargets.protein),  sub: "g" },
                            { label: "Carbs",    value: String(slotTargets.carbs),    sub: "g" },
                            { label: "Fat",      value: String(slotTargets.fat),      sub: "g" },
                          ].map(({ label, value, sub }) => (
                            <div key={label} className="bg-primary/5 rounded-xl p-2.5 text-center">
                              <p className="text-sm font-bold leading-none text-primary">{value}<span className="text-[10px] font-normal text-muted-foreground ml-0.5">{sub}</span></p>
                              <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Ingredients — exact amounts</p>
                        <ul className="space-y-0.5">
                          {portions.map((portion, i) => {
                            const checked = ingsDone.includes(i);
                            return (
                              <li key={i}>
                                <button type="button" onClick={() => toggleIngredient(recipe.id, i)}
                                  className="w-full flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0 text-left">
                                  <span className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${checked ? "bg-primary border-primary" : "border-border"}`}>
                                    {checked && <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,6 5,9 10,3"/></svg>}
                                  </span>
                                  <span className={`shrink-0 text-right text-sm font-semibold tabular-nums transition-opacity min-w-[80px] ${checked ? "opacity-40" : ""}`}>{portion.displayQty}</span>
                                  <div className="flex-1 min-w-0">
                                    <span className={`text-sm transition-opacity ${checked ? "opacity-40 line-through" : ""}`}>{portion.name}</span>
                                    {portion.adjusted && <span className="ml-1.5 text-[10px] text-primary font-semibold">adjusted</span>}
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

                {/* Ingredients at natural quantities (Custom mode) */}
                {mode === "custom" && ingredients.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Ingredients</p>
                    <ul className="space-y-0.5">
                      {ingredients.map((ing, i) => {
                        const checked = ingsDone.includes(i);
                        return (
                          <li key={i}>
                            <button type="button" onClick={() => toggleIngredient(recipe.id, i)}
                              className="w-full flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0 text-left">
                              <span className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${checked ? "bg-primary border-primary" : "border-border"}`}>
                                {checked && <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2,6 5,9 10,3"/></svg>}
                              </span>
                              <span className={`shrink-0 text-right text-sm font-semibold tabular-nums transition-opacity min-w-[80px] ${checked ? "opacity-40" : ""}`}>
                                {scaleQty(ing.qty, 1)} {ing.unit}
                              </span>
                              <span className={`flex-1 text-sm transition-opacity ${checked ? "opacity-40 line-through" : ""}`}>{ing.name}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Instructions */}
                {steps.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">Instructions</p>
                    <ol className="space-y-4">
                      {steps.map((step, i) => {
                        const done = stepsDone.includes(i);
                        return (
                          <li key={i}>
                            <button type="button" onClick={() => toggleStep(recipe.id, i)} className="w-full flex gap-4 text-left">
                              <span className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${done ? "bg-primary border-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
                                {done ? (
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="2,6 5,9 10,3"/>
                                  </svg>
                                ) : i + 1}
                              </span>
                              <p className={`text-sm leading-relaxed pt-0.5 transition-opacity ${done ? "opacity-40 line-through" : ""}`}>{step}.</p>
                            </button>
                          </li>
                        );
                      })}
                    </ol>

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
