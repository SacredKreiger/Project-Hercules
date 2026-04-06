"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const FEATURES = [
  { label: "Meal Planning", desc: "Personalized weekly plans for your phase" },
  { label: "Macro Tracking", desc: "Auto-calculated calorie & macro targets" },
  { label: "Training Plans", desc: "Phase-specific workout programs" },
  { label: "Progress Tracking", desc: "Log weight and visualize your journey" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">

      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-1/2 -left-32 w-[400px] h-[400px] rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-primary/10 blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-6 py-5 flex items-center justify-between glass border-b border-white/20">
        <span className="text-lg font-bold tracking-[0.15em] text-foreground">HERCULES</span>
        <div className="flex gap-2">
          <Link href="/sign-in" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-full text-sm")}>
            Sign In
          </Link>
          <Link href="/sign-up" className={cn(buttonVariants({ size: "sm" }), "glass-gold rounded-full text-sm font-semibold text-foreground border-0 px-5")}>
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 py-24 gap-10">
        <div className="space-y-5 max-w-xl">
          <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs font-medium text-primary border border-primary/20 mb-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Bulk · Cut · Maintenance
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.05]">
            Build your<br />
            <span className="text-primary">strongest self</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto">
            Personalized meal plans, macro tracking, and training programs — all designed around your body and goals.
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs sm:max-w-none sm:w-auto">
          <Link
            href="/sign-up"
            className={cn(buttonVariants({ size: "lg" }), "glass-gold rounded-full font-semibold text-foreground border-0 px-8 py-3 text-base")}
          >
            Start for Free
          </Link>
          <Link
            href="/sign-in"
            className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "rounded-full glass px-8 py-3 text-base")}
          >
            Sign In
          </Link>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-2 gap-3 max-w-lg w-full mt-4">
          {FEATURES.map(({ label, desc }) => (
            <div key={label} className="glass widget-shadow rounded-2xl p-4 text-left">
              <p className="font-semibold text-sm text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
