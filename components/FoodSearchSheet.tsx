"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import dynamic from "next/dynamic";
import { searchFoods, lookupBarcodeAction, getUserCustomFoods } from "@/lib/actions/food-search";
import { getRecentFoods } from "@/lib/actions/food-log";
import ServingPickerSheet from "@/components/ServingPickerSheet";
import type { FoodResult, CustomFood, MealSlot } from "@/lib/types/food";
import { SLOT_LABELS } from "@/lib/types/food";

const BarcodeScanner = dynamic(() => import("@/components/BarcodeScanner"), { ssr: false });

type Tab = "search" | "browse" | "barcode" | "myfoods" | "recipes";

const BROWSE_CATEGORIES = [
  { emoji: "🍗", label: "Chicken",      query: "chicken breast" },
  { emoji: "🥩", label: "Beef",         query: "ground beef" },
  { emoji: "🐟", label: "Fish",         query: "salmon fillet" },
  { emoji: "🥚", label: "Eggs",         query: "eggs" },
  { emoji: "🥛", label: "Dairy",        query: "greek yogurt" },
  { emoji: "🌾", label: "Grains",       query: "brown rice" },
  { emoji: "🍝", label: "Pasta",        query: "pasta" },
  { emoji: "🥦", label: "Vegetables",   query: "broccoli" },
  { emoji: "🍎", label: "Fruits",       query: "apple" },
  { emoji: "🥜", label: "Nuts & Seeds", query: "almonds" },
  { emoji: "🍫", label: "Snacks",       query: "protein bar" },
  { emoji: "🍕", label: "Fast Food",    query: "burger" },
  { emoji: "🥤", label: "Beverages",    query: "protein shake" },
  { emoji: "💊", label: "Supplements",  query: "whey protein" },
  { emoji: "🌮", label: "Mexican",      query: "burrito" },
  { emoji: "🍱", label: "Asian",        query: "sushi" },
];

interface Props {
  mealSlot: MealSlot;
  date: string;
  onClose: () => void;
  onLogged: () => void;
  onSelect?: (food: FoodResult) => void;
}

function customFoodToResult(f: CustomFood): FoodResult {
  return {
    id: f.id,
    source: "custom",
    name: f.food_name,
    brand: f.brand_name ?? undefined,
    calories: f.calories,
    protein_g: f.protein_g,
    carbs_g: f.carbs_g,
    fat_g: f.fat_g,
    fiber_g: f.fiber_g ?? undefined,
    serving_qty: f.serving_qty,
    serving_unit: f.serving_unit,
    serving_size_g: f.serving_size_g ?? undefined,
    barcode: f.barcode ?? undefined,
  };
}

