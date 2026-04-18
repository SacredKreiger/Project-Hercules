"use server";

import { createClient } from "@/lib/supabase/server";
import { TEMPLATES } from "@/lib/templates";
import type { ProgramDay } from "@/lib/templates";
import { increment, startingWeight } from "@/lib/training-utils";

// ── Save program + PRs ────────────────────────────────────────────────────

export async function saveTrainingSetup(params: {
  name: string;
  days: ProgramDay[];
  prs: Record<string, number>; // exercise → 1RM entered by user
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Build initial progress (starting working weights) from PRs
  const progress: Record<string, { weight: number }> = {};
  for (const [exercise, pr] of Object.entries(params.prs)) {
    if (pr > 0) progress[exercise] = { weight: startingWeight(pr) };
  }

  const { error } = await supabase.from("profiles").update({
    training_program:  { name: params.name, days: params.days },
    training_prs:      params.prs,
    training_progress: progress,
  }).eq("id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function saveTrainingProgramFromTemplate(templateId: string) {
  const template = TEMPLATES.find((t) => t.id === templateId);
  if (!template) return { error: "Template not found" };
  return saveTrainingSetup({ name: template.name, days: template.days, prs: {} });
}

export async function saveTrainingProgram(name: string, days: ProgramDay[]) {
  return saveTrainingSetup({ name, days, prs: {} });
}

export async function clearTrainingProgram() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const { error } = await supabase.from("profiles")
    .update({ training_program: null, training_prs: {}, training_progress: {} })
    .eq("id", user.id);
  if (error) return { error: error.message };
  return { error: null };
}

// ── Progressive overload: update weights after workout ───────────────────

export async function updateProgressAfterWorkout(
  completedSets: Record<string, { targetReps: string; loggedSets: { reps: number | null; completed: boolean }[] }>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("training_progress, training_prs")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) return { error: profileError?.message ?? "Profile not found" };

  const current: Record<string, { weight: number }> = (profile.training_progress as any) ?? {};
  const prs: Record<string, number> = (profile.training_prs as any) ?? {};
  const updated = { ...current };

  for (const [exercise, data] of Object.entries(completedSets)) {
    const targetNum = parseInt(data.targetReps);
    if (isNaN(targetNum)) continue; // skip AMRAP / time-based

    const allDone = data.loggedSets.every((s) => s.completed);
    const allHit  = data.loggedSets.every((s) => (s.reps ?? 0) >= targetNum);
    if (!allDone || !allHit) continue;

    const curWeight = current[exercise]?.weight ?? (prs[exercise] ? startingWeight(prs[exercise]) : 45);
    updated[exercise] = { weight: curWeight + increment(exercise) };
  }

  const { error } = await supabase.from("profiles")
    .update({ training_progress: updated })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}
