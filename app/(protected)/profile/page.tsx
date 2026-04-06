"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { calcBMR, calcTDEE, calcMacros } from "@/lib/macros";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

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

  if (!profile) return <p className="text-muted-foreground">Loading...</p>;

  const bmr = calcBMR(profile.current_weight_lbs, profile.height_cm, profile.age, profile.gender);
  const tdee = calcTDEE(bmr, profile.activity_level);
  const macros = calcMacros(tdee, profile.current_weight_lbs, profile.phase);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Update your stats and phase</p>
      </div>

      {/* Current macros summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Current Targets
            <Badge variant="outline" className="capitalize">{profile.phase}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            {[
              { label: "Calories", value: macros.calories, unit: "kcal" },
              { label: "Protein", value: macros.protein, unit: "g" },
              { label: "Carbs", value: macros.carbs, unit: "g" },
              { label: "Fat", value: macros.fat, unit: "g" },
            ].map(({ label, value, unit }) => (
              <div key={label} className="bg-muted rounded-lg p-3">
                <p className="text-lg font-bold">{value}<span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span></p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSave} className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Personal Info</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Age</Label>
                <Input type="number" value={profile.age} onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={profile.gender} onValueChange={(v) => setProfile({ ...profile, gender: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Body Stats</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Current Weight (lbs)</Label>
                <Input type="number" step="0.1" value={profile.current_weight_lbs} onChange={(e) => setProfile({ ...profile, current_weight_lbs: parseFloat(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Goal Weight (lbs)</Label>
                <Input type="number" step="0.1" value={profile.goal_weight_lbs} onChange={(e) => setProfile({ ...profile, goal_weight_lbs: parseFloat(e.target.value) })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Activity Level</Label>
              <Select value={profile.activity_level} onValueChange={(v) => setProfile({ ...profile, activity_level: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">Sedentary</SelectItem>
                  <SelectItem value="lightly_active">Lightly Active</SelectItem>
                  <SelectItem value="moderately_active">Moderately Active</SelectItem>
                  <SelectItem value="very_active">Very Active</SelectItem>
                  <SelectItem value="extra_active">Extra Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Phase</CardTitle></CardHeader>
          <CardContent>
            <Select value={profile.phase} onValueChange={(v) => setProfile({ ...profile, phase: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bulk">Bulk — gain muscle & size</SelectItem>
                <SelectItem value="cut">Cut — lose fat, keep muscle</SelectItem>
                <SelectItem value="maintenance">Maintenance — hold current weight</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {saved && <p className="text-sm text-green-500">Profile saved successfully.</p>}

        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
      </form>
    </div>
  );
}
