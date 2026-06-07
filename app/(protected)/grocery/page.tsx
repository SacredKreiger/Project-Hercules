import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import GroceryView from "@/components/GroceryView";
import type { MealPlanRow } from "@/lib/actions/meal-plan";

export default async function GroceryPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data, error } = await supabase
    .from("meal_plans")
    .select("id, name, slots, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const plans = (data ?? []) as MealPlanRow[];

  const params = await searchParams;
  const initialPlanId = params.plan ?? plans[0]?.id ?? null;

  if (plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-8 gap-3">
        <p className="text-4xl">🛒</p>
        <p className="text-base font-bold">No meal plans yet</p>
        <p className="text-sm text-muted-foreground">Create a meal plan first to generate a grocery list.</p>
        <a
          href="/meals"
          className="mt-2 bg-primary text-primary-foreground font-bold rounded-full px-5 py-2.5 text-sm"
        >
          Go to Meals
        </a>
      </div>
    );
  }

  return <GroceryView plans={plans} initialPlanId={initialPlanId} />;
}
