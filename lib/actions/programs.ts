"use server";

import { createClient } from "@/lib/supabase/server";
import type { ProgramV2 } from "@/lib/program";

// ── Program CRUD ──────────────────────────────────────────────────────────────

export async function upsertProgram(params: {
  id?: string;
  name: string;
  program: ProgramV2;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", data: null };

  if (params.id) {
    const { data, error } = await supabase
      .from("programs")
      .update({ name: params.name, program: params.program, updated_at: new Date().toISOString() })
      .eq("id", params.id).eq("user_id", user.id)
      .select("id").single();
    return { error: error?.message ?? null, data };
  } else {
    const { data, error } = await supabase
      .from("programs")
      .insert({ user_id: user.id, name: params.name, program: params.program })
      .select("id").single();
    return { error: error?.message ?? null, data };
  }
}

export async function activateProgram(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Fetch program to copy to profiles
  const { data: prog } = await supabase.from("programs").select("program, name").eq("id", id).single();

  // Deactivate all, activate selected
  await supabase.from("programs").update({ is_active: false }).eq("user_id", user.id);
  const { error } = await supabase.from("programs")
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };

  // Copy to profiles.training_program and reset progress
  await supabase.from("profiles").update({
    training_program: prog?.program ?? {},
    training_progress: {},
    program_start_date: new Date().toISOString().split("T")[0],
  }).eq("id", user.id);

  return { error: null };
}

export async function switchProgram(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Save current progress as paused state on the currently active program
  const { data: profile } = await supabase.from("profiles")
    .select("training_progress, program_start_date").eq("id", user.id).single();
  const { data: activeProgram } = await supabase.from("programs")
    .select("id").eq("user_id", user.id).eq("is_active", true).single();
  if (activeProgram) {
    await supabase.from("programs").update({
      paused_state: { progress: profile?.training_progress, startDate: profile?.program_start_date },
    }).eq("id", activeProgram.id);
  }

  // Fetch new program + its paused state
  const { data: newProg } = await supabase.from("programs")
    .select("program, name, paused_state").eq("id", id).single();

  // Deactivate all, activate selected
  await supabase.from("programs").update({ is_active: false }).eq("user_id", user.id);
  await supabase.from("programs").update({ is_active: true, updated_at: new Date().toISOString() }).eq("id", id);

  // Restore progress from paused state (or fresh start)
  const pausedState = newProg?.paused_state as any;
  await supabase.from("profiles").update({
    training_program: newProg?.program ?? {},
    training_progress: pausedState?.progress ?? {},
    program_start_date: pausedState?.startDate ?? new Date().toISOString().split("T")[0],
  }).eq("id", user.id);

  return { error: null };
}

export async function resetProgram() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("profiles").update({
    training_progress: {},
    program_start_date: new Date().toISOString().split("T")[0],
  }).eq("id", user.id);
  return { error: error?.message ?? null };
}

export async function deleteProgram(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("programs").delete().eq("id", id).eq("user_id", user.id);
  return { error: error?.message ?? null };
}

export async function getPrograms() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated", data: [] as any[] };

  const { data, error } = await supabase
    .from("programs")
    .select("id, name, program, is_active, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });
  return { error: error?.message ?? null, data: data ?? [] };
}

// ── Personal Records ──────────────────────────────────────────────────────────

export async function upsertPersonalRecord(exerciseName: string, weightLbs: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("personal_records").upsert({
    user_id: user.id,
    exercise_name: exerciseName,
    weight_lbs: weightLbs,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,exercise_name" });
  return { error: error?.message ?? null };
}

export async function getPersonalRecords() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { data: {} as Record<string, number> };

  const { data } = await supabase.from("personal_records")
    .select("exercise_name, weight_lbs").eq("user_id", user.id);
  const map: Record<string, number> = {};
  for (const r of data ?? []) map[r.exercise_name] = Number(r.weight_lbs);
  return { data: map };
}
