"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type GroceryItem = { name: string; qty: number; unit: string; category: string; checked: boolean };

const CATEGORY_ORDER = ["Protein", "Produce", "Dairy", "Grains & Carbs", "Pantry", "Other"];

export default function GroceryPage() {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [weekNumber, setWeekNumber] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

      const startDate = new Date(profile.program_start_date);
      const now = new Date();
      const week = Math.ceil((Math.floor((now.getTime() - startDate.getTime()) / 86400000) + 1) / 7);
      setWeekNumber(week);

      const { data: list } = await supabase
        .from("grocery_lists")
        .select("*")
        .eq("user_id", user!.id)
        .eq("week_number", week)
        .single();

      if (list) setItems(list.items as GroceryItem[]);
      setLoading(false);
    }
    load();
  }, []);

  function toggle(index: number) {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, checked: !item.checked } : item));
  }

  const byCategory = CATEGORY_ORDER.reduce((acc, cat) => {
    acc[cat] = items.filter((i) => i.category === cat);
    return acc;
  }, {} as Record<string, GroceryItem[]>);

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Grocery List</h1>
          <p className="text-muted-foreground text-sm mt-1">Week {weekNumber}</p>
        </div>
        {items.length > 0 && (
          <Badge variant="outline">{checkedCount}/{items.length} checked</Badge>
        )}
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : items.length > 0 ? (
        <div className="space-y-4">
          {CATEGORY_ORDER.map((cat) => byCategory[cat].length > 0 && (
            <Card key={cat}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{cat}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {byCategory[cat].map((item, i) => {
                    const globalIndex = items.indexOf(item);
                    return (
                      <label key={i} className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => toggle(globalIndex)}
                          className="h-4 w-4 rounded"
                        />
                        <span className={`text-sm flex-1 ${item.checked ? "line-through text-muted-foreground" : ""}`}>
                          {item.name}
                        </span>
                        <span className="text-xs text-muted-foreground">{item.qty} {item.unit}</span>
                      </label>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No grocery list yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Your list will be generated from your meal plan.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
