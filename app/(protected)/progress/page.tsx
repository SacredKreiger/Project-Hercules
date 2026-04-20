"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/Skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";

type Log = { id: string; log_date: string; weight_lbs: number; notes: string | null };

export default function ProgressPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

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
      { user_id: user!.id, log_date: today, weight_lbs: parseFloat(weight), notes: notes || null },
      { onConflict: "user_id,log_date" }
    );
    if (error) { setError(error.message); setSaving(false); return; }
    setWeight(""); setNotes("");
    await load(); setSaving(false);
  }

  async function deleteLog(id: string) {
    const supabase = createClient();
    await supabase.from("progress_logs").delete().eq("id", id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }

  // Append T12:00:00 so "YYYY-MM-DD" is parsed as local noon, not UTC midnight
  // (avoids off-by-one day display in timezones west of UTC)
  const chartData = logs.map((l) => ({
    date: new Date(l.log_date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    weight: l.weight_lbs,
  }));

  const latestWeight = logs[logs.length - 1]?.weight_lbs ?? profile?.current_weight_lbs;
  const startingWeight = logs[0]?.weight_lbs ?? profile?.current_weight_lbs;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[0,1,2].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <Skeleton className="h-56 rounded-2xl" />
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

      {/* Weight stats */}
      {profile && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Starting", value: startingWeight },
            { label: "Current",  value: latestWeight ?? "—" },
            { label: "Goal",     value: profile.goal_weight_lbs },
          ].map(({ label, value }) => (
            <div key={label} className="glass widget-shadow rounded-2xl p-4 text-center">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">{label}</p>
              <p className="text-2xl font-bold mt-1.5 tabular-nums tracking-tight">{value}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">lbs</p>
            </div>
          ))}
        </div>
      )}

      {/* Chart */}
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
              <ReferenceLine y={profile?.goal_weight_lbs} stroke="oklch(0.68 0.18 150)" strokeDasharray="4 3" strokeWidth={1.5} label={{ value: "Goal", position: "insideTopRight", fontSize: 10, fill: "oklch(0.68 0.18 150)" }} />
              <Line type="monotone" dataKey="weight" stroke="oklch(0.60 0.18 255)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Log form */}
      <div className="glass widget-shadow rounded-2xl p-4">
        <p className="text-sm font-semibold mb-3">Log Today&apos;s Weight</p>
        <form onSubmit={handleLog} className="space-y-3">
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-3">
            <div className="space-y-1.5 flex-1">
              <Label className="text-xs">Weight (lbs)</Label>
              <Input type="number" step="0.1" placeholder="175.0" value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="rounded-xl bg-foreground/5 border-border h-10" required />
            </div>
            <div className="space-y-1.5 flex-1">
              <Label className="text-xs">Notes (optional)</Label>
              <Input placeholder="Feeling strong" value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded-xl bg-foreground/5 border-border h-10" />
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
            {[...logs].reverse().slice(0, 14).map((log) => (
              <div key={log.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(log.log_date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </span>
                  {log.notes && (
                    <p className="text-xs text-muted-foreground/70 mt-0.5">{log.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold tabular-nums">{log.weight_lbs} lbs</span>
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
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
