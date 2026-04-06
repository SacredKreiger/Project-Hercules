import { createClient } from "@/lib/supabase/server";
import { calcBMR, calcTDEE, calcMacros } from "@/lib/macros";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Flame, Beef, Wheat, Droplets } from "lucide-react";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  if (!profile) redirect("/onboarding");

  const bmr = calcBMR(
    profile.current_weight_lbs,
    profile.height_cm,
    profile.age,
    profile.gender
  );
  const tdee = calcTDEE(bmr, profile.activity_level);
  const macros = calcMacros(tdee, profile.current_weight_lbs, profile.phase);

  const today = new Date().toISOString().split("T")[0];
  const dayOfWeek = new Date().getDay();

  // Fetch today's meal plan
  const startDate = new Date(profile.program_start_date);
  const now = new Date();
  const weekNumber = Math.ceil((Math.floor((now.getTime() - startDate.getTime()) / 86400000) + 1) / 7);

  const { data: todayMeals } = await supabase
    .from("meal_plans")
    .select("*, recipes(*)")
    .eq("user_id", user!.id)
    .eq("week_number", weekNumber)
    .eq("day_of_week", dayOfWeek)
    .order("meal_slot");

  // Fetch today's workout
  const { data: todayWorkout } = await supabase
    .from("training_plans")
    .select("*")
    .eq("user_id", user!.id)
    .eq("week_number", weekNumber)
    .eq("day_of_week", dayOfWeek)
    .single();

  // Fetch latest weight log
  const { data: latestLog } = await supabase
    .from("progress_logs")
    .select("*")
    .eq("user_id", user!.id)
    .order("log_date", { ascending: false })
    .limit(1)
    .single();

  const phaseBadgeColor = {
    bulk: "default",
    cut: "destructive",
    maintenance: "secondary",
  } as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Good {getGreeting()}, {profile.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">{today} · Week {weekNumber}</p>
        </div>
        <Badge variant={phaseBadgeColor[profile.phase as keyof typeof phaseBadgeColor]} className="text-sm px-3 py-1 capitalize">
          {profile.phase} Phase
        </Badge>
      </div>

      {/* Macro targets */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Calories", value: macros.calories, unit: "kcal", icon: Flame, color: "text-orange-500" },
          { label: "Protein", value: macros.protein, unit: "g", icon: Beef, color: "text-red-500" },
          { label: "Carbs", value: macros.carbs, unit: "g", icon: Wheat, color: "text-yellow-500" },
          { label: "Fat", value: macros.fat, unit: "g", icon: Droplets, color: "text-blue-500" },
        ].map(({ label, value, unit, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-4 w-4 ${color}`} />
                <span className="text-sm text-muted-foreground">{label}</span>
              </div>
              <p className="text-2xl font-bold">{value}<span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span></p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Today's Meals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s Meals</CardTitle>
          </CardHeader>
          <CardContent>
            {todayMeals && todayMeals.length > 0 ? (
              <div className="space-y-3">
                {todayMeals.map((entry: any) => (
                  <div key={entry.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">Meal {entry.meal_slot}</p>
                      <p className="text-sm text-muted-foreground">{entry.recipes?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{entry.recipes?.calories} kcal</p>
                      <p className="text-xs text-muted-foreground">{entry.recipes?.protein_g}g protein</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No meals planned yet. <a href="/meals" className="text-primary underline">Set up your meal plan.</a></p>
            )}
          </CardContent>
        </Card>

        {/* Today's Workout */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s Training</CardTitle>
          </CardHeader>
          <CardContent>
            {todayWorkout ? (
              todayWorkout.is_rest_day ? (
                <div className="text-center py-4">
                  <p className="text-lg font-semibold">Rest Day</p>
                  <p className="text-sm text-muted-foreground mt-1">Recovery is part of the program.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="font-medium">{todayWorkout.workout_name}</p>
                  {(todayWorkout.exercises as any[])?.slice(0, 4).map((ex: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-border last:border-0">
                      <span>{ex.name}</span>
                      <span className="text-muted-foreground">{ex.sets}×{ex.reps}</span>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <p className="text-sm text-muted-foreground">No workout scheduled. <a href="/train" className="text-primary underline">View training plan.</a></p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Progress snapshot */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progress</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Current Weight</span>
            <span className="font-medium">{latestLog?.weight_lbs ?? profile.current_weight_lbs} lbs</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Goal Weight</span>
            <span className="font-medium">{profile.goal_weight_lbs} lbs</span>
          </div>
          <Progress
            value={
              Math.min(
                100,
                Math.abs(
                  ((latestLog?.weight_lbs ?? profile.current_weight_lbs) - profile.current_weight_lbs) /
                  (profile.goal_weight_lbs - profile.current_weight_lbs)
                ) * 100
              )
            }
          />
          <p className="text-xs text-muted-foreground text-right">
            {Math.abs((latestLog?.weight_lbs ?? profile.current_weight_lbs) - profile.goal_weight_lbs).toFixed(1)} lbs to goal
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
