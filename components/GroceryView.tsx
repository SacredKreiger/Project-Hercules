"use client";

import { useState, useEffect, useCallback } from "react";
import { getGroceryList, type MealPlanRow, type GroceryItem } from "@/lib/actions/meal-plan";

const DAY_OPTIONS = [7, 14, 30] as const;
type DayOption = (typeof DAY_OPTIONS)[number];

interface Props {
  plans: MealPlanRow[];
  initialPlanId: string | null;
}

export default function GroceryView({ plans, initialPlanId }: Props) {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(initialPlanId ?? plans[0]?.id ?? "");
  const [days, setDays] = useState<DayOption>(7);
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async (planId: string, numDays: DayOption) => {
    if (!planId) return;
    setLoading(true);
    setError(null);
    const result = await getGroceryList(planId, numDays);
    if (result.error) {
      setError(result.error);
    } else {
      setItems(result.items);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadItems(selectedPlanId, days);
  }, [selectedPlanId, days, loadItems]);

  function toggleItem(name: string) {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  // Group by category
  const grouped = items.reduce<Record<string, GroceryItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const categories = Object.keys(grouped).sort();
  const checkedCount = checkedItems.size;
  const totalCount = items.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">Grocery</p>
        <h1 className="text-xl font-bold tracking-tight mt-0.5">Shopping List</h1>
      </div>

      {/* Plan selector */}
      {plans.length > 1 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Plan</p>
          <div className="flex flex-wrap gap-2">
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => { setSelectedPlanId(plan.id); setCheckedItems(new Set()); }}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold press transition-all ${
                  selectedPlanId === plan.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-foreground/8 text-muted-foreground"
                }`}
              >
                {plan.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Days toggle */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Duration</p>
        <div className="flex gap-2">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              className={`flex-1 rounded-full py-1.5 text-xs font-semibold press transition-all ${
                days === d
                  ? "bg-primary text-primary-foreground"
                  : "bg-foreground/8 text-muted-foreground"
              }`}
            >
              {d} days
            </button>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      {!loading && totalCount > 0 && (
        <div className="glass widget-shadow rounded-2xl px-4 py-3 flex items-center gap-3">
          <div className="flex-1">
            <div className="flex justify-between mb-1.5">
              <p className="text-xs font-semibold">In Cart</p>
              <p className="text-xs text-muted-foreground tabular-nums">{checkedCount} / {totalCount}</p>
            </div>
            <div className="h-1.5 bg-foreground/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%` }}
              />
            </div>
          </div>
          {checkedCount > 0 && (
            <button
              type="button"
              onClick={() => setCheckedItems(new Set())}
              className="text-[11px] text-muted-foreground font-semibold press shrink-0"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Items */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="glass widget-shadow rounded-2xl px-4 py-6 text-center">
          <p className="text-sm text-rose-400 font-medium">{error}</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 text-center px-8 gap-2">
          <p className="text-sm text-muted-foreground">No items found for this plan.</p>
        </div>
      ) : (
        <div className="space-y-4 pb-10">
          {categories.map((category) => (
            <div key={category}>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2 px-1">
                {category}
              </p>
              <div className="glass widget-shadow rounded-2xl overflow-hidden divide-y divide-border/30">
                {grouped[category].map((item) => {
                  const isChecked = checkedItems.has(item.name.toLowerCase());
                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => toggleItem(item.name.toLowerCase())}
                      className="w-full flex items-center gap-3 px-4 py-3.5 text-left active:bg-foreground/5 transition-colors"
                    >
                      {/* Checkbox */}
                      <div
                        className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          isChecked
                            ? "bg-primary border-primary"
                            : "border-border/60"
                        }`}
                      >
                        {isChecked && (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold leading-snug ${isChecked ? "line-through text-muted-foreground/50" : ""}`}>
                          {item.name}
                        </p>
                      </div>
                      <p className={`text-xs tabular-nums shrink-0 ${isChecked ? "text-muted-foreground/40" : "text-muted-foreground"}`}>
                        {item.qty} {item.unit}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
