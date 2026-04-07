import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function MealsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
  if (!profile) redirect("/onboarding");

  const startDate = new Date(profile.program_start_date);
  const now = new Date();
  const weekNumber = Math.ceil((Math.floor((now.getTime() - startDate.getTime()) / 86400000) + 1) / 7);
  const todayDow = now.getDay();

  const { data: mealPlan } = await supabase
    .from("meal_plans").select("*, recipes(*)")
    .eq("user_id", user!.id).eq("week_number", weekNumber)
    .order("day_of_week").order("meal_slot");

  const byDay: Record<number, any[]> = {};
  (mealPlan ?? []).forEach((entry: any) => {
    if (!byDay[entry.day_of_week]) byDay[entry.day_of_week] = [];
    byDay[entry.day_of_week].push(entry);
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meal Plan</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Week {weekNumber} · <span className="capitalize">{profile.phase}</span> phase</p>
      </div>

      {mealPlan && mealPlan.length > 0 ? (
        DAYS.map((day, dow) => (
          <div
            key={dow}
            className={`glass widget-shadow rounded-2xl overflow-hidden transition-all ${dow === todayDow ? "ring-1 ring-primary/40" : ""}`}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{day}</span>
                {dow === todayDow && (
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-primary px-2 py-0.5 glass rounded-full">Today</span>
                )}
              </div>
              {byDay[dow]?.[0] && (
                <span className="text-xs text-muted-foreground capitalize">{byDay[dow][0].day_type} day</span>
              )}
            </div>
            {byDay[dow] && byDay[dow].length > 0 ? (
              <div className="divide-y divide-border">
                {byDay[dow].map((entry: any) => (
                  <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Meal {entry.meal_slot}</p>
                      <p className="text-sm font-medium mt-0.5">{entry.recipes?.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{entry.recipes?.cuisine}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{entry.recipes?.calories} kcal</p>
                      <p className="text-xs text-muted-foreground">{entry.recipes?.protein_g}g P · {entry.recipes?.carbs_g}g C</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-4 py-4 text-sm text-muted-foreground">No meals planned.</p>
            )}
          </div>
        ))
      ) : (
        <div className="glass widget-shadow rounded-2xl px-4 py-12 text-center">
          <p className="text-muted-foreground text-sm">Your meal plan hasn&apos;t been generated yet.</p>
          <a href="/meals/setup" className="text-xs text-primary font-semibold mt-1.5 inline-block press">Set up meal plan →</a>
        </div>
      )}
    </div>
  );
}