export default function FoodSearchSheet({ mealSlot, date, onClose, onLogged, onSelect }: Props) {
  const [tab, setTab] = useState<Tab>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodResult[]>([]);
  const [customFoods, setCustomFoods] = useState<CustomFood[]>([]);
  const [recentFoods, setRecentFoods] = useState<FoodResult[]>([]);
  const [frequentFoods, setFrequentFoods] = useState<FoodResult[]>([]);
  const [selected, setSelected] = useState<FoodResult | null>(null);
  const [barcodeFood, setBarcodeFood] = useState<FoodResult | null>(null);
  const [barcodeStatus, setBarcodeStatus] = useState<"idle" | "loading" | "error">("idle");
  const [barcodeError, setBarcodeError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [browseQuery, setBrowseQuery] = useState<string | null>(null);
  const [browseResults, setBrowseResults] = useState<FoodResult[]>([]);
  const [isBrowsePending, startBrowseTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load custom foods + recent/frequent once
  useEffect(() => {
    getUserCustomFoods().then(({ results }) => setCustomFoods(results));
    getRecentFoods().then(({ recent, frequent }) => {
      setRecentFoods(recent);
      setFrequentFoods(frequent);
    });
  }, []);

  // Debounced search
  useEffect(() => {
    if (tab !== "search") return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const { results } = await searchFoods(query);
        setResults(results);
      });
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, tab]);

  function handleCategoryTap(query: string) {
    setBrowseQuery(query);
    startBrowseTransition(async () => {
      const { results } = await searchFoods(query);
      setBrowseResults(results);
    });
  }

  function handleFoodRowSelect(food: FoodResult) {
    if (onSelect) {
      onSelect(food);
    } else {
      setSelected(food);
    }
  }

  async function handleBarcodeDetected(barcode: string) {
    setBarcodeStatus("loading");
    setBarcodeError("");
    const { food, error } = await lookupBarcodeAction(barcode);
    if (error || !food) {
      setBarcodeStatus("error");
      setBarcodeError(error ?? "Product not found");
      return;
    }
    setBarcodeFood(food);
    setBarcodeStatus("idle");
    handleFoodRowSelect(food);
  }

  function handleLogged() {
    onLogged();
    onClose();
  }

  // ServingPicker view
  if (selected) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <ServingPickerSheet
          food={selected}
          mealSlot={mealSlot}
          date={date}
          onLogged={handleLogged}
          onBack={() => { setSelected(null); setBarcodeFood(null); setBarcodeStatus("idle"); }}
        />
      </div>
    );
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "search",  label: "Search" },
    { id: "browse",  label: "Browse" },
    { id: "barcode", label: "Barcode" },
    { id: "myfoods", label: "My Foods" },
    { id: "recipes", label: "Recipes" },
  ];

  const myFoodsFiltered = customFoods.filter((f) => !f.is_recipe);
  const recipesFiltered = customFoods.filter((f) => f.is_recipe);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-safe pt-5 pb-3 border-b border-border/50 shrink-0">
        <button type="button" onClick={onClose} className="p-1.5 press text-muted-foreground">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <div>
          <p className="font-bold text-base leading-tight">Add Food</p>
          <p className="text-xs text-muted-foreground">{SLOT_LABELS[mealSlot]}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-5 pt-3 pb-2 shrink-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 py-1.5 rounded-full text-[11px] font-semibold transition-all press ${
              tab === t.id ? "bg-primary text-primary-foreground" : "bg-foreground/8 text-muted-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search input */}
      {tab === "search" && (
        <div className="px-5 pb-2 shrink-0">
          <div className="flex items-center gap-2 bg-foreground/8 rounded-xl px-3 h-10">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground shrink-0">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search any food..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
            {isPending && <div className="w-3.5 h-3.5 border border-muted-foreground/40 border-t-foreground rounded-full animate-spin" />}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-8">

        {/* ── Search results ── */}
        {tab === "search" && (
          <div>
            {!query.trim() ? (
              <div className="pb-6">
                {recentFoods.length === 0 && frequentFoods.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center px-8">
                    <p className="text-3xl mb-2">🍎</p>
                    <p className="text-sm text-muted-foreground">Search any food, brand, or restaurant item</p>
                  </div>
                ) : (
                  <>
                    {recentFoods.length > 0 && (
                      <div>
                        <p className="px-5 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Recent</p>
                        <ul className="divide-y divide-border/30">
                          {recentFoods.map((food) => (
                            <FoodRow key={`recent-${food.id}-${food.name}`} food={food} onSelect={handleFoodRowSelect} />
                          ))}
                        </ul>
                      </div>
                    )}
                    {frequentFoods.length > 0 && (
                      <div>
                        <p className="px-5 pt-5 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Frequent</p>
                        <ul className="divide-y divide-border/30">
                          {frequentFoods.map((food) => (
                            <FoodRow key={`frequent-${food.id}-${food.name}`} food={food} onSelect={handleFoodRowSelect} />
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : results.length === 0 && !isPending ? (
              <div className="flex flex-col items-center justify-center h-48 text-center px-8">
                <p className="text-sm text-muted-foreground">No results for "{query}"</p>
                <p className="text-xs text-muted-foreground mt-1">Try the barcode scanner or add a custom food</p>
              </div>
            ) : (
              <ul className="divide-y divide-border/30">
                {results.map((food) => (
                  <FoodRow key={`${food.source}-${food.id}`} food={food} onSelect={handleFoodRowSelect} />
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── Browse categories ── */}
        {tab === "browse" && (
          <div>
            {browseQuery === null ? (
              <div>
                <p className="px-5 pt-4 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Browse by Category</p>
                <div className="grid grid-cols-2 gap-3 px-5 pt-3 pb-6">
                  {BROWSE_CATEGORIES.map((cat) => (
                    <button
                      key={cat.query}
                      type="button"
                      onClick={() => handleCategoryTap(cat.query)}
                      className="glass widget-shadow rounded-2xl p-4 flex flex-col items-center justify-center press active:scale-95 transition-transform"
                    >
                      <span className="text-3xl">{cat.emoji}</span>
                      <span className="text-xs font-semibold text-center mt-2">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <button
                  type="button"
                  onClick={() => { setBrowseQuery(null); setBrowseResults([]); }}
                  className="flex items-center gap-1.5 px-5 py-3 text-xs text-muted-foreground font-semibold press"
                >
                  ← Back to Browse
                </button>
                {isBrowsePending ? (
                  <div className="flex items-center justify-center h-48">
                    <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
                  </div>
                ) : browseResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-center px-8">
                    <p className="text-sm text-muted-foreground">No results found</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border/30">
                    {browseResults.map((food) => (
                      <FoodRow key={`${food.source}-${food.id}`} food={food} onSelect={handleFoodRowSelect} />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Barcode scanner ── */}
        {tab === "barcode" && (
          <div className="px-5 pt-3 space-y-4">
            {barcodeStatus === "loading" ? (
              <div className="flex items-center justify-center h-48">
                <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
              </div>
            ) : barcodeStatus === "error" ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
                <p className="text-sm font-semibold">{barcodeError}</p>
                <button
                  type="button"
                  onClick={() => setBarcodeStatus("idle")}
                  className="text-xs text-primary font-semibold press"
                >
                  Try again
                </button>
              </div>
            ) : (
              <BarcodeScanner
                onDetected={handleBarcodeDetected}
                onError={(msg) => { setBarcodeStatus("error"); setBarcodeError(msg); }}
              />
            )}
          </div>
        )}

        {/* ── My Foods ── */}
        {tab === "myfoods" && (
          <div>
            {myFoodsFiltered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center px-8">
                <p className="text-sm text-muted-foreground">No saved foods yet</p>
                <p className="text-xs text-muted-foreground mt-1">Foods you log will appear here</p>
              </div>
            ) : (
              <ul className="divide-y divide-border/30">
                {myFoodsFiltered.map((f) => (
                  <FoodRow key={f.id} food={customFoodToResult(f)} onSelect={handleFoodRowSelect} />
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ── Recipes ── */}
        {tab === "recipes" && (
          <div>
            {recipesFiltered.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center px-8">
                <p className="text-sm text-muted-foreground">No recipes yet</p>
                <p className="text-xs text-muted-foreground mt-1">Build a recipe from the diary page</p>
              </div>
            ) : (
              <ul className="divide-y divide-border/30">
                {recipesFiltered.map((f) => (
                  <FoodRow key={f.id} food={customFoodToResult(f)} onSelect={handleFoodRowSelect} badge="Recipe" />
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FoodRow({ food, onSelect, badge }: { food: FoodResult; onSelect: (f: FoodResult) => void; badge?: string }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(food)}
        className="w-full flex items-center gap-3 px-5 py-3.5 text-left active:bg-foreground/5 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold leading-snug truncate">{food.name}</p>
            {badge && (
              <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 bg-primary/15 text-primary rounded-full">{badge}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {food.brand ? `${food.brand} · ` : ""}{food.serving_qty} {food.serving_unit}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold tabular-nums">{food.calories}</p>
          <p className="text-[10px] text-muted-foreground tabular-nums">{food.protein_g}P · {food.carbs_g}C · {food.fat_g}F</p>
        </div>
      </button>
    </li>
  );
}
