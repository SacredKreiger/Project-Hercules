"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/Skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import { calcBMR, calcTDEE, calcMacros } from "@/lib/macros";

type Log = { id: string; log_date: string; weight_lbs: number; body_fat_pct: number | null; notes: string | null };

const KEY_LIFTS = [
  "Back Squat",
  "Deadlift",
  "Bench Press",
  "Overhead Press",
  "Barbell Row",
  "Romanian Deadlift",
  "Front Squat",
  "Incline Bench Press",
];

function bmiLabel(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

export default function ProgressPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: prof, error: profError } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
    if (!profError) setProfile(prof);
    const { data } = await supabase.from("progress_logs").select("*")
      .eq("user_id", user!.id).order("log_date", { ascending: true });
    setLogs(data ?? []);
    setLoading(false);
  }

  async function handleLog(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSaving(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase.from("progress_logs").upsert(
      {
        user_id: user!.id,
        log_date: today,
        weight_lbs: parseFloat(weight),
        body_fat_pct: bodyFat ? parseFloat(bodyFat) : null,
        notes: notes || null,
      },
      { onConflict: "user_id,log_date" }
    );
    if (error) { setError(error.message); setSaving(false); return; }
    setWeight(""); setNotes(""); setBodyFat("");
    await load(); setSaving(false);
  }

  async function saveEdit(id: string) {
    const val = parseFloat(editWeight);
    if (isNaN(val) || val <= 0) { setEditingId(null); return; }
    const supabase = createClient();
    await supabase.from("progress_logs").update({ weight_lbs: val }).eq("id", id);
    setLogs((prev) => prev.map((l) => l.id === id ? { ...l, weight_lbs: val } : l));
    setEditingId(null);
  }

  async function deleteLog(id: string) {
    const supabase = createClient();
    await supabase.from("progress_logs").delete().eq("id", id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }

  const latestWeight = logs[logs.length - 1]?.weight_lbs ?? profile?.current_weight_lbs;
  const goalWeight: number | null = profile?.goal_weight_lbs ?? null;

  // 7-day moving average chart data
  const chartData = logs.map((l, i) => {
    const window = logs.slice(Math.max(0, i - 6), i + 1);
    const avg = window.reduce((s, w) => s + w.weight_lbs, 0) / window.length;
    return {
      date: new Date(l.log_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      weight: l.weight_lbs,
      avg: Math.round(avg * 10) / 10,
    };
  });

  // BMI
  const bmi =
    latestWeight && profile?.height_cm
      ? (latestWeight * 0.453592) / Math.pow(profile.height_cm / 100, 2)
      : null;

  // Weekly rate — from last 2 points if ≥ 7 days apart, else linear regression slope
  let weeklyRate: number | null = null;
  if (logs.length >= 2) {
    const last = logs[logs.length - 1];
    const prev = logs[logs.length - 2];
    const daysDiff = (new Date(last.log_date).getTime() - new Date(prev.log_date).getTime()) / 86400000;
    if (daysDiff >= 7) {
      weeklyRate = ((last.weight_lbs - prev.weight_lbs) / daysDiff) * 7;
    } else {
      // Linear regression over all logs
      const n = logs.length;
      const xs = logs.map((_, i) => i);
      const ys = logs.map((l) => l.weight_lbs);
      const sumX = xs.reduce((a, b) => a + b, 0);
      const sumY = ys.reduce((a, b) => a + b, 0);
      const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
      const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      // Average days between entries
      const totalDays =
        (new Date(logs[n - 1].log_date).getTime() - new Date(logs[0].log_date).getTime()) / 86400000;
      const avgDaysPerEntry = n > 1 ? totalDays / (n - 1) : 1;
      weeklyRate = slope * (7 / avgDaysPerEntry);
    }
    weeklyRate = Math.round(weeklyRate * 10) / 10;
  }

  // Weekly rate color
  const phase: string = profile?.phase ?? "maintenance";
  let weeklyRateColor = "text-muted-foreground";
  if (weeklyRate !== null) {
    const losing = weeklyRate < 0;
    const gaining = weeklyRate > 0;
    if ((phase === "cut" && losing) || (phase === "bulk" && gaining)) {
      weeklyRateColor = "text-emerald-500";
    } else if (weeklyRate !== 0) {
      weeklyRateColor = "text-amber-400";
    }
  }

  // Projected weeks to goal
  let projectedWeeks: number | null = null;
  if (latestWeight && goalWeight && weeklyRate && weeklyRate !== 0) {
    const diff = goalWeight - latestWeight;
    if ((diff < 0 && weeklyRate < 0) || (diff > 0 && weeklyRate > 0)) {
      projectedWeeks = Math.round(Math.abs(diff) / Math.abs(weeklyRate));
    }
  }

  // Streak — consecutive days ending today or yesterday
  let streak = 0;
  if (logs.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const logDates = new Set(logs.map((l) => l.log_date));
    const mostRecentDate = new Date(logs[logs.length - 1].log_date + "T12:00:00");
    mostRecentDate.setHours(0, 0, 0, 0);

    // Only count streak if most recent log is today or yesterday
    if (mostRecentDate.getTime() === today.getTime() || mostRecentDate.getTime() === yesterday.getTime()) {
      let cursor = new Date(mostRecentDate);
      while (true) {
        const dateStr = cursor.toISOString().split("T")[0];
        if (logDates.has(dateStr)) {
          streak++;
          cursor.setDate(cursor.getDate() - 1);
        } else {
          break;
        }
      }
    }
  }

  // TDEE / macro context
  const bmr = profile && latestWeight
    ? calcBMR(latestWeight, profile.height_cm, profile.age, profile.gender)
    : 0;
  const tdee = profile ? calcTDEE(bmr, profile.activity_level) : 0;
  const macros = profile && latestWeight
    ? calcMacros(tdee, latestWeight, profile.phase)
    : null;
  const dailyDelta = macros ? macros.calories - tdee : 0;

  // Training / strength snapshot
  const trainingProgress = profile?.training_progress as Record<string, { weight: number; sessions: number }> | null;
  const keyLifts = KEY_LIFTS
    .filter((name) => trainingProgress?.[name]?.weight)
    .slice(0, 6)
    .map((name) => ({
      name,
      weight: trainingProgress![name].weight,
      sessions: trainingProgress![name].sessions ?? 0,
    }));

  // Sorted logs for delta computation in history
  const sortedLogs = [...logs]; // ascending

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-16 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Progress</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Track your weight over time</p>
      </div>

      {/* 2×3 stats grid */}
      {profile && (
        <div className="grid grid-cols-3 gap-2">
          {/* Current */}
          <div className="glass widget-shadow rounded-2xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Current</p>
            <p className="text-xl font-bold mt-1 tabular-nums tracking-tight">{latestWeight ?? "—"}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">lbs</p>
          </div>

          {/* Goal */}
          <div className="glass widget-shadow rounded-2xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Goal</p>
            <p className="text-xl font-bold mt-1 tabular-nums tracking-tight">{profile.goal_weight_lbs ?? "—"}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">lbs</p>
          </div>

          {/* BMI */}
          <div className="glass widget-shadow rounded-2xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">BMI</p>
            <p className="text-xl font-bold mt-1 tabular-nums tracking-tight">{bmi ? bmi.toFixed(1) : "—"}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{bmi ? bmiLabel(bmi) : "—"}</p>
          </div>

          {/* Weekly Δ */}
          <div className="glass widget-shadow rounded-2xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Weekly Δ</p>
            <p className={`text-xl font-bold mt-1 tabular-nums tracking-tight ${weeklyRateColor}`}>
              {weeklyRate !== null
                ? `${weeklyRate > 0 ? "+" : ""}${weeklyRate.toFixed(1)}`
                : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">lbs/wk</p>
          </div>

          {/* Projected */}
          <div className="glass widget-shadow rounded-2xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Projected</p>
            <p className="text-xl font-bold mt-1 tabular-nums tracking-tight">
              {projectedWeeks !== null ? `~${projectedWeeks}` : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{projectedWeeks !== null ? "wks to goal" : "on track?"}</p>
          </div>

          {/* Streak */}
          <div className="glass widget-shadow rounded-2xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">Streak</p>
            <p className="text-xl font-bold mt-1 tabular-nums tracking-tight">{streak}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{streak === 1 ? "day" : "days"}</p>
          </div>
        </div>
      )}

      {/* Chart with 7-day moving average */}
      {chartData.length > 1 && (
        <div className="glass widget-shadow rounded-2xl p-4">
          <p className="text-sm font-semibold mb-3">Weight Trend</p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
              />
              <ReferenceLine
                y={profile?.goal_weight_lbs}
                stroke="oklch(0.68 0.18 150)"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                label={{ value: "Goal", position: "insideTopRight", fontSize: 10, fill: "oklch(0.68 0.18 150)" }}
              />
              <Line type="monotone" dataKey="weight" stroke="oklch(0.60 0.18 255)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="avg" stroke="oklch(0.72 0.17 42)" strokeWidth={1.5} dot={false} strokeDasharray="0" opacity={0.7} />
            </LineChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div className="flex gap-4 mt-2 justify-end">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 rounded-full bg-[oklch(0.60_0.18_255)]" />
              <span className="text-[10px] text-muted-foreground">Daily</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 rounded-full bg-[oklch(0.72_0.17_42)] opacity-70" />
              <span className="text-[10px] text-muted-foreground">7-day avg</span>
            </div>
          </div>
        </div>
      )}

      {/* TDEE & caloric context */}
      {profile && macros && (
        <div className="glass widget-shadow rounded-2xl px-4 py-3 flex items-center justify-between gap-2">
          <div className="text-center flex-1">
            <p className="text-sm font-bold tabular-nums">{tdee} <span className="text-xs font-normal text-muted-foreground">kcal</span></p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Maintenance</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center flex-1">
            <p className="text-sm font-bold tabular-nums">{macros.calories} <span className="text-xs font-normal text-muted-foreground">kcal</span></p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Daily target</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center flex-1">
            <p className={`text-sm font-bold tabular-nums ${dailyDelta < 0 ? "text-emerald-500" : "text-rose-400"}`}>
              {Math.abs(dailyDelta)} <span className="text-xs font-normal">kcal</span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{dailyDelta < 0 ? "Deficit" : "Surplus"}</p>
          </div>
        </div>
      )}

      {/* Log form */}
      <div className="glass widget-shadow rounded-2xl p-4">
        <p className="text-sm font-semibold mb-3">Log Today&apos;s Weight</p>
        <form onSubmit={handleLog} className="space-y-3">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-3 flex-wrap">
            <div className="space-y-1.5 flex-1 min-w-[80px]">
              <Label className="text-xs">Weight (lbs)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="175.0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="rounded-xl bg-foreground/5 border-border h-10"
                required
              />
            </div>
            <div className="space-y-1.5 w-24 shrink-0">
              <Label className="text-xs">Body Fat % <span className="text-muted-foreground">(opt)</span></Label>
              <Input
                type="number"
                step="0.1"
                min="3"
                max="60"
                placeholder="18.0"
                value={bodyFat}
                onChange={(e) => setBodyFat(e.target.value)}
                className="rounded-xl bg-foreground/5 border-border h-10"
              />
            </div>
            <div className="space-y-1.5 flex-1 min-w-[80px]">
              <Label className="text-xs">Notes (optional)</Label>
              <Input
                placeholder="Feeling strong"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded-xl bg-foreground/5 border-border h-10"
              />
            </div>
          </div>
          <Button type="submit" disabled={saving} className="w-full rounded-full h-10 font-semibold press">
            {saving ? "Saving..." : "Log Weight"}
          </Button>
        </form>
      </div>

      {/* History */}
      {logs.length > 0 && (
        <div className="glass widget-shadow rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold">History</p>
          </div>
          <div className="divide-y divide-border">
            {[...logs].reverse().slice(0, 14).map((log) => {
              const logIndex = sortedLogs.findIndex((l) => l.id === log.id);
              const prevLog = logIndex > 0 ? sortedLogs[logIndex - 1] : null;
              const delta = prevLog ? log.weight_lbs - prevLog.weight_lbs : null;

              return (
                <div key={log.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(log.log_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                    {log.notes && (
                      <p className="text-xs text-muted-foreground/70 mt-0.5">{log.notes}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingId === log.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.1"
                          autoFocus
                          value={editWeight}
                          onChange={(e) => setEditWeight(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(log.id); if (e.key === "Escape") setEditingId(null); }}
                          className="w-20 bg-foreground/5 rounded-lg px-2 py-1 text-sm text-right tabular-nums outline-none focus:ring-1 focus:ring-primary/50"
                        />
                        <button onClick={() => saveEdit(log.id)} className="text-primary press" aria-label="Save">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-muted-foreground press" aria-label="Cancel">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold tabular-nums">{log.weight_lbs} lbs</span>
                          {delta !== null && (
                            <span className={`text-[10px] font-semibold tabular-nums ${
                              delta < 0 ? "text-emerald-500" : delta > 0 ? "text-rose-400" : "text-muted-foreground"
                            }`}>
                              {delta > 0 ? "+" : ""}{delta.toFixed(1)}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => { setEditingId(log.id); setEditWeight(log.weight_lbs.toString()); }}
                          className="text-muted-foreground hover:text-foreground transition-colors press"
                          aria-label="Edit entry"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => deleteLog(log.id)}
                          className="text-muted-foreground hover:text-destructive transition-colors press"
                          aria-label="Delete entry"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6" />
                            <path d="M14 11v6" />
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Strength snapshot */}
      {keyLifts.length > 0 && (
        <div className="glass widget-shadow rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <p className="text-sm font-semibold">Current Lifts</p>
            <p className="text-xs text-muted-foreground mt-0.5">Working weights from last session</p>
          </div>
          <div className="divide-y divide-border">
            {keyLifts.map(({ name, weight: liftWeight, sessions }) => (
              <div key={name} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground">{sessions} session{sessions !== 1 ? "s" : ""}</p>
                </div>
                <span className="text-sm font-bold tabular-nums">
                  {liftWeight} <span className="text-xs font-normal text-muted-foreground">lbs</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
