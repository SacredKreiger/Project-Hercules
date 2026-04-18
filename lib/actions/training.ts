"use server";

import { createClient } from "@/lib/supabase/server";
import { TEMPLATES } from "@/lib/templates";
import type { ProgramDay } from "@/lib/templates";

export async function saveTrainingProgram(name: string, days: ProgramDay[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ training_program: { name, days } })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function saveTrainingProgramFromTemplate(templateId: string) {
  const template = TEMPLATES.find((t) => t.id === templateId);
  if (!template) return { error: "Template not found" };
  return saveTrainingProgram(template.name, template.days);
}

export async function clearTrainingProgram() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ training_program: null })
    .eq("id", user.id);

  if (error) return { error: error.message };
  return { error: null };
}
