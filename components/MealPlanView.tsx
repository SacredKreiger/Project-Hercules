"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ReconfigureSheet from "@/components/ReconfigureSheet";
import { CAL_SPLIT, getServingsMultiplier, scaleMacro } from "@/lib/meal-scaling";
import { computeExactPortions } from "@/lib/portion-calc";
import { swapMealSlot, pickMealSlot, toggleMealLock, searchRecipes } from "@/lib/actions/meal-plan";

const DAYS       = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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

const getMultiplier = getServingsMultiplier;

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
  const mealsPerDay = mealsPerDayProp;
  const router = useRouter();

  const [view, setView]               = useState<"day" | "week" | "month">("day");
  const [selectedWeek, setSelectedWeek] = useState(weekNumber);
  const [selectedDow, setSelectedDow]   = useState(todayDow);
  const [selected, setSelected]         = useState<MealEntry | null>(null);
  const [sheetOpen, setSheetOpen]       = useState(false);
  const [trainingDays, setTrainingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [checkedSteps, setCheckedSteps]               = useState<Record<string, number[]>>({});
  const [checkedIngredients, setCheckedIngredients]   = useState<Record<string, number[]>>({});
  const [eatenIds, setEatenIds] = useState<Set<string>>(new Set());
  const [swappingId, setSwappingId] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<{
    weekNumber: number; dayOfWeek: number; mealSlot: number; mealType: string;
  } | null>(null);
  const [pickerRecipes, setPickerRecipes] = useState<any[]>([]);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerTab, setPickerTab] = useState("all");
  const [pickerLoading, setPickerLoading] = useState(false);
  const [lockingId, setLockingId] = useState<string | null>(null);
  const [buildDayOpen, setBuildDayOpen] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem("hc-checked-steps");
      const i = localStorage.getItem("hc-checked-ingredients");
      if (s) setCheckedSteps(JSON.parse(s));
      if (i) setCheckedIngredients(JSON.parse(i));
      const todayDate = new Date().toISOString().split("T")[0];
      const eaten = localStorage.getItem(`hc-eaten-${todayDate}`);
      if (eaten) setEatenIds(new Set(JSON.parse(eaten)));
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
      return { ...prev, [recipeId]: cur.includes(idx) ? cur.filter((i) => i !== idx) : [...cur, idx] };
    });
  }

  function toggleEaten(id: string) {
    const todayDate = new Date().toISOString().split("T")[0];
    setEatenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      // Store slot numbers so DashboardMacroRings can sum consumed macros
      const eatenSlots = mealPlan
        .filter((e) => next.has(e.id))
        .map((e) => e.meal_slot);
      try { localStorage.setItem(`hc-eaten-${todayDate}`, JSON.stringify(eatenSlots)); } catch {}
      return next;
    });
  }

  function toggleIngredient(recipeId: string, idx: number) {
    setCheckedIngredients((prev) => {
      const cur = prev[recipeId] ?? [];
      return { ...prev, [recipeId]: cur.includes(idx) ? cur.filter((i) => i !== idx) : [...cur, idx] };
    });
  }

  useEffect(() => {
    if (!pickerFor) return;
    const timeout = setTimeout(async () => {
      setPickerLoading(true);
      const { data } = await searchRecipes({
        mealType: pickerTab === "all" ? undefined : pickerTab,
        query: pickerQuery,
      });
      setPickerRecipes(data);
      setPickerLoading(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [pickerQuery, pickerTab, pickerFor]);

  // ── Data grouping ──────────────────────────────────────────────────────────
  // byWeekDay[week][dow] = MealEntry[]
  const byWeekDay: Record<number, Record<number, MealEntry[]>> = {};
  for (const entry of mealPlan) {
    if (!byWeekDay[entry.week_number]) byWeekDay[entry.week_number] = {};
    if (!byWeekDay[entry.week_number][entry.day_of_week]) byWeekDay[entry.week_number][entry.day_of_week] = [];
    byWeekDay[entry.week_number][entry.day_of_week].push(entry);
  }

  const totalWeeks = Math.max(4, ...Object.keys(byWeekDay).map(Number));

  // ── Helpers ────────────────────────────────────────────────────────────────
  function dayCalories(entries: MealEntry[], dow: number): number {
    if (entries.length === 0) return 0;
    const isRest = !trainingDays.includes(dow);
    const base = dailyMacros?.calories ?? dailyCalories;
    return Math.round(base * (isRest ? 0.85 : 1.0));
  }

  function getMealType(slot: number): string {
    const label = SLOT_LABELS[mealsPerDay]?.[slot] ?? "";
    if (label.includes("Breakfast")) return "breakfast";
    if (label.includes("Lunch")) return "lunch";
    if (label.includes("Dinner")) return "dinner";
    return "snack";
  }

  async function openPicker(weekNumber: number, dayOfWeek: number, mealSlot: number) {
    const mealType = getMealType(mealSlot);
    setPickerFor({ weekNumber, dayOfWeek, mealSlot, mealType });
    setPickerQuery("");
    setPickerTab(mealType);
    setPickerLoading(true);
    const { data } = await searchRecipes({ mealType });
    setPickerRecipes(data);
    setPickerLoading(false);
  }

  function MealRow({ entry }: { entry: MealEntry }) {
    const isRestDay = !trainingDays.includes(entry.day_of_week);
    const split = CAL_SPLIT[mealsPerDay] ?? CAL_SPLIT[4];
    const fraction = (split[entry.meal_slot] ?? 0.25) * (isRestDay ? 0.85 : 1.0);
    const base = dailyMacros ?? { calories: dailyCalories, protein: 0, carbs: 0, fat: 0 };
    const slotCal  = Math.round(base.calories * fraction);
    const slotProt = Math.round(base.protein  * fraction);
    const slotCarb = Math.round(base.carbs    * fraction);
    const isEaten = eatenIds.has(entry.id);
    const isToday = selectedWeek === weekNumber && selectedDow === todayDow;
    const isLocked = entry.locked ?? false;

    return (
      <div className="flex items-center">
        {isToday && (
          <button type="button" onClick={() => toggleEaten(entry.id)} className="shrink-0 ml-4 mr-0">
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
        <button
          type="button"
          onClick={() => setSelected(entry)}
          className={`flex-1 flex items-center justify-between px-4 py-3 text-left active:bg-white/5 transition-colors ${isEaten ? "opacity-50" : ""}`}
        >
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{SLOT_LABELS[mealsPerDay]?.[entry.meal_slot] ?? "Meal"}</p>
            <p className="text-sm font-medium mt-0.5 truncate">{entry.recipes?.name ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{entry.recipes?.cuisine ?? ""}</p>
          </div>
          <div className="text-right shrink-0 ml-3">
            <p className="text-sm font-semibold">{slotCal} kcal</p>
            <p className="text-xs text-muted-foreground">{slotProt}g P · {slotCarb}g C</p>
          </div>
        </button>

        {/* Lock button */}
        <button
          type="button"
          disabled={lockingId === entry.id}
          onClick={async (e) => {
            e.stopPropagation();
            setLockingId(entry.id);
            await toggleMealLock({ weekNumber: entry.week_number, dayOfWeek: entry.day_of_week, mealSlot: entry.meal_slot });
            router.refresh();
            setLockingId(null);
          }}
          className={`shrink-0 press transition-colors p-1 ${isLocked ? "text-primary" : "text-muted-foreground/40 hover:text-muted-foreground"}`}
          title={isLocked ? "Locked — won't change on regenerate" : "Lock this meal"}
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

        {/* Swap → opens picker */}
        <button
          type="button"
          onClick={async (e) => {
            e.stopPropagation();
            await openPicker(entry.week_number, entry.day_of_week, entry.meal_slot);
          }}
          className="shrink-0 mr-4 press text-muted-foreground active:text-primary transition-colors"
          title="Pick a meal"
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
    );
  }

  function DayCard({ dow, entries, isToday }: { dow: number; entries: MealEntry[]; isToday: boolean }) {
    return (
      <div className={`glass widget-shadow rounded-2xl overflow-hidden ${isToday ? "ring-1 ring-primary/40" : ""}`}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <span className="text-sm font-semibold">{DAYS[dow]}</span>
          {isToday && (
            <span className="text-[10px] font-semibold uppercase tracking-widest text-primary px-2 py-0.5 glass rounded-full">Today</span>
          )}
        </div>
        {entries.length > 0 ? (
          <div className="divide-y divide-border">
            {entries.map((e) => <MealRow key={e.id} entry={e} />)}
          </div>
        ) : (
          <p className="px-4 py-4 text-sm text-muted-foreground">No meals planned.</p>
        )}
      </div>
    );
  }

  // ── Recipe sheet data ──────────────────────────────────────────────────────
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

  const isEmpty = mealPlan.length === 0;

  return (
    <>
      <div className="space-y-4">

        {/* ── Header ── */}
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

        {/* ── View switcher ── */}
        {!isEmpty && (
          <div className="flex p-1 bg-foreground/5 rounded-xl">
            {(["Day", "Week", "Month"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v.toLowerCase() as "day" | "week" | "month")}
                className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  view === v.toLowerCase()
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {isEmpty && (
          <div className="glass widget-shadow rounded-2xl px-6 py-14 text-center space-y-3">
            <p className="text-2xl">🍽️</p>
            <p className="font-semibold">No plan yet</p>
            <p className="text-sm text-muted-foreground">Tell us how you want to eat and we&apos;ll build your month.</p>
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="mt-1 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold press"
            >
              Set Up My Plan →
            </button>
          </div>
        )}

        {/* ── Day view ── */}
        {!isEmpty && view === "day" && (
          <>
            {/* Day navigation */}
            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                onClick={() => {
                  if (selectedDow === 0) {
                    setSelectedDow(6);
                    setSelectedWeek((w) => Math.max(1, w - 1));
                  } else {
                    setSelectedDow((d) => d - 1);
                  }
                }}
                className="p-2 rounded-full glass widget-shadow press"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div className="text-center">
                <p className="text-sm font-semibold">{DAYS[selectedDow]}</p>
                <p className="text-xs text-muted-foreground">
                  Week {selectedWeek}
                  {selectedWeek === weekNumber && selectedDow === todayDow && " · Today"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (selectedDow === 6) {
                    setSelectedDow(0);
                    setSelectedWeek((w) => Math.min(totalWeeks, w + 1));
                  } else {
                    setSelectedDow((d) => d + 1);
                  }
                }}
                className="p-2 rounded-full glass widget-shadow press"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setBuildDayOpen(true)}
              className="w-full h-10 rounded-2xl border border-dashed border-border text-xs font-semibold text-muted-foreground press flex items-center justify-center gap-2"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Build My Day
            </button>

            <DayCard
              dow={selectedDow}
              entries={byWeekDay[selectedWeek]?.[selectedDow] ?? []}
              isToday={selectedWeek === weekNumber && selectedDow === todayDow}
            />
          </>
        )}

        {/* ── Week view ── */}
        {!isEmpty && view === "week" && (
          <>
            {/* Week navigation */}
            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                onClick={() => setSelectedWeek((w) => Math.max(1, w - 1))}
                disabled={selectedWeek <= 1}
                className="p-2 rounded-full glass widget-shadow press disabled:opacity-30"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <div className="text-center">
                <p className="text-sm font-semibold">Week {selectedWeek}</p>
                {selectedWeek === weekNumber && (
                  <p className="text-xs text-primary">Current week</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedWeek((w) => Math.min(totalWeeks, w + 1))}
                disabled={selectedWeek >= totalWeeks}
                className="p-2 rounded-full glass widget-shadow press disabled:opacity-30"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>

            {DAYS.map((_, dow) => (
              <DayCard
                key={dow}
                dow={dow}
                entries={byWeekDay[selectedWeek]?.[dow] ?? []}
                isToday={selectedWeek === weekNumber && dow === todayDow}
              />
            ))}
          </>
        )}

        {/* ── Month view — calendar grid ── */}
        {!isEmpty && view === "month" && (() => {
          // Compute week-1 Sunday from today's known position in the plan
          const now = new Date();
          const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const currentWeekSunday = new Date(todayMidnight);
          currentWeekSunday.setDate(todayMidnight.getDate() - todayDow);
          const week1Start = new Date(currentWeekSunday);
          week1Start.setDate(currentWeekSunday.getDate() - (weekNumber - 1) * 7);

          function cellDate(week: number, dow: number): Date {
            const d = new Date(week1Start);
            d.setDate(week1Start.getDate() + (week - 1) * 7 + dow);
            return d;
          }

          const firstDate = cellDate(1, 0);
          const lastDate  = cellDate(totalWeeks, 6);
          const fmtMon    = (d: Date) => d.toLocaleDateString("en-US", { month: "short" });
          const fmtMonYr  = (d: Date) => d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
          const headerLabel = firstDate.getMonth() === lastDate.getMonth()
            ? fmtMonYr(firstDate)
            : `${fmtMon(firstDate)} – ${fmtMonYr(lastDate)}`;

          return (
            <div className="space-y-3">
              {/* Month header */}
              <div className="flex items-center justify-between px-1">
                <p className="text-base font-bold tracking-tight">{headerLabel}</p>
                <span className="text-xs text-muted-foreground">Week {weekNumber} of {totalWeeks}</span>
              </div>

              <div className="glass widget-shadow rounded-2xl overflow-hidden">
                {/* Day-of-week header */}
                <div className="grid grid-cols-7 border-b border-border/60">
                  {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                    <div key={d} className="py-3 text-center">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{d}</span>
                    </div>
                  ))}
                </div>

                {/* Week rows */}
                {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => (
                  <div key={week} className="grid grid-cols-7 border-b border-border/40 last:border-b-0">
                    {Array.from({ length: 7 }, (_, dow) => {
                      const entries  = byWeekDay[week]?.[dow] ?? [];
                      const isToday  = week === weekNumber && dow === todayDow;
                      const date     = cellDate(week, dow);
                      const dateNum  = date.getDate();
                      const kcal     = dayCalories(entries, dow);
                      const hasMeals = entries.length > 0;

                      return (
                        <button
                          key={dow}
                          type="button"
                          onClick={() => { setSelectedWeek(week); setSelectedDow(dow); setView("day"); }}
                          className="flex flex-col items-center justify-center gap-2 py-5 active:bg-foreground/5 transition-colors"
                        >
                          {/* Date circle */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isToday ? "bg-primary" : ""
                          }`}>
                            <span className={`text-sm leading-none ${
                              isToday ? "font-bold text-primary-foreground" : "font-medium text-foreground/80"
                            }`}>
                              {dateNum}
                            </span>
                          </div>

                          {/* Single dot — meals planned */}
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            hasMeals
                              ? isToday ? "bg-primary" : "bg-foreground/30"
                              : "opacity-0"
                          }`} />

                          {/* kcal */}
                          <span className={`text-[9px] tabular-nums leading-none ${
                            kcal > 0
                              ? isToday ? "text-primary font-semibold" : "text-muted-foreground"
                              : "opacity-0"
                          }`}>
                            {kcal > 0 ? `${kcal}` : "0"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

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
            <h2 className="flex-1 text-center font-semibold text-sm">Pick a Meal</h2>
            <button
              type="button"
              onClick={async () => {
                setSwappingId("picker");
                await swapMealSlot({
                  weekNumber: pickerFor.weekNumber,
                  dayOfWeek: pickerFor.dayOfWeek,
                  mealSlot: pickerFor.mealSlot,
                  currentRecipeId: "",
                });
                setPickerFor(null);
                setSwappingId(null);
                router.refresh();
              }}
              className="text-xs font-semibold text-primary press"
            >
              Auto
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 px-4 py-2 overflow-x-auto hide-scrollbar border-b border-border">
            {["all", "breakfast", "lunch", "dinner", "snack"].map((t) => (
              <button key={t} type="button" onClick={() => setPickerTab(t)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium press transition-colors capitalize ${t === pickerTab ? "bg-primary text-primary-foreground" : "bg-foreground/8 text-muted-foreground"}`}>
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
                    await pickMealSlot({ weekNumber: pickerFor.weekNumber, dayOfWeek: pickerFor.dayOfWeek, mealSlot: pickerFor.mealSlot, recipeId: r.id });
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

      {/* ── Build My Day Sheet ── */}
      {buildDayOpen && (
        <div className="fixed inset-0 z-40 flex items-end" onClick={() => setBuildDayOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-h-[75dvh] overflow-y-auto glass rounded-t-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 glass rounded-t-3xl px-5 pt-5 pb-3 border-b border-border/40">
              <div className="w-10 h-1 bg-border rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-base">Build My Day</h2>
                <button onClick={() => setBuildDayOpen(false)} className="text-muted-foreground press p-1">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{DAYS[selectedDow]} · Week {selectedWeek} — tap a slot to pick a meal</p>
            </div>
            <div className="px-5 py-4 space-y-2 pb-8">
              {(byWeekDay[selectedWeek]?.[selectedDow] ?? [])
                .sort((a, b) => a.meal_slot - b.meal_slot)
                .map((entry) => (
                  <div key={entry.id} className="glass rounded-2xl flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{SLOT_LABELS[mealsPerDay]?.[entry.meal_slot] ?? "Meal"}</p>
                      <p className="text-sm font-semibold mt-0.5 truncate">{entry.recipes?.name ?? "—"}</p>
                      {entry.locked && <p className="text-[10px] text-primary mt-0.5">🔒 Locked</p>}
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        setBuildDayOpen(false);
                        await openPicker(entry.week_number, entry.day_of_week, entry.meal_slot);
                      }}
                      className="shrink-0 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold press"
                    >
                      Change
                    </button>
                  </div>
                ))}
              {(byWeekDay[selectedWeek]?.[selectedDow] ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No meals planned for this day.</p>
              )}
            </div>
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
                  // solver adjusts ingredient quantities; display always shows the slot targets
                  // (same values the MealRow already shows) so the badge is always "Exact Match"
                  const portions = computeExactPortions(ingredients, slotTargets);
                  return (
                    <>
                      <div className="glass rounded-2xl p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Your exact portions</p>
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-green-500/15 text-green-400">
                            Exact Match
                          </span>
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
