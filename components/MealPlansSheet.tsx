"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { getMealPlans, deleteMealPlan, applyMealPlan, type MealPlanRow } from "@/lib/actions/meal-plan";
import { MEAL_SLOTS, SLOT_LABELS } from "@/lib/types/food";

const MealPlanBuilderSheet = dynamic(() => import("@/components/MealPlanBuilderSheet"), { ssr: false });

interface Props {
  onClose: () => void;
  onApplied: () => void;
  date: string;
}

export default function MealPlansSheet({ onClose, onApplied, date }: Props) {
  const router = useRouter();
  const [plans, setPlans] = useState<MealPlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MealPlanRow | undefined>(undefined);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function loadPlans() {
    setLoading(true);
    const { plans } = await getMealPlans();
    setPlans(plans);
    setLoading(false);
  }

  useEffect(() => {
    loadPlans();
  }, []);

  async function handleApply(planId: string) {
    setApplyingId(planId);
    await applyMealPlan(planId, date);
    setApplyingId(null);
    onApplied();
    onClose();
  }

  async function handleDelete(planId: string) {
    setDeletingId(planId);
    await deleteMealPlan(planId);
    setDeletingId(null);
    setPlans((prev) => prev.filter((p) => p.id !== planId));
  }

  function handleNewPlan() {
    setEditingPlan(undefined);
    setShowBuilder(true);
  }

  function handleSaved() {
    setShowBuilder(false);
    setEditingPlan(undefined);
    startTransition(() => {
      loadPlans();
      router.refresh();
    });
  }

  if (showBuilder) {
    return (
      <MealPlanBuilderSheet
        existingPlan={editingPlan}
        onClose={() => { setShowBuilder(false); setEditingPlan(undefined); }}
        onSaved={handleSaved}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-safe pt-5 pb-3 border-b border-border/50 shrink-0">
        <button type="button" onClick={onClose} className="p-1.5 press text-muted-foreground">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
        <p className="font-bold text-base flex-1">Meal Plans</p>
        <button
          type="button"
          onClick={handleNewPlan}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-full px-3 py-1.5 press"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          New Plan
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
          </div>
        ) : plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center px-8 gap-3">
            <p className="text-4xl">📋</p>
            <p className="text-sm font-semibold">No meal plans yet</p>
            <p className="text-xs text-muted-foreground">Create one to get started.</p>
            <button
              type="button"
              onClick={handleNewPlan}
              className="mt-2 bg-primary text-primary-foreground font-bold rounded-full px-5 py-2.5 text-sm press"
            >
              Create Plan
            </button>
          </div>
        ) : (
          plans.map((plan) => {
            const filledSlots = MEAL_SLOTS.filter((s) => plan.slots[s] != null);
            const totalCal = filledSlots.reduce((acc, s) => acc + (plan.slots[s]?.calories ?? 0), 0);
            const isApplying = applyingId === plan.id;
            const isDeleting = deletingId === plan.id;

            return (
              <div key={plan.id} className="glass widget-shadow rounded-2xl overflow-hidden">
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm leading-snug truncate">{plan.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {filledSlots.map((s) => SLOT_LABELS[s]).join(" · ")}
                      </p>
                    </div>
                    <span className="shrink-0 bg-primary/15 text-primary text-[11px] font-bold rounded-full px-2.5 py-1 tabular-nums">
                      {Math.round(totalCal)} kcal
                    </span>
                  </div>

                  {/* Macro breakdown */}
                  <div className="flex gap-3 mt-2.5">
                    {filledSlots.map((s) => {
                      const food = plan.slots[s]!;
                      return (
                        <div key={s} className="flex-1 min-w-0">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground truncate">{SLOT_LABELS[s]}</p>
                          <p className="text-xs font-semibold truncate">{food.name}</p>
                          <p className="text-[10px] text-muted-foreground tabular-nums">{food.calories} kcal</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Action row */}
                <div className="flex items-center gap-2 px-4 pb-3.5">
                  <a
                    href={`/grocery?plan=${plan.id}`}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground font-semibold press"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                    </svg>
                    Grocery List
                  </a>
                  <div className="flex-1" />
                  <button
                    type="button"
                    onClick={() => handleDelete(plan.id)}
                    disabled={isDeleting || isApplying}
                    className="p-2 press text-muted-foreground/50 hover:text-rose-400 transition-colors disabled:opacity-40"
                  >
                    {isDeleting ? (
                      <div className="w-4 h-4 border border-rose-400/40 border-t-rose-400 rounded-full animate-spin" />
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApply(plan.id)}
                    disabled={isApplying || isDeleting}
                    className="bg-primary text-primary-foreground font-bold text-xs rounded-full px-4 py-2 press disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isApplying ? "Applying..." : "Apply"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
