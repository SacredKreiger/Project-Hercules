import { createClient } from "@/lib/supabase/server";
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
    .from("training_plans").select("*")
    .eq("user_id", user!.id).eq("week_number", weekNumber)
    .order("day_of_week");

  const byDay: Record<number, any> = {};
  (workouts ?? []).forEach((w: any) => { byDay[w.day_of_week] = w; });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Training</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Week {weekNumber} · <span className="capitalize">{profile.phase}</span> phase</p>
      </div>

      {workouts && workouts.length > 0 ? (
        DAYS.map((day, dow) => {
          const workout = byDay[dow];
          return (
            <div
              key={dow}
              className={`glass widget-shadow rounded-2xl overflow-hidden ${dow === todayDow ? "ring-1 ring-primary/40" : ""}`}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{day}</span>
                  {dow === todayDow && (
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-primary px-2 py-0.5 glass rounded-full">Today</span>
                  )}
                </div>
                {workout && (
                  <span className={`text-xs font-medium ${workout.is_rest_day ? "text-muted-foreground" : "text-primary"}`}>
                    {workout.is_rest_day ? "Rest" : workout.workout_name}
                  </span>
                )}
              </div>
              {workout && !workout.is_rest_day && workout.exercises && (
                <div className="divide-y divide-border">
                  {(workout.exercises as any[]).map((ex: any, i: number) => (
                    <div key={i} className="flex items-center justify-between px-4 py-3">
                      <span className="text-sm">{ex.name}</span>
                      <div className="text-right">
                        <span className="text-xs font-medium text-muted-foreground">{ex.sets}×{ex.reps}</span>
                        {ex.rest_sec && <span className="text-xs text-muted-foreground ml-2">{ex.rest_sec}s</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {workout?.is_rest_day && (
                <p className="px-4 py-4 text-sm text-muted-foreground">Rest & recovery. Prioritize sleep and hydration.</p>
              )}
              {!workout && (
                <p className="px-4 py-4 text-sm text-muted-foreground">No workout scheduled.</p>
              )}
            </div>
          );
        })
      ) : (
        <div className="glass widget-shadow rounded-2xl px-4 py-12 text-center">
          <p className="text-sm text-muted-foreground">No training plan yet.</p>
        </div>
      )}
    </div>
  );
}
