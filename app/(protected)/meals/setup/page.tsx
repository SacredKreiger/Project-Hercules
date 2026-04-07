"use client";

import { useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { setupMealPlan } from "@/lib/actions/meal-plan";
import { Button } from "@/components/ui/button";
import { isRedirectError } from "next/dist/client/components/redirect-error";

const CUISINES = [
  "American", "Caribbean", "Chinese", "Indian", "Italian",
  "Japanese", "Korean", "Mediterranean", "Mexican", "Middle Eastern",
  "Thai", "West African",
];

const RESTRICTIONS = [
  { value: "vegetarian",  label: "Vegetarian" },
  { value: "vegan",       label: "Vegan" },
  { value: "gluten-free", label: "Gluten-Free" },
  { value: "dairy-free",  label: "Dairy-Free" },
  { value: "nut-free",    label: "Nut-Free" },
  { value: "halal",       label: "Halal" },
];

export default function MealSetupPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const formRef = useRef<HTMLFormElement>(null);

  const [selectedCuisines, setSelectedCuisines] = useState<Set<string>>(new Set());
  const [selectedRestrictions, setSelectedRestrictions] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  function toggleCuisine(c: string) {
    setSelectedCuisines((prev) => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });
  }

  function toggleRestriction(r: string) {
    setSelectedRestrictions((prev) => {
      const next = new Set(prev);
      next.has(r) ? next.delete(r) : next.add(r);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedCuisines.size === 0) return;
    setPending(true);
    setClientError(null);

    const fd = new FormData();
    selectedCuisines.forEach((c) => fd.append("cuisines", c));
    selectedRestrictions.forEach((r) => fd.append("restrictions", r));

    try {
      await setupMealPlan(fd);
    } catch (err: unknown) {
      if (isRedirectError(err)) throw err;
      setPending(false);
      setClientError("Something went wrong. Please try again.");
    }
  }

  return (
    <div className="max-w-lg space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Set Up Meal Plan</h1>
        <p className="text-sm text-muted-foreground mt-1">
          We&apos;ll pick from your recipe vault and build a full week around your calorie target.
        </p>
      </div>

      {(error || clientError) && (
        <p className="text-sm text-destructive glass rounded-2xl px-4 py-3">{error ?? clientError}</p>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">

        {/* Cuisine preferences */}
        <div className="glass widget-shadow rounded-2xl p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold">Cuisine Preferences</p>
            <p className="text-xs text-muted-foreground mt-0.5">Your meal plan will only pull from these cuisines.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {CUISINES.map((c) => {
              const selected = selectedCuisines.has(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCuisine(c)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all press border ${
                    selected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
          {selectedCuisines.size === 0 && (
            <p className="text-xs text-destructive">Select at least one cuisine.</p>
          )}
        </div>

        {/* Dietary restrictions */}
        <div className="glass widget-shadow rounded-2xl p-4 space-y-3">
          <div>
            <p className="text-sm font-semibold">Dietary Restrictions</p>
            <p className="text-xs text-muted-foreground mt-0.5">Optional — leave blank if none.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {RESTRICTIONS.map(({ value, label }) => {
              const selected = selectedRestrictions.has(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleRestriction(value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all press border ${
                    selected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <Button
          type="submit"
          disabled={selectedCuisines.size === 0 || pending}
          className="w-full rounded-full h-11 font-semibold press"
        >
          {pending ? "Building your plan…" : "Generate My Meal Plan"}
        </Button>

      </form>
    </div>
  );
}
