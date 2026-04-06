"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type Log = { id: string; log_date: string; weight_lbs: number; notes: string | null };

export default function ProgressPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: prof } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
    setProfile(prof);

    const { data } = await supabase
      .from("progress_logs")
      .select("*")
      .eq("user_id", user!.id)
      .order("log_date", { ascending: true });

    setLogs(data ?? []);
  }

  async function handleLog(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const today = new Date().toISOString().split("T")[0];

    const { error } = await supabase.from("progress_logs").upsert({
      user_id: user!.id,
      log_date: today,
      weight_lbs: parseFloat(weight),
      notes: notes || null,
    }, { onConflict: "user_id,log_date" });

    if (error) { setError(error.message); setSaving(false); return; }
    setWeight(""); setNotes("");
    await load();
    setSaving(false);
  }

  const chartData = logs.map((l) => ({
    date: new Date(l.log_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    weight: l.weight_lbs,
  }));

  const latestWeight = logs[logs.length - 1]?.weight_lbs ?? profile?.current_weight_lbs;
  const startWeight = logs[0]?.weight_lbs ?? profile?.current_weight_lbs;
  const totalChange = latestWeight && startWeight ? (latestWeight - startWeight).toFixed(1) : "0";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Progress</h1>
        <p className="text-muted-foreground text-sm mt-1">Track your weight over time</p>
      </div>

      {/* Stats */}
      {profile && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Starting Weight", value: `${profile.current_weight_lbs} lbs` },
            { label: "Current Weight", value: `${latestWeight ?? "—"} lbs` },
            { label: "Goal Weight", value: `${profile.goal_weight_lbs} lbs` },
          ].map(({ label, value }) => (
            <Card key={label}>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-xl font-bold mt-1">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weight Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis domain={["auto", "auto"]} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Log form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Log Today&apos;s Weight</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLog} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex gap-4">
              <div className="space-y-2 flex-1">
                <Label>Weight (lbs)</Label>
                <Input type="number" step="0.1" placeholder="175.0" value={weight} onChange={(e) => setWeight(e.target.value)} required />
              </div>
              <div className="space-y-2 flex-1">
                <Label>Notes (optional)</Label>
                <Input placeholder="Feeling strong today" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Log Weight"}</Button>
          </form>
        </CardContent>
      </Card>

      {/* Log history */}
      {logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...logs].reverse().slice(0, 14).map((log) => (
                <div key={log.id} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                  <span className="text-muted-foreground">
                    {new Date(log.log_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </span>
                  <span className="font-medium">{log.weight_lbs} lbs</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
