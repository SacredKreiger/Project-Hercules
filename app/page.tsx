"use client";

import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight">HERCULES</h1>
        <div className="flex gap-3">
          <Link href="/sign-in" className={cn(buttonVariants({ variant: "ghost" }))}>Sign In</Link>
          <Link href="/sign-up" className={cn(buttonVariants({ variant: "default" }))}>Get Started</Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 space-y-8">
        <div className="space-y-4 max-w-2xl">
          <h2 className="text-5xl font-extrabold tracking-tight leading-tight">
            Build your strongest self
          </h2>
          <p className="text-xl text-muted-foreground">
            Personalized meal plans, macro tracking, training programs, and progress tracking — all in one place. Built for bulk, cut, and maintenance.
          </p>
        </div>
        <div className="flex gap-4">
          <Link href="/sign-up" className={cn(buttonVariants({ size: "lg" }))}>Start for Free</Link>
          <Link href="/sign-in" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>Sign In</Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 max-w-3xl w-full">
          {[
            { label: "Meal Planning", desc: "Personalized weekly plans based on your phase" },
            { label: "Macro Tracking", desc: "Auto-calculated calorie & macro targets" },
            { label: "Training Plans", desc: "Phase-specific workout programs" },
            { label: "Progress Tracking", desc: "Log weight and visualize your journey" },
          ].map(({ label, desc }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4 text-left">
              <p className="font-semibold text-sm">{label}</p>
              <p className="text-xs text-muted-foreground mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
