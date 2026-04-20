"use server";

import { createClient } from "@/lib/supabase/server";
import { TEMPLATES } from "@/lib/templates";
import type { ProgramDay } from "@/lib/templates";
import { increment, startingWeight } from "@/lib/training-utils";
import type { ProgramV2 } from "@/lib/program";
import { getExerciseInfo } from "@/lib/exercises";

// ── Save program + PRs (V1 / template flow) ──────────────────────────────────

export async function saveTrainingSetup(params: {
  name: string;
  days: ProgramDay[];
  prs: Record<string, number>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

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

/** Save a simple V1 custom program (no phases, no overload config). */
export async function saveTrainingProgram(name: string, days: ProgramDay[]) {
  return saveTrainingSetup({ name, days, prs: {} });
}

/** Save a V2 program with phases + overload mode + optional starting PRs. */
export async function saveTrainingProgramV2(params: {
  program: ProgramV2;
  prs: Record<string, number>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const progress: Record<string, { weight: number; sessions: number }> = {};
  for (const [exercise, pr] of Object.entries(params.prs)) {
    if (pr > 0) {
      progress[exercise] = { weight: startingWeight(pr), sessions: 0 };
    }
  }

  const { error } = await supabase.from("profiles").update({
    training_program:  params.program,
    training_prs:      params.prs,
    training_progress: progress,
  }).eq("id", user.id);

  if (error) return { error: error.message };
  return { error: null };
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

// ── Progressive overload: update weights after workout ───────────────────────

type CompletedSetData = {
  targetReps: string;
  loggedSets: { reps: number | null; weight: number | null; completed: boolean }[];
};

export async function updateProgressAfterWorkout(
  completedSets: Record<string, CompletedSetData>,
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("training_progress, training_prs, training_program")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) return { error: profileError?.message ?? "Profile not found" };

  const current: Record<string, { weight: number; sessions?: number }> =
    (profile.training_progress as any) ?? {};
  const prs: Record<string, number> = (profile.training_prs as any) ?? {};
  const program = (profile.training_program as any) ?? null;

  // Determine overload mode from V2 program (default to "auto" for V1 / null)
  const overload = (program?.version === 2 ? program.overload : null) ?? { type: "auto" };

  const updated = { ...current };

  for (const [exercise, data] of Object.entries(completedSets)) {
    const info = getExerciseInfo(exercise);
    if (!info || info.unit !== "weight_reps") continue;

    const targetNum = parseInt(data.targetReps);
    const allDone   = data.loggedSets.every((s) => s.completed);
    if (!allDone) continue;

    const curEntry  = current[exercise];
    const curWeight = curEntry?.weight ?? (prs[exercise] ? startingWeight(prs[exercise]) : 45);
    const curSessions = curEntry?.sessions ?? 0;

    if (overload.type === "manual") {
      // Save the actually-logged weight — no automatic increment
      const loggedWeights = data.loggedSets
        .filter((s) => s.completed && s.weight != null)
        .map((s) => s.weight as number);
      if (loggedWeights.length > 0) {
        const lastLogged = loggedWeights[loggedWeights.length - 1];
        updated[exercise] = { weight: lastLogged, sessions: curSessions + 1 };
      }
      continue;
    }

    if (overload.type === "configured") {
      const { incrementLbs, everyNSessions } = overload;
      const newSessions = curSessions + 1;
      const newWeight =
        newSessions % everyNSessions === 0
          ? curWeight + incrementLbs
          : curWeight;
      updated[exercise] = { weight: newWeight, sessions: newSessions };
      continue;
    }

    // Default: "auto" — add increment only when all sets hit target reps
    if (isNaN(targetNum)) continue;
    const allHit = data.loggedSets.every((s) => (s.reps ?? 0) >= targetNum);
    if (!allHit) continue;
    updated[exercise] = { weight: curWeight + increment(exercise), sessions: curSessions + 1 };
  }

  const { error } = await supabase.from("profiles")
    .update({ training_progress: updated })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}
