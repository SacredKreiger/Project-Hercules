"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, UtensilsCrossed, ShoppingCart, Dumbbell, TrendingUp, User } from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/meals", label: "Meals", icon: UtensilsCrossed },
  { href: "/grocery", label: "Grocery", icon: ShoppingCart },
  { href: "/train", label: "Train", icon: Dumbbell },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/profile", label: "Profile", icon: User },
];

const ITEM_H = 56;
const DEG_PER_ITEM = 26;
const DRAWER_W = 200;
const EDGE_ZONE = 30;

export default function DrumNav() {
  const pathname = usePathname();
  const router = useRouter();

  const currentIndex = Math.max(0, NAV.findIndex((n) => n.href === pathname));

  const [open, setOpen] = useState(false);
  const [drawerX, setDrawerX] = useState(DRAWER_W);
  const [offset, setOffset] = useState(currentIndex * ITEM_H);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const startOffset = useRef(currentIndex * ITEM_H);
  const isEdge = useRef(false);
  const isWheel = useRef(false);
  const velY = useRef(0);
  const lastY = useRef(0);
  const lastT = useRef(0);
  const animRef = useRef<number | null>(null);

  // Sync offset when route changes externally
  useEffect(() => {
    const idx = Math.max(0, NAV.findIndex((n) => n.href === pathname));
    setOffset(idx * ITEM_H);
    startOffset.current = idx * ITEM_H;
  }, [pathname]);

  const snapTo = useCallback((rawOffset: number, vel: number = 0) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    let current = rawOffset;
    const friction = 0.88;

    function step() {
      current += vel;
      vel *= friction;
      if (Math.abs(vel) < 0.5) {
        const idx = Math.max(0, Math.min(NAV.length - 1, Math.round(current / ITEM_H)));
        const snapped = idx * ITEM_H;
        setOffset(snapped);
        startOffset.current = snapped;
        router.push(NAV[idx].href);
        return;
      }
      current = Math.max(0, Math.min((NAV.length - 1) * ITEM_H, current));
      setOffset(current);
      animRef.current = requestAnimationFrame(step);
    }
    animRef.current = requestAnimationFrame(step);
  }, [router]);

  const onTouchStart = useCallback((e: TouchEvent) => {
    const t = e.touches[0];
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
    lastY.current = t.clientY;
    lastT.current = Date.now();
    velY.current = 0;
    isEdge.current = t.clientX > window.innerWidth - EDGE_ZONE || open;
    isWheel.current = false;
    if (animRef.current) cancelAnimationFrame(animRef.current);
  }, [open]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!isEdge.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartX.current;
    const dy = t.clientY - touchStartY.current;
    const now = Date.now();
    const dt = Math.max(1, now - lastT.current);
    velY.current = (t.clientY - lastY.current) / dt;
    lastY.current = t.clientY;
    lastT.current = now;

    if (!open) {
      // Sliding drawer open
      const newX = Math.max(0, DRAWER_W + dx);
      setDrawerX(newX);
      if (newX < 40) { setOpen(true); setDrawerX(0); }
    } else if (!isWheel.current && Math.abs(dx) > Math.abs(dy) * 1.2 && dx > 20) {
      // Swiping drawer closed
      setDrawerX(Math.max(0, dx));
    } else {
      // Spinning the wheel
      isWheel.current = true;
      e.preventDefault();
      const newOff = Math.max(0, Math.min((NAV.length - 1) * ITEM_H, startOffset.current - dy));
      setOffset(newOff);

      // Instant navigation as item snaps
      const idx = Math.max(0, Math.min(NAV.length - 1, Math.round(newOff / ITEM_H)));
      if (NAV[idx].href !== pathname) {
        router.push(NAV[idx].href);
      }
    }
  }, [open, pathname, router]);

  const onTouchEnd = useCallback((e: TouchEvent) => {
    if (!isEdge.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX.current;

    if (!open && dx < -DRAWER_W * 0.25) {
      setOpen(true); setDrawerX(0);
    } else if (open && !isWheel.current && dx > DRAWER_W * 0.25) {
      setOpen(false); setDrawerX(DRAWER_W);
    } else if (open && isWheel.current) {
      snapTo(offset, -velY.current * 40);
      setDrawerX(0);
    } else if (!open) {
      setDrawerX(DRAWER_W);
    }
    isEdge.current = false;
    isWheel.current = false;
    startOffset.current = offset;
  }, [open, offset, snapTo]);

  useEffect(() => {
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]);

  const activeIdx = Math.round(offset / ITEM_H);

  return (
    <>
      {/* Dot indicators — right edge */}
      <div className="md:hidden fixed right-2.5 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2.5 pointer-events-none">
        {NAV.map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === currentIndex
                ? "w-2 h-2 gold-dot-glow"
                : "w-1.5 h-1.5 bg-foreground/20 border border-foreground/10"
            }`}
          />
        ))}
      </div>

      {/* Backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
          onClick={() => { setOpen(false); setDrawerX(DRAWER_W); }}
        />
      )}

      {/* Drawer */}
      <div
        className="md:hidden fixed top-0 right-0 h-full z-50 flex items-center justify-center"
        style={{
          width: DRAWER_W,
          transform: `translateX(${drawerX}px)`,
          transition: drawerX === 0 || drawerX === DRAWER_W ? "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)" : "none",
        }}
      >
        {/* Glass drawer panel */}
        <div className="h-full w-full drum-drawer flex flex-col items-center justify-center gap-6 py-10">

          {/* HERCULES wordmark */}
          <p className="text-xs font-bold tracking-[0.2em] text-primary">HERCULES</p>

          {/* Drum wheel */}
          <div
            className="relative overflow-hidden"
            style={{ height: ITEM_H * 5, width: 160, perspective: 340 }}
          >
            {/* Center highlight */}
            <div className="absolute left-0 right-0 pointer-events-none z-10"
              style={{ top: ITEM_H * 2, height: ITEM_H }}
            >
              <div className="h-full mx-3 rounded-xl drum-center-highlight" />
            </div>

            {/* Top/bottom fade */}
            <div className="absolute inset-x-0 top-0 h-16 z-10 pointer-events-none drum-fade-top" />
            <div className="absolute inset-x-0 bottom-0 h-16 z-10 pointer-events-none drum-fade-bottom" />

            {/* Items */}
            <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
              {NAV.map((item, i) => {
                const relativePos = i * ITEM_H - offset;
                const centerDist = relativePos / ITEM_H; // items from center (-2 to +2 visible)
                const rotX = centerDist * DEG_PER_ITEM;
                const opacity = Math.max(0, 1 - Math.abs(centerDist) * 0.38);
                const isActive = i === activeIdx;

                return (
                  <div
                    key={item.href}
                    className="absolute left-0 right-0 flex items-center justify-center gap-3"
                    style={{
                      height: ITEM_H,
                      top: "50%",
                      marginTop: -ITEM_H / 2,
                      transform: `translateY(${relativePos}px) rotateX(${rotX}deg)`,
                      transformOrigin: "center center",
                      opacity,
                      transition: "none",
                    }}
                  >
                    <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-foreground/60"}`} />
                    <span className={`text-sm font-medium ${isActive ? "text-primary font-semibold" : "text-foreground/60"}`}>
                      {item.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Week indicator */}
          <p className="text-[10px] text-muted-foreground tracking-widest uppercase">swipe to close</p>
        </div>
      </div>
    </>
  );
}
