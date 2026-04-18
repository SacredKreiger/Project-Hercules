"use server";

import { createClient } from "@/lib/supabase/server";
import { TEMPLATES } from "@/lib/templates";
import type { ProgramDay } from "@/lib/templates";

// ── Program management ────────────────────────────────────────────────────

export async function createProgram(name: string, days: ProgramDay[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", data: null };

  // Deactivate any existing programs
  await supabase.from("user_programs")
    .update({ is_active: false })
    .eq("user_id", user.id);

  const { data, error } = await supabase
    .from("user_programs")
    .insert({ user_id: user.id, name, structure: { days }, is_active: true })
    .select()
    .single();

  if (error) return { error: error.message, data: null };
  return { error: null, data };
}

export async function createProgramFromTemplate(templateId: string) {
  const template = TEMPLATES.find((t) => t.id === templateId);
  if (!template) return { error: "Template not found", data: null };
  return createProgram(template.name, template.days);
}

export async function deleteActiveProgram() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  await supabase.from("user_programs")
    .update({ is_active: false })
    .eq("user_id", user.id);

  return { error: null };
}

// ── Workout logging ───────────────────────────────────────────────────────

export async function getOrCreateWorkoutLog(
  programId: string,
  dayOfWeek: number,
  dayName: string,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", data: null };

  const today = new Date().toISOString().split("T")[0];

  const { data: existing } = await supabase
    .from("workout_logs")
    .select("*")
    .eq("user_id", user.id)
    .eq("log_date", today)
    .single();

  if (existing) return { error: null, data: existing };

  const { data, error } = await supabase
    .from("workout_logs")
    .insert({
      user_id: user.id,
      program_id: programId,
      log_date: today,
      day_of_week: dayOfWeek,
      day_name: dayName,
      completed: false,
    })
    .select()
    .single();

  if (error) return { error: error.message, data: null };
  return { error: null, data };
}

export async function saveSetLog(params: {
  workoutLogId: string;
  exercise: string;
  setNumber: number;
  actualWeight: number | null;
  actualReps: number | null;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("set_logs").upsert(
    {
      workout_log_id: params.workoutLogId,
      exercise: params.exercise,
      set_number: params.setNumber,
      actual_weight: params.actualWeight,
      actual_reps: params.actualReps,
      completed: true,
    },
    { onConflict: "workout_log_id,exercise,set_number" },
  );

  if (error) return { error: error.message };
  return { error: null };
}

export async function completeWorkoutLog(logId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("workout_logs")
    .update({ completed: true })
    .eq("id", logId);
  if (error) return { error: error.message };
  return { error: null };
}

// ── PRs ───────────────────────────────────────────────────────────────────

export async function savePR(exercise: string, prWeight: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("user_prs").upsert(
    { user_id: user.id, exercise, pr_weight: prWeight, updated_at: new Date().toISOString() },
    { onConflict: "user_id,exercise" },
  );

  if (error) return { error: error.message };
  return { error: null };
}
