import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="h-full overflow-hidden bg-background flex flex-col items-center justify-between px-6 relative select-none">

      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-primary/20 blur-[140px]" />
        <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-primary/10 blur-[100px]" />
      </div>

      {/* Top spacer */}
      <div className="flex-1" />

      {/* Hero */}
      <div className="relative z-10 flex flex-col items-center text-center gap-5">
        <h1
          className="font-black tracking-[0.08em] leading-none text-foreground"
          style={{ fontSize: "clamp(5rem, 22vw, 14rem)" }}
        >
          MVNMT
        </h1>
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground">
          Move · Visualize · Nourish · Master · Train
        </p>
      </div>

      {/* Bottom spacer */}
      <div className="flex-1" />

      {/* CTA — anchored to bottom */}
      <div className="relative z-10 w-full max-w-sm flex flex-col gap-3 pb-safe mb-6">
        <Link
          href="/sign-in"
          className="w-full py-4 rounded-full bg-primary text-primary-foreground font-semibold text-base text-center press"
        >
          Enter
        </Link>
      </div>

    </div>
  );
}
