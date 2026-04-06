import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { redirect } from "next/navigation";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function MealsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
  if (!profile) redirect("/onboarding");

  const startDate = new Date(profile.program_start_date);
  const now = new Date();
  const weekNumber = Math.ceil((Math.floor((now.getTime() - startDate.getTime()) / 86400000) + 1) / 7);

  const { data: mealPlan } = await supabase
    .from("meal_plans")
    .select("*, recipes(*)")
    .eq("user_id", user!.id)
    .eq("week_number", weekNumber)
    .order("day_of_week")
    .order("meal_slot");

  const byDay: Record<number, any[]> = {};
  (mealPlan ?? []).forEach((entry: any) => {
    if (!byDay[entry.day_of_week]) byDay[entry.day_of_week] = [];
    byDay[entry.day_of_week].push(entry);
  });

  const todayDow = now.getDay();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meal Plan</h1>
        <p className="text-muted-foreground text-sm mt-1">Week {weekNumber} · {profile.phase} phase</p>
      </div>

      {mealPlan && mealPlan.length > 0 ? (
        <div className="grid gap-4">
          {DAYS.map((day, dow) => (
            <Card key={dow} className={dow === todayDow ? "border-primary" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {day}
                    {dow === todayDow && <Badge variant="default" className="text-xs">Today</Badge>}
                  </CardTitle>
                  {byDay[dow]?.[0] && (
                    <Badge variant="outline" className="capitalize text-xs">{byDay[dow][0].day_type} day</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {byDay[dow] && byDay[dow].length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {byDay[dow].map((entry: any) => (
                      <div key={entry.id} className="bg-muted rounded-lg p-3">
                        <p className="text-xs text-muted-foreground mb-1">Meal {entry.meal_slot}</p>
                        <p className="text-sm font-medium leading-tight">{entry.recipes?.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{entry.recipes?.calories} kcal · {entry.recipes?.protein_g}g P</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No meals planned for this day.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Your meal plan hasn&apos;t been generated yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Meal plan generation coming soon.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
