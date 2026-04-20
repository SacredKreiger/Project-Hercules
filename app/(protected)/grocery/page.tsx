"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/Skeleton";
import { regenerateGroceryList } from "@/lib/actions/grocery-list";

type GroceryItem = { name: string; qty: number; unit: string; category: string; checked: boolean; cost: number };

const CATEGORY_ORDER = ["Protein", "Produce", "Dairy", "Grains & Carbs", "Pantry", "Other"];

const CATEGORY_ICONS: Record<string, string> = {
  "Protein":        "🥩",
  "Produce":        "🥦",
  "Dairy":          "🥛",
  "Grains & Carbs": "🌾",
  "Pantry":         "🫙",
  "Other":          "🛒",
};

const STORES = [
  { id: "walmart",  label: "Walmart",    multiplier: 1.00 },
  { id: "target",   label: "Target",     multiplier: 1.10 },
  { id: "samsclub", label: "Sam's Club", multiplier: 0.80 },
  { id: "costco",   label: "Costco",     multiplier: 0.75 },
] as const;

type StoreId = typeof STORES[number]["id"];
const STORE_KEY = "hc-store-pref";

export default function GroceryPage() {
  const [items,    setItems]   = useState<GroceryItem[]>([]);
  const [userId,   setUserId]  = useState<string | null>(null);
  const [loading,  setLoading] = useState(true);
  const [expanded,      setExpanded]      = useState<Set<string>>(new Set());
  const [regenerating,  setRegenerating]  = useState(false);
  const [store,         setStore]         = useState<StoreId>("walmart");
  const [storePicker,   setStorePicker]   = useState(false);
  const [addOpen,       setAddOpen]       = useState(false);
  const [customName,    setCustomName]    = useState("");
  const [customQty,     setCustomQty]     = useState("1");
  const [customUnit,    setCustomUnit]    = useState("");
  const [customCat,     setCustomCat]     = useState("Other");

  useEffect(() => {
    const saved = localStorage.getItem(STORE_KEY) as StoreId | null;
    if (saved && STORES.some((s) => s.id === saved)) setStore(saved);
  }, []);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setUserId(user.id);
    const { data: list } = await supabase
      .from("grocery_lists").select("*")
      .eq("user_id", user.id).eq("week_number", 0).single();
    if (list) setItems(list.items as GroceryItem[]);
    setLoading(false);
  }

  async function toggle(index: number) {
    const updated = items.map((item, i) => i === index ? { ...item, checked: !item.checked } : item);
    setItems(updated);
    if (!userId) return;
    const supabase = createClient();
    await supabase.from("grocery_lists")
      .update({ items: updated })
      .eq("user_id", userId).eq("week_number", 0);
  }

  async function clearChecked() {
    const updated = items.map((item) => ({ ...item, checked: false }));
    setItems(updated);
    if (!userId) return;
    const supabase = createClient();
    await supabase.from("grocery_lists")
      .update({ items: updated })
      .eq("user_id", userId).eq("week_number", 0);
  }

  function toggleCategory(cat: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  }

  const byCategory = CATEGORY_ORDER.reduce((acc, cat) => {
    acc[cat] = items.filter((i) => i.category === cat);
    return acc;
  }, {} as Record<string, GroceryItem[]>);

  const checkedCount   = items.filter((i) => i.checked).length;
  const totalCount     = items.length;
  const multiplier     = STORES.find((s) => s.id === store)?.multiplier ?? 1.0;
  const totalCost      = items.reduce((s, i) => s + (i.cost ?? 0), 0) * multiplier;
  const remainingCost  = items.filter((i) => !i.checked).reduce((s, i) => s + (i.cost ?? 0), 0) * multiplier;

  function selectStore(id: StoreId) {
    setStore(id);
    localStorage.setItem(STORE_KEY, id);
  }

  async function handleRegenerate() {
    setRegenerating(true);
    const { error } = await regenerateGroceryList();
    if (!error) await load();
    setRegenerating(false);
  }

  async function addCustomItem(e: React.FormEvent) {
    e.preventDefault();
    const newItem: GroceryItem = {
      name: customName.trim(),
      qty: parseFloat(customQty) || 1,
      unit: customUnit.trim() || "item",
      category: customCat,
      checked: false,
      cost: 0,
    };
    const updated = [...items, newItem];
    setItems(updated);
    if (userId) {
      const supabase = createClient();
      await supabase.from("grocery_lists")
        .update({ items: updated })
        .eq("user_id", userId).eq("week_number", 0);
    }
    setCustomName(""); setCustomQty("1"); setCustomUnit(""); setCustomCat("Other");
    setAddOpen(false);
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Grocery List</h1>
        <button
          type="button"
          onClick={handleRegenerate}
          disabled={regenerating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all press disabled:opacity-50"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={regenerating ? "animate-spin" : ""}>
            <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
          </svg>
          {regenerating ? "Rebuilding..." : "Regenerate"}
        </button>
      </div>

      {/* Cost + progress + store (single card) */}
      {totalCount > 0 && !loading && (
        <div className="glass widget-shadow rounded-2xl p-4 space-y-3">

          {/* Top row: total + remaining */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold tabular-nums tracking-tight">${totalCost.toFixed(2)}</p>
              {/* Store chip — tap to open picker */}
              <button
                type="button"
                onClick={() => setStorePicker((v) => !v)}
                className="flex items-center gap-1 mt-1 press"
              >
                <span className="text-xs text-muted-foreground">at {STORES.find((s) => s.id === store)?.label}</span>
                <svg
                  width="11" height="11" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className={`text-muted-foreground transition-transform duration-200 ${storePicker ? "rotate-180" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
            </div>
            {checkedCount > 0 && checkedCount < totalCount && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Remaining</p>
                <p className="text-lg font-semibold tabular-nums">${remainingCost.toFixed(2)}</p>
              </div>
            )}
          </div>

          {/* Inline store picker — only visible when open */}
          {storePicker && (
            <div className="grid grid-cols-4 gap-1.5 pt-0.5">
              {STORES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { selectStore(s.id); setStorePicker(false); }}
                  className={`py-1.5 rounded-xl text-[11px] font-semibold transition-all press ${
                    store === s.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-foreground/5 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Progress bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Progress</span>
              <span className="text-xs font-medium tabular-nums">{checkedCount} / {totalCount}</span>
            </div>
            <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${(checkedCount / totalCount) * 100}%` }}
              />
            </div>
          </div>

          {checkedCount === totalCount ? (
            <div className="flex items-center justify-between">
              <p className="text-xs text-emerald-500 font-semibold">All items checked — you&apos;re all set!</p>
              <button type="button" onClick={clearChecked} className="text-xs text-muted-foreground underline underline-offset-2 press">
                Clear all
              </button>
            </div>
          ) : checkedCount > 0 && (
            <div className="flex justify-end">
              <button type="button" onClick={clearChecked} className="text-xs text-muted-foreground underline underline-offset-2 press">
                Clear checked
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && items.length === 0 && (
        <div className="glass widget-shadow rounded-2xl px-6 py-14 text-center space-y-3">
          <p className="text-2xl">🛒</p>
          <p className="font-semibold">No grocery list yet</p>
          <p className="text-sm text-muted-foreground">
            Set up your meal plan and your grocery list will appear here automatically.
          </p>
          <a
            href="/meals"
            className="mt-1 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold press inline-block"
          >
            Go to Meal Plan →
          </a>
        </div>
      )}

      {/* Collapsible category sections */}
      {!loading && items.length > 0 && (
        CATEGORY_ORDER.map((cat) => {
          const catItems = byCategory[cat];
          if (!catItems?.length) return null;
          const isOpen    = expanded.has(cat);
          const doneCount = catItems.filter((i) => i.checked).length;
          const allDone   = doneCount === catItems.length;

          return (
            <div key={cat} className="glass widget-shadow rounded-2xl overflow-hidden">
              {/* Category header — tap to expand/collapse */}
              <button
                type="button"
                onClick={() => toggleCategory(cat)}
                className="w-full flex items-center gap-3 px-4 py-4 text-left press active:bg-foreground/5 transition-colors"
              >
                <span className="text-xl shrink-0">{CATEGORY_ICONS[cat]}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${allDone ? "line-through text-muted-foreground" : ""}`}>{cat}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {allDone ? "All done" : `${catItems.length - doneCount} item${catItems.length - doneCount !== 1 ? "s" : ""} remaining`}
                  </p>
                </div>
                <span className={`text-xs tabular-nums shrink-0 mr-1.5 ${allDone ? "text-emerald-500 font-semibold" : "text-muted-foreground"}`}>
                  {doneCount}/{catItems.length}
                </span>
                <svg
                  width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className={`text-muted-foreground shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Items — only shown when expanded */}
              {isOpen && (
                <div className="divide-y divide-border border-t border-border">
                  {catItems.map((item) => {
                    const globalIndex = items.findIndex((i) => i === item);
                    return (
                      <label
                        key={`${item.category}-${item.name}`}
                        onClick={() => toggle(globalIndex)}
                        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer press active:bg-foreground/5 transition-colors"
                      >
                        <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          item.checked ? "border-primary bg-primary" : "border-border"
                        }`}>
                          {item.checked && (
                            <svg className="h-2.5 w-2.5 text-primary-foreground" fill="none" viewBox="0 0 12 12">
                              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <span className={`text-sm flex-1 capitalize transition-opacity ${item.checked ? "line-through text-muted-foreground opacity-50" : ""}`}>
                          {item.name}
                        </span>
                        <span className={`text-xs font-semibold tabular-nums bg-foreground/5 px-3 py-1.5 rounded-full transition-opacity ${item.checked ? "opacity-40" : ""}`}>
                          {item.qty} {item.unit}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Custom item */}
      {!loading && items.length > 0 && (
        <div className="space-y-2">
          {addOpen && (
            <form
              onSubmit={addCustomItem}
              className="glass widget-shadow rounded-2xl p-4 space-y-3"
            >
              <input
                required
                type="text"
                placeholder="e.g. Greek yogurt"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full rounded-xl bg-foreground/5 border border-border h-10 px-3 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={customQty}
                  onChange={(e) => setCustomQty(e.target.value)}
                  className="w-20 shrink-0 rounded-xl bg-foreground/5 border border-border h-10 px-3 text-sm outline-none focus:ring-1 focus:ring-primary"
                />
                <input
                  type="text"
                  placeholder="e.g. container"
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value)}
                  className="flex-1 rounded-xl bg-foreground/5 border border-border h-10 px-3 text-sm outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <select
                value={customCat}
                onChange={(e) => setCustomCat(e.target.value)}
                className="w-full rounded-xl bg-foreground/5 border border-border h-10 px-3 text-sm outline-none focus:ring-1 focus:ring-primary"
              >
                {CATEGORY_ORDER.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAddOpen(false)}
                  className="flex-1 h-10 rounded-xl bg-foreground/5 text-sm font-semibold press"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold press"
                >
                  Add
                </button>
              </div>
            </form>
          )}
          {!addOpen && (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="w-full text-sm text-primary font-semibold press py-2"
            >
              + Add item
            </button>
          )}
        </div>
      )}
    </div>
  );
}
