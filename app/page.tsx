import Link from "next/link";

const FEATURES = [
  {
    label: "Meal Planning",
    desc: "AI-generated weekly plans for your phase",
  },
  {
    label: "Macro Tracking",
    desc: "Auto-calculated calorie & macro targets",
  },
  {
    label: "Training Plans",
    desc: "Phase-specific programs with progressive overload",
  },
  {
    label: "Progress Tracking",
    desc: "Log weight, track trends, and visualize gains",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full overflow-y-auto overflow-x-hidden bg-background flex flex-col relative">

      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-1/2 -left-32 w-[400px] h-[400px] rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-primary/10 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-20 px-6 py-4 flex items-center justify-between glass border-b border-white/10">
        <span className="text-xl font-black tracking-[0.2em] text-foreground">
          MVNMT
        </span>
        <div className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className="px-4 py-2 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors press"
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="px-5 py-2 rounded-full bg-primary text-primary-foreground font-semibold text-sm press"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-24 gap-10">
        <div className="space-y-5 max-w-xl">
          {/* Eyebrow pill */}
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 border border-primary/20 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              · Bulk · Cut · Maintenance ·
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-[1.05]">
            Move with<br />
            a purpose.
          </h1>

          {/* Subtext */}
          <p className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto">
            Personalized meal plans, macro tracking, and training programs —
            built around your body and goals.
          </p>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-none sm:w-auto">
          <Link
            href="/sign-up"
            className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-semibold text-base press inline-block"
          >
            Get Started
          </Link>
          <Link
            href="/sign-in"
            className="px-8 py-3 rounded-full glass font-medium text-base press inline-block"
          >
            Sign In
          </Link>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-2 gap-3 max-w-lg w-full mt-4">
          {FEATURES.map(({ label, desc }) => (
            <div key={label} className="glass widget-shadow rounded-2xl p-4 text-left">
              <p className="font-semibold text-sm text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          MVNMT · Move with a purpose
        </p>
      </footer>
    </div>
  );
}
