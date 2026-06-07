import type { MacroTotals } from "@/lib/types/food";

interface Props {
  target: MacroTotals;
  consumed: MacroTotals;
}

export default function MacroProgressCard({ target, consumed }: Props) {
  const remaining = Math.round(target.calories - consumed.calories);

  return (
    <div className="glass widget-shadow rounded-2xl p-4 space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Remaining</p>
          <p className={`text-3xl font-bold tabular-nums mt-0.5 ${remaining < 0 ? "text-rose-400" : ""}`}>
            {remaining.toLocaleString()}
            <span className="text-base font-normal text-muted-foreground ml-1">kcal</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground tabular-nums">{Math.round(consumed.calories)} eaten</p>
          <p className="text-xs text-muted-foreground tabular-nums">of {Math.round(target.calories)} goal</p>
        </div>
      </div>

      <div className="space-y-2">
        {[
          { label: "Protein", consumed: Math.round(consumed.protein), target: Math.round(target.protein), color: "bg-blue-500" },
          { label: "Carbs",   consumed: Math.round(consumed.carbs),   target: Math.round(target.carbs),   color: "bg-amber-500" },
          { label: "Fat",     consumed: Math.round(consumed.fat),     target: Math.round(target.fat),     color: "bg-rose-500" },
        ].map(({ label, consumed: c, target: t, color }) => {
          const pct = t > 0 ? Math.min(100, Math.round((c / t) * 100)) : 0;
          return (
            <div key={label} className="space-y-1">
              <div className="flex justify-between">
                <span className="text-[11px] text-muted-foreground">{label}</span>
                <span className="text-[11px] font-semibold tabular-nums">
                  {c}<span className="text-muted-foreground font-normal">/{t}g</span>
                </span>
              </div>
              <div className="h-1.5 bg-foreground/8 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-300 ${color}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
