import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { redirect } from "next/navigation";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function TrainPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
  if (!profile) redirect("/onboarding");

  const startDate = new Date(profile.program_start_date);
  const now = new Date();
  const weekNumber = Math.ceil((Math.floor((now.getTime() - startDate.getTime()) / 86400000) + 1) / 7);
  const todayDow = now.getDay();

  const { data: workouts } = await supabase
    .from("training_plans")
    .select("*")
    .eq("user_id", user!.id)
    .eq("week_number", weekNumber)
    .order("day_of_week");

  const byDay: Record<number, any> = {};
  (workouts ?? []).forEach((w: any) => { byDay[w.day_of_week] = w; });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Training</h1>
        <p className="text-muted-foreground text-sm mt-1">Week {weekNumber} · {profile.phase} phase</p>
      </div>

      {workouts && workouts.length > 0 ? (
        <div className="grid gap-4">
          {DAYS.map((day, dow) => {
            const workout = byDay[dow];
            return (
              <Card key={dow} className={dow === todayDow ? "border-primary" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      {day}
                      {dow === todayDow && <Badge variant="default" className="text-xs">Today</Badge>}
                    </CardTitle>
                    {workout && (
                      <Badge variant={workout.is_rest_day ? "secondary" : "outline"} className="text-xs">
                        {workout.is_rest_day ? "Rest" : workout.workout_name}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                {workout && !workout.is_rest_day && workout.exercises && (
                  <CardContent>
                    <div className="space-y-2">
                      {(workout.exercises as any[]).map((ex: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                          <span className="font-medium">{ex.name}</span>
                          <div className="text-right text-muted-foreground">
                            <span>{ex.sets} sets × {ex.reps} reps</span>
                            {ex.rest_sec && <span className="ml-2 text-xs">{ex.rest_sec}s rest</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
                {workout?.is_rest_day && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Rest & recovery day. Prioritize sleep and hydration.</p>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No training plan yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Training plan generation coming soon.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
