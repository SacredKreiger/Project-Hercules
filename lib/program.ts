/**
 * Program V2 — multi-phase programs with configurable progressive overload.
 *
 * V1 programs (the old flat { name, days } shape) remain supported via
 * isV2() and getActiveDayInfo().
 */

import type { ProgramDay } from "./templates";

// ── Overload config ───────────────────────────────────────────────────────────

export type OverloadMode =
  | { type: "auto" }                                     // add increment when all sets hit target
  | { type: "configured"; incrementLbs: number; everyNSessions: number }  // add every N sessions
  | { type: "manual" }                                   // user types weights — no auto-suggestion

// ── Phase ─────────────────────────────────────────────────────────────────────

export type Phase = {
  id: string
  name: string        // "Phase 1 – Foundation", "Deload", etc.
  weeks: number       // 1–52
  isDeload: boolean
  days: ProgramDay[]  // 7-day weekly schedule (by dayOfWeek 0-6)
}

// ── Programs ──────────────────────────────────────────────────────────────────

export type ProgramV1 = {
  name: string
  days: ProgramDay[]
}

export type ProgramV2 = {
  version: 2
  name: string
  startDate: string     // ISO "YYYY-MM-DD" — used to compute current phase/week
  overload: OverloadMode
  phases: Phase[]
}

export type AnyProgram = ProgramV1 | ProgramV2

// ── Type guards ───────────────────────────────────────────────────────────────

export function isV2(p: AnyProgram): p is ProgramV2 {
  return "version" in p && (p as ProgramV2).version === 2;
}

// ── Active day resolution ─────────────────────────────────────────────────────

export type ActiveDayInfo = {
  day:           ProgramDay | null
  phase:         Phase | null
  weekInPhase:   number | null   // 1-based
  totalWeeks:    number | null
  phaseIndex:    number          // 0-based, -1 if V1
  programDone:   boolean         // true when all phases have elapsed
}

/**
 * Resolve which day is active today for any program version.
 *
 * For V2: computes current phase by diffing today against startDate,
 * walking through phase lengths until the right block is found.
 */
export function getActiveDayInfo(
  program: AnyProgram,
  todayDow: number,         // 0=Sun…6=Sat
): ActiveDayInfo {
  if (!isV2(program)) {
    const p1 = program as ProgramV1;
    return {
      day:         p1.days.find((d) => d.dayOfWeek === todayDow) ?? null,
      phase:       null,
      weekInPhase: null,
      totalWeeks:  null,
      phaseIndex:  -1,
      programDone: false,
    };
  }

  const p2 = program as ProgramV2;
  if (p2.phases.length === 0) {
    return { day: null, phase: null, weekInPhase: null, totalWeeks: null, phaseIndex: -1, programDone: false };
  }

  const start      = new Date(p2.startDate);
  start.setHours(0, 0, 0, 0);
  const today      = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays   = Math.floor((today.getTime() - start.getTime()) / 86_400_000);
  const weekNum    = Math.max(0, Math.floor(diffDays / 7));   // weeks elapsed since start

  let accumulated  = 0;
  for (let i = 0; i < p2.phases.length; i++) {
    const phase = p2.phases[i];
    if (weekNum < accumulated + phase.weeks) {
      return {
        day:         phase.days.find((d) => d.dayOfWeek === todayDow) ?? null,
        phase,
        weekInPhase: weekNum - accumulated + 1,
        totalWeeks:  phase.weeks,
        phaseIndex:  i,
        programDone: false,
      };
    }
    accumulated += phase.weeks;
  }

  // All phases elapsed — stay on last phase, last week
  const last = p2.phases[p2.phases.length - 1];
  return {
    day:         last.days.find((d) => d.dayOfWeek === todayDow) ?? null,
    phase:       last,
    weekInPhase: last.weeks,
    totalWeeks:  last.weeks,
    phaseIndex:  p2.phases.length - 1,
    programDone: true,
  };
}

/** Total duration of a V2 program in weeks */
export function totalProgramWeeks(program: ProgramV2): number {
  return program.phases.reduce((s, p) => s + p.weeks, 0);
}

/** Collect all unique weighted exercise names across all phases of a V2 program */
export function allWeightedExercises(program: ProgramV2): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const phase of program.phases) {
    for (const day of phase.days) {
      for (const ex of day.exercises) {
        if (!seen.has(ex.name)) { seen.add(ex.name); out.push(ex.name); }
      }
    }
  }
  return out;
}
