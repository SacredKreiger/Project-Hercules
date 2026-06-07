"use client";

import { useState, useTransition } from "react";
import { searchFoods } from "@/lib/actions/food-search";
import { buildRecipe } from "@/lib/actions/custom-foods";
import type { FoodResult, RecipeIngredient } from "@/lib/types/food";

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

type Step = "name" | "ingredients" | "servings";

export default function RecipeBuilderSheet({ onClose, onSaved }: Props) {
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodResult[]>([]);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [servings, setServings] = useState(1);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [searching, setSearching] = useState(false);

  function handleSearch() {
    if (!query.trim()) return;
    setSearching(true);
    startTransition(async () => {
      const { results } = await searchFoods(query);
      setResults(results);
      setSearching(false);
    });
  }

  function addIngredient(food: FoodResult, qty: number) {
    setIngredients((prev) => [
      ...prev,
      {
        food_name: food.name,
        brand_name: food.brand,
        qty,
        unit: food.serving_unit,
        calories: Math.round(food.calories * qty),
        protein_g: Math.round(food.protein_g * qty * 10) / 10,
        carbs_g: Math.round(food.carbs_g * qty * 10) / 10,
        fat_g: Math.round(food.fat_g * qty * 10) / 10,
      },
    ]);
    setQuery("");
    setResults([]);
  }

  function removeIngredient(i: number) {
    setIngredients((prev) => prev.filter((_, idx) => idx !== i));
  }

  const totalMacros = ingredients.reduce(
    (acc, ing) => ({
      calories: acc.calories + ing.calories,
      protein_g: acc.protein_g + ing.protein_g,
      carbs_g: acc.carbs_g + ing.carbs_g,
      fat_g: acc.fat_g + ing.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  const perServing = {
    calories: Math.round(totalMacros.calories / Math.max(1, servings)),
    protein_g: Math.round((totalMacros.protein_g / Math.max(1, servings)) * 10) / 10,
    carbs_g: Math.round((totalMacros.carbs_g / Math.max(1, servings)) * 10) / 10,
    fat_g: Math.round((totalMacros.fat_g / Math.max(1, servings)) * 10) / 10,
  };

  function handleSave() {
    setError("");
    startTransition(async () => {
      const { error } = await buildRecipe({ name, ingredients, servings });
      if (error) { setError(error); return; }
      onSaved();
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-safe pt-5 pb-4 border-b border-border/50 shrink-0">
        <button type="button" onClick={onClose} className="p-1.5 press text-muted-foreground">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <div>
          <p className="font-bold text-base">Recipe Builder</p>
          <p className="text-xs text-muted-foreground capitalize">{step === "name" ? "Step 1 of 3" : step === "ingredients" ? "Step 2 of 3" : "Step 3 of 3"}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

        {/* Step 1: Name */}
        {step === "name" && (
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Recipe Name</p>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Chicken Rice Bowl"
                className="w-full bg-foreground/8 rounded-xl px-4 h-11 text-sm outline-none placeholder:text-muted-foreground/60"
              />
            </div>
            <button
              type="button"
              disabled={!name.trim()}
              onClick={() => setStep("ingredients")}
              className="w-full py-3.5 bg-primary text-primary-foreground font-bold rounded-full press disabled:opacity-40 text-sm"
            >
              Next: Add Ingredients →
            </button>
          </div>
        )}

        {/* Step 2: Ingredients */}
        {step === "ingredients" && (
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Search Ingredients</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="e.g. chicken breast"
                  className="flex-1 bg-foreground/8 rounded-xl px-4 h-10 text-sm outline-none placeholder:text-muted-foreground/60"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={searching || !query.trim()}
                  className="px-4 h-10 bg-primary text-primary-foreground text-sm font-semibold rounded-xl press disabled:opacity-40"
                >
                  {searching ? "..." : "Search"}
                </button>
              </div>
            </div>

            {/* Results */}
            {results.length > 0 && (
              <div className="glass rounded-2xl overflow-hidden">
                {results.slice(0, 8).map((food, i) => (
                  <IngredientPickRow key={i} food={food} onAdd={addIngredient} />
                ))}
              </div>
            )}

            {/* Added ingredients */}
            {ingredients.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Added ({ingredients.length})</p>
                <div className="space-y-1.5">
                  {ingredients.map((ing, i) => (
                    <div key={i} className="flex items-center justify-between bg-foreground/5 rounded-xl px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate">{ing.food_name}</p>
                        <p className="text-[10px] text-muted-foreground">{ing.qty} {ing.unit} · {ing.calories} kcal</p>
                      </div>
                      <button type="button" onClick={() => removeIngredient(i)} className="ml-2 text-muted-foreground/50 press p-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={ingredients.length === 0}
              onClick={() => setStep("servings")}
              className="w-full py-3.5 bg-primary text-primary-foreground font-bold rounded-full press disabled:opacity-40 text-sm"
            >
              Next: Set Servings →
            </button>
          </div>
        )}

        {/* Step 3: Servings */}
        {step === "servings" && (
          <div className="space-y-4">
            <div className="glass widget-shadow rounded-2xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Number of Servings</p>
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setServings((s) => Math.max(1, s - 1))}
                  className="w-10 h-10 rounded-full bg-foreground/8 flex items-center justify-center text-lg font-bold press"
                >−</button>
                <p className="text-3xl font-bold tabular-nums">{servings}</p>
                <button
                  type="button"
                  onClick={() => setServings((s) => s + 1)}
                  className="w-10 h-10 rounded-full bg-foreground/8 flex items-center justify-center text-lg font-bold press"
                >+</button>
              </div>
            </div>

            {/* Per serving preview */}
            <div className="glass widget-shadow rounded-2xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Per Serving</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Cal",  value: perServing.calories, sub: "kcal" },
                  { label: "Pro",  value: perServing.protein_g, sub: "g" },
                  { label: "Carb", value: perServing.carbs_g, sub: "g" },
                  { label: "Fat",  value: perServing.fat_g, sub: "g" },
                ].map(({ label, value, sub }) => (
                  <div key={label} className="bg-foreground/5 rounded-xl p-2.5 text-center">
                    <p className="text-sm font-bold text-primary">{value}<span className="text-[10px] font-normal text-muted-foreground">{sub}</span></p>
                    <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-rose-400 text-center">{error}</p>}

            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="w-full py-3.5 bg-primary text-primary-foreground font-bold rounded-full press disabled:opacity-50 text-sm"
            >
              {isPending ? "Saving..." : `Save "${name}"`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function IngredientPickRow({ food, onAdd }: { food: FoodResult; onAdd: (f: FoodResult, qty: number) => void }) {
  const [qty, setQty] = useState(1);
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{food.name}</p>
        <p className="text-[10px] text-muted-foreground">{food.calories} kcal / {food.serving_unit}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button type="button" onClick={() => setQty((q) => Math.max(0.25, q - 0.25))} className="w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-bold press">−</button>
        <span className="text-sm font-semibold tabular-nums w-6 text-center">{qty}</span>
        <button type="button" onClick={() => setQty((q) => q + 0.25)} className="w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center text-xs font-bold press">+</button>
        <button type="button" onClick={() => onAdd(food, qty)} className="ml-1 px-2.5 h-7 bg-primary text-primary-foreground text-[11px] font-bold rounded-full press">Add</button>
      </div>
    </div>
  );
}
