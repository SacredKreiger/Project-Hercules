"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/Skeleton";

type GroceryItem = { name: string; qty: number; unit: string; category: string; checked: boolean };

const CATEGORY_ORDER = ["Protein", "Produce", "Dairy", "Grains & Carbs", "Pantry", "Other"];

const CATEGORY_ICONS: Record<string, string> = {
  "Protein":        "🥩",
  "Produce":        "🥦",
  "Dairy":          "🥛",
  "Grains & Carbs": "🌾",
  "Pantry":         "🫙",
  "Other":          "🛒",
};

export default function GroceryPage() {
  const [items,    setItems]   = useState<GroceryItem[]>([]);
  const [userId,   setUserId]  = useState<string | null>(null);
  const [loading,  setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

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

  const checkedCount = items.filter((i) => i.checked).length;
  const totalCount   = items.length;

  return (
    <div className="space-y-4">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Grocery List</h1>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && !loading && (
        <div className="glass widget-shadow rounded-2xl p-4 space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold">Shopping progress</span>
            <span className="text-xs font-medium tabular-nums glass rounded-full px-3 py-1 widget-shadow">
              {checkedCount} / {totalCount}
            </span>
          </div>
          <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
          {checkedCount === totalCount && totalCount > 0 && (
            <p className="text-xs text-emerald-500 font-semibold">All items checked — you&apos;re all set!</p>
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
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left press active:bg-foreground/5 transition-colors"
              >
                <span className="text-base">{CATEGORY_ICONS[cat]}</span>
                <span className={`text-sm font-semibold flex-1 ${allDone ? "line-through text-muted-foreground" : ""}`}>
                  {cat}
                </span>
                <span className={`text-xs tabular-nums mr-1 ${allDone ? "text-emerald-500 font-semibold" : "text-muted-foreground"}`}>
                  {doneCount}/{catItems.length}
                </span>
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  className={`text-muted-foreground transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* Items — only shown when expanded */}
              {isOpen && (
                <div className="divide-y divide-border border-t border-border">
                  {catItems.map((item) => {
                    const globalIndex = items.indexOf(item);
                    return (
                      <label
                        key={globalIndex}
                        onClick={() => toggle(globalIndex)}
                        className="flex items-center gap-3 px-4 py-3 cursor-pointer press active:bg-foreground/5 transition-colors"
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
                        <span className={`text-xs font-semibold tabular-nums glass px-2.5 py-1 rounded-full transition-opacity ${item.checked ? "opacity-40" : ""}`}>
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
    </div>
  );
}
