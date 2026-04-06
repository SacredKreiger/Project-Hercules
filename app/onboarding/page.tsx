"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { calcBMR, calcTDEE, calcMacros, type Phase, type ActivityLevel } from "@/lib/macros";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

const STEPS = ["Your Info", "Body Stats", "Your Goal", "Your Macros"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<{
    name: string;
    age: string;
    gender: string;
    heightFt: string;
    heightIn: string;
    currentWeight: string;
    goalWeight: string;
    activityLevel: string;
    phase: string;
  }>({
    name: "",
    age: "",
    gender: "",
    heightFt: "",
    heightIn: "",
    currentWeight: "",
    goalWeight: "",
    activityLevel: "",
    phase: "",
  });

  function update(field: string, value: string | null) {
    setForm((prev) => ({ ...prev, [field]: value ?? "" }));
  }

  const heightCm =
    form.heightFt && form.heightIn
      ? (parseInt(form.heightFt) * 12 + parseInt(form.heightIn)) * 2.54
      : 0;

  const macros =
    form.currentWeight && form.age && form.gender && heightCm && form.activityLevel && form.phase
      ? (() => {
          const bmr = calcBMR(parseFloat(form.currentWeight), heightCm, parseInt(form.age), form.gender as "male" | "female");
          const tdee = calcTDEE(bmr, form.activityLevel as ActivityLevel);
          return calcMacros(tdee, parseFloat(form.currentWeight), form.phase as Phase);
        })()
      : null;

  async function handleSubmit() {
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/sign-in");
      return;
    }

    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      name: form.name,
      age: parseInt(form.age),
      gender: form.gender,
      height_cm: heightCm,
      current_weight_lbs: parseFloat(form.currentWeight),
      goal_weight_lbs: parseFloat(form.goalWeight),
      activity_level: form.activityLevel,
      phase: form.phase,
      program_start_date: new Date().toISOString().split("T")[0],
      onboarding_complete: true,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            {STEPS.map((s, i) => (
              <span key={s} className={i === step ? "text-primary font-medium" : ""}>{s}</span>
            ))}
          </div>
          <Progress value={((step + 1) / STEPS.length) * 100} />
        </div>

        <Card>
          {/* Step 0: Personal Info */}
          {step === 0 && (
            <>
              <CardHeader>
                <CardTitle>Tell us about yourself</CardTitle>
                <CardDescription>Basic info to personalize your plan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input placeholder="Your name" value={form.name} onChange={(e) => update("name", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Age</Label>
                  <Input type="number" placeholder="25" value={form.age} onChange={(e) => update("age", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <Select value={form.gender} onValueChange={(v) => update("gender", v)}>
                    <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 1: Body Stats */}
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle>Your body stats</CardTitle>
                <CardDescription>Used to calculate your calorie needs</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Height</Label>
                  <div className="flex gap-2">
                    <Input type="number" placeholder="ft" value={form.heightFt} onChange={(e) => update("heightFt", e.target.value)} />
                    <Input type="number" placeholder="in" value={form.heightIn} onChange={(e) => update("heightIn", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Current Weight (lbs)</Label>
                  <Input type="number" placeholder="160" value={form.currentWeight} onChange={(e) => update("currentWeight", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Activity Level</Label>
                  <Select value={form.activityLevel} onValueChange={(v) => update("activityLevel", v)}>
                    <SelectTrigger><SelectValue placeholder="How active are you?" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedentary">Sedentary (desk job, little exercise)</SelectItem>
                      <SelectItem value="lightly_active">Lightly Active (1-3x/week)</SelectItem>
                      <SelectItem value="moderately_active">Moderately Active (3-5x/week)</SelectItem>
                      <SelectItem value="very_active">Very Active (6-7x/week)</SelectItem>
                      <SelectItem value="extra_active">Extra Active (athlete / physical job)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 2: Goal */}
          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle>What&apos;s your goal?</CardTitle>
                <CardDescription>This sets your calorie targets and program phase</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Goal Weight (lbs)</Label>
                  <Input type="number" placeholder="190" value={form.goalWeight} onChange={(e) => update("goalWeight", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Phase</Label>
                  <Select value={form.phase} onValueChange={(v) => update("phase", v)}>
                    <SelectTrigger><SelectValue placeholder="Select your phase" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bulk">Bulk — gain muscle & size</SelectItem>
                      <SelectItem value="cut">Cut — lose fat, keep muscle</SelectItem>
                      <SelectItem value="maintenance">Maintenance — stay at current weight</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </>
          )}

          {/* Step 3: Summary */}
          {step === 3 && macros && (
            <>
              <CardHeader>
                <CardTitle>Your daily targets</CardTitle>
                <CardDescription>Based on your stats — {form.phase} phase</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Calories", value: macros.calories, unit: "kcal" },
                    { label: "Protein", value: macros.protein, unit: "g" },
                    { label: "Carbs", value: macros.carbs, unit: "g" },
                    { label: "Fat", value: macros.fat, unit: "g" },
                  ].map(({ label, value, unit }) => (
                    <div key={label} className="bg-muted rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold">{value}<span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span></p>
                      <p className="text-sm text-muted-foreground mt-1">{label}</p>
                    </div>
                  ))}
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
              </CardContent>
            </>
          )}

          <div className="p-6 pt-0 flex gap-3">
            {step > 0 && (
              <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button className="flex-1" onClick={() => setStep(step + 1)}>
                Continue
              </Button>
            ) : (
              <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
                {loading ? "Setting up your plan..." : "Start My Journey"}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
