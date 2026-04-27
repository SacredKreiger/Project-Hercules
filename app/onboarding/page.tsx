"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { calcBMR, calcTDEE, calcMacros, type Phase, type ActivityLevel } from "@/lib/macros";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STEPS = ["Your Info", "Body Stats", "Your Goal", "Your Macros"];

const PHASE_STYLES: Record<string, { bg: string; text: string }> = {
  bulk:        { bg: "bg-amber-500/12",   text: "text-amber-500" },
  cut:         { bg: "bg-rose-500/12",    text: "text-rose-500" },
  maintenance: { bg: "bg-emerald-500/12", text: "text-emerald-500" },
};

const RATE_OPTIONS = {
  bulk: [
    { rate: 0.5, label: "Mild Bulk",       desc: "0.5 lb/week" },
    { rate: 1.0, label: "Bulk",            desc: "1 lb/week" },
    { rate: 2.0, label: "Aggressive Bulk", desc: "2 lbs/week" },
  ],
  cut: [
    { rate: 0.5, label: "Mild Cut",       desc: "0.5 lb/week" },
    { rate: 1.0, label: "Cut",            desc: "1 lb/week" },
    { rate: 2.0, label: "Aggressive Cut", desc: "2 lbs/week" },
  ],
};

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
    goalRate: string;
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
    goalRate: "0.5",
  });

  function update(field: string, value: string | null) {
    setForm((prev) => ({ ...prev, [field]: value ?? "" }));
  }

  const heightCm =
    form.heightFt && form.heightIn
      ? (parseInt(form.heightFt) * 12 + parseInt(form.heightIn)) * 2.54
      : 0;

  const tdeeValue =
    form.currentWeight && form.age && form.gender && heightCm && form.activityLevel
      ? calcTDEE(
          calcBMR(parseFloat(form.currentWeight), heightCm, parseInt(form.age), form.gender as "male" | "female"),
          form.activityLevel as ActivityLevel
        )
      : null;

  function macrosForRate(rate: number) {
    if (!tdeeValue || !form.phase) return null;
    return calcMacros(tdeeValue, parseFloat(form.currentWeight), form.phase as Phase, rate);
  }

  const macros =
    tdeeValue && form.phase
      ? calcMacros(tdeeValue, parseFloat(form.currentWeight), form.phase as Phase, parseFloat(form.goalRate) || 0.5)
      : null;
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
      goal_rate: parseFloat(form.goalRate) || 0.5,
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

  const phaseStyle = PHASE_STYLES[form.phase] ?? { bg: "bg-foreground/10", text: "text-foreground" };

  return (
    <div className="h-full overflow-auto bg-background pt-safe relative">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <div className="relative z-10 min-h-full flex flex-col items-center justify-center px-5 py-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <p className="text-2xl font-black tracking-[0.2em]">MVNMT</p>
          <p className="text-xs text-muted-foreground mt-1">Let&apos;s set up your plan</p>
        </div>

        <div className="w-full max-w-sm space-y-4">
          {/* Step dots */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {STEPS.map((_, i) => (
              <div key={i} className={`rounded-full transition-all duration-300 ${
                i === step
                  ? "w-6 h-2 bg-primary"
                  : i < step
                  ? "w-2 h-2 bg-primary/40"
                  : "w-2 h-2 bg-foreground/15"
              }`} />
            ))}
          </div>

          {/* Step card */}
          <div className="glass widget-shadow rounded-2xl p-5 space-y-4">
            {/* Step 0: Your Info */}
            {step === 0 && (
              <>
                <div>
                  <p className="text-base font-bold">Tell us about yourself</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Basic info to personalize your plan</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-medium">Name</Label>
                    <Input
                      placeholder="Your name"
                      value={form.name}
                      onChange={(e) => update("name", e.target.value)}
                      className="rounded-xl bg-foreground/5 border-border h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-medium">Age</Label>
                    <Input
                      type="number"
                      placeholder="25"
                      value={form.age}
                      onChange={(e) => update("age", e.target.value)}
                      className="rounded-xl bg-foreground/5 border-border h-10"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-medium">Gender</Label>
                  <Select value={form.gender} onValueChange={(v) => update("gender", v)}>
                    <SelectTrigger className="rounded-xl bg-foreground/5 border-border h-10">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Step 1: Body Stats */}
            {step === 1 && (
              <>
                <div>
                  <p className="text-base font-bold">Your body stats</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Used to calculate your calorie needs</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-medium">Height</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="number"
                      placeholder="ft"
                      value={form.heightFt}
                      onChange={(e) => update("heightFt", e.target.value)}
                      className="rounded-xl bg-foreground/5 border-border h-10"
                    />
                    <Input
                      type="number"
                      placeholder="in"
                      value={form.heightIn}
                      onChange={(e) => update("heightIn", e.target.value)}
                      className="rounded-xl bg-foreground/5 border-border h-10"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-medium">Current Weight (lbs)</Label>
                  <Input
                    type="number"
                    placeholder="160"
                    value={form.currentWeight}
                    onChange={(e) => update("currentWeight", e.target.value)}
                    className="rounded-xl bg-foreground/5 border-border h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-medium">Activity Level</Label>
                  <Select value={form.activityLevel} onValueChange={(v) => update("activityLevel", v)}>
                    <SelectTrigger className="rounded-xl bg-foreground/5 border-border h-10">
                      <SelectValue placeholder="How active are you?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sedentary">Sedentary (desk job, little exercise)</SelectItem>
                      <SelectItem value="lightly_active">Lightly Active (1-3x/week)</SelectItem>
                      <SelectItem value="moderately_active">Moderately Active (3-5x/week)</SelectItem>
                      <SelectItem value="very_active">Very Active (6-7x/week)</SelectItem>
                      <SelectItem value="extra_active">Extra Active (athlete / physical job)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Step 2: Your Goal */}
            {step === 2 && (
              <>
                <div>
                  <p className="text-base font-bold">What&apos;s your goal?</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Sets your calorie targets and phase</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-medium">Goal Weight (lbs)</Label>
                  <Input
                    type="number"
                    placeholder="190"
                    value={form.goalWeight}
                    onChange={(e) => update("goalWeight", e.target.value)}
                    className="rounded-xl bg-foreground/5 border-border h-10"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground font-medium">Phase</Label>
                  <Select value={form.phase} onValueChange={(v) => { update("phase", v); update("goalRate", "0.5"); }}>
                    <SelectTrigger className="rounded-xl bg-foreground/5 border-border h-10">
                      <SelectValue placeholder="Select your phase" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bulk">Bulk — gain muscle &amp; size</SelectItem>
                      <SelectItem value="cut">Cut — lose fat, keep muscle</SelectItem>
                      <SelectItem value="maintenance">Maintenance — stay at current weight</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Rate cards — bulk or cut only */}
                {(form.phase === "bulk" || form.phase === "cut") && (
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground font-medium">
                      {form.phase === "bulk" ? "Gain Rate" : "Loss Rate"}
                    </Label>
                    <div className="space-y-2">
                      {RATE_OPTIONS[form.phase].map(({ rate, label, desc }) => {
                        const cal = macrosForRate(rate);
                        const selected = parseFloat(form.goalRate) === rate;
                        return (
                          <button
                            key={rate}
                            type="button"
                            onClick={() => update("goalRate", String(rate))}
                            className={`w-full text-left rounded-xl px-3 py-2.5 border transition-colors press ${
                              selected ? "border-primary bg-primary/10" : "border-transparent bg-foreground/5"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold">{label}</p>
                                <p className="text-[11px] text-muted-foreground">{desc}</p>
                              </div>
                              {cal && (
                                <div className="text-right">
                                  <p className={`text-sm font-black tabular-nums ${selected ? "text-primary" : ""}`}>
                                    {cal.calories}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">kcal/day</p>
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Step 3: Macro Summary */}
            {step === 3 && (
              <>
                <div>
                  <p className="text-base font-bold">Your daily targets</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Based on your stats</p>
                </div>
                {macros ? (
                  <>
                    <div className="flex justify-center">
                      <span className={`text-[11px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full ${phaseStyle.bg} ${phaseStyle.text}`}>
                        {form.phase}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      {[
                        { label: "Calories", value: macros.calories, unit: "kcal" },
                        { label: "Protein",  value: macros.protein,  unit: "g" },
                        { label: "Carbs",    value: macros.carbs,    unit: "g" },
                        { label: "Fat",      value: macros.fat,      unit: "g" },
                      ].map(({ label, value, unit }) => (
                        <div key={label} className="bg-foreground/5 rounded-xl p-3">
                          <p className="text-base font-bold tabular-nums">{value}</p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">{unit}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Fill in your stats on the previous steps to see your targets.
                  </p>
                )}
                {error && <p className="text-sm text-destructive">{error}</p>}
              </>
            )}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-3 mt-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex-1 rounded-full h-11 font-medium glass widget-shadow press"
              >
                Back
              </button>
            )}
            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="flex-1 rounded-full h-11 font-semibold bg-primary text-primary-foreground press"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 rounded-full h-11 font-semibold bg-primary text-primary-foreground press disabled:opacity-50"
              >
                {loading ? "Setting up..." : "Start Moving"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
