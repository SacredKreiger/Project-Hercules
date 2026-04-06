"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { calcBMR, calcTDEE, calcMacros } from "@/lib/macros";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      setProfile(data);
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(""); setSaved(false);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("profiles").update(profile).eq("id", user!.id);
    if (error) { setError(error.message); setSaving(false); return; }
    setSaved(true); setSaving(false);
  }

  if (!profile) return <p className="text-muted-foreground text-sm">Loading...</p>;

  const bmr = calcBMR(profile.current_weight_lbs, profile.height_cm, profile.age, profile.gender);
  const tdee = calcTDEE(bmr, profile.activity_level);
  const macros = calcMacros(tdee, profile.current_weight_lbs, profile.phase);

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Your stats and phase</p>
      </div>

      {/* Macro summary */}
      <div className="glass widget-shadow rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold">Daily Targets</p>
          <span className="text-xs text-primary font-semibold uppercase tracking-widest glass rounded-full px-2.5 py-1">{profile.phase}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
          {[
            { label: "Calories", value: macros.calories, unit: "kcal" },
            { label: "Protein", value: macros.protein, unit: "g" },
            { label: "Carbs", value: macros.carbs, unit: "g" },
            { label: "Fat", value: macros.fat, unit: "g" },
          ].map(({ label, value, unit }) => (
            <div key={label} className="bg-foreground/5 rounded-xl p-3">
              <p className="text-lg font-bold">{value}<span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span></p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-3">
        {/* Personal */}
        <div className="glass widget-shadow rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold">Personal Info</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Name</Label>
              <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="rounded-xl bg-foreground/5 border-border h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Age</Label>
              <Input type="number" value={profile.age} onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) })}
                className="rounded-xl bg-foreground/5 border-border h-10" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Gender</Label>
            <Select value={profile.gender} onValueChange={(v) => v && setProfile({ ...profile, gender: v })}>
              <SelectTrigger className="rounded-xl bg-foreground/5 border-border h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Body */}
        <div className="glass widget-shadow rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold">Body Stats</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Current Weight (lbs)</Label>
              <Input type="number" step="0.1" value={profile.current_weight_lbs}
                onChange={(e) => setProfile({ ...profile, current_weight_lbs: parseFloat(e.target.value) })}
                className="rounded-xl bg-foreground/5 border-border h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Goal Weight (lbs)</Label>
              <Input type="number" step="0.1" value={profile.goal_weight_lbs}
                onChange={(e) => setProfile({ ...profile, goal_weight_lbs: parseFloat(e.target.value) })}
                className="rounded-xl bg-foreground/5 border-border h-10" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Activity Level</Label>
            <Select value={profile.activity_level} onValueChange={(v) => v && setProfile({ ...profile, activity_level: v })}>
              <SelectTrigger className="rounded-xl bg-foreground/5 border-border h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sedentary">Sedentary</SelectItem>
                <SelectItem value="lightly_active">Lightly Active</SelectItem>
                <SelectItem value="moderately_active">Moderately Active</SelectItem>
                <SelectItem value="very_active">Very Active</SelectItem>
                <SelectItem value="extra_active">Extra Active</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Phase */}
        <div className="glass widget-shadow rounded-2xl p-4 space-y-3">
          <p className="text-sm font-semibold">Phase</p>
          <Select value={profile.phase} onValueChange={(v) => v && setProfile({ ...profile, phase: v })}>
            <SelectTrigger className="rounded-xl bg-foreground/5 border-border h-10"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bulk">Bulk — gain muscle & size</SelectItem>
              <SelectItem value="cut">Cut — lose fat, keep muscle</SelectItem>
              <SelectItem value="maintenance">Maintenance — hold current weight</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && <p className="text-sm text-destructive px-1">{error}</p>}
        {saved && <p className="text-sm text-emerald-500 px-1">Saved successfully.</p>}

        <Button type="submit" disabled={saving}
          className="w-full glass-gold rounded-full h-11 font-semibold text-foreground border-0">
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}
