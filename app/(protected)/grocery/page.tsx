"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/Skeleton";

type GroceryItem = { name: string; qty: number; unit: string; category: string; checked: boolean };
const CATEGORY_ORDER = ["Protein", "Produce", "Dairy", "Grains & Carbs", "Pantry", "Other"];

export default function GroceryPage() {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [weekNumber, setWeekNumber] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data: profile } = await supabase.from("profiles").select("program_start_date").eq("id", user.id).single();
      if (!profile) { setLoading(false); return; }
      const startDate = new Date(profile.program_start_date);
      const now = new Date();
      const week = Math.ceil((Math.floor((now.getTime() - startDate.getTime()) / 86400000) + 1) / 7);
      setWeekNumber(week);
      const { data: list } = await supabase.from("grocery_lists").select("*")
        .eq("user_id", user.id).eq("week_number", week).single();
      if (list) setItems(list.items as GroceryItem[]);
      setLoading(false);
    }
    load();
  }, []);

  async function toggle(index: number) {
    const updated = items.map((item, i) => i === index ? { ...item, checked: !item.checked } : item);
    setItems(updated);
    // Persist checked state back to Supabase so it survives a page refresh
    if (!userId) return;
    const supabase = createClient();
    await supabase.from("grocery_lists")
      .update({ items: updated })
      .eq("user_id", userId).eq("week_number", weekNumber);
  }

  const byCategory = CATEGORY_ORDER.reduce((acc, cat) => {
    acc[cat] = items.filter((i) => i.category === cat);
    return acc;
  }, {} as Record<string, GroceryItem[]>);

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Grocery List</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Week {weekNumber}</p>
        </div>
        {items.length > 0 && (
          <span className="text-xs font-medium glass rounded-full px-3 py-1.5 widget-shadow">
            {checkedCount}/{items.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0,1,2,3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
        </div>
      ) : items.length > 0 ? (
        CATEGORY_ORDER.map((cat) => byCategory[cat].length > 0 && (
          <div key={cat} className="glass widget-shadow rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{cat}</p>
            </div>
            <div className="divide-y divide-border">
              {byCategory[cat].map((item, i) => {
                const globalIndex = items.indexOf(item);
                return (
                  <label key={i} className="flex items-center gap-3 px-4 py-3 cursor-pointer press active:bg-foreground/5 transition-colors"
                    onClick={() => toggle(globalIndex)}>
                    <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${item.checked ? "border-primary bg-primary" : "border-border"}`}>
                      {item.checked && (
                        <svg className="h-2.5 w-2.5 text-primary-foreground" fill="none" viewBox="0 0 12 12">
                          <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-sm flex-1 ${item.checked ? "line-through text-muted-foreground" : ""}`}>
                      {item.name}
                    </span>
                    <span className="text-xs text-muted-foreground">{item.qty} {item.unit}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))
      ) : (
        <div className="glass widget-shadow rounded-2xl px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">No grocery list yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Generated from your meal plan.</p>
        </div>
      )}
    </div>
  );
}
