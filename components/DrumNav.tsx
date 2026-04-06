"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LayoutDashboard, UtensilsCrossed, ShoppingCart, Dumbbell, TrendingUp, User } from "lucide-react";

const NAV = [
  { href: "/dashboard", icon: LayoutDashboard },
  { href: "/meals", icon: UtensilsCrossed },
  { href: "/grocery", icon: ShoppingCart },
  { href: "/train", icon: Dumbbell },
  { href: "/progress", icon: TrendingUp },
  { href: "/profile", icon: User },
];

const ITEM_H = 52;
const DEG_PER_ITEM = 26;
const CAPSULE_W = 44;
const CAPSULE_H = ITEM_H * 5; // 260px
const EDGE_ZONE = 36;
const AUTO_DISMISS_MS = 60_000;

const CLOSED_SCALE_X = 0.18;
const CLOSED_SCALE_Y = 0.35;

export default function DrumNav() {
  const pathname = usePathname();
  const router = useRouter();
  const confirmedIndex = Math.max(0, NAV.findIndex((n) => n.href === pathname));

  const [open, _setOpen] = useState(false);
  const [offset, _setOffset] = useState(confirmedIndex * ITEM_H);
  const [pulsing, setPulsing] = useState<number | null>(null);

  const openRef = useRef(false);
  const offsetRef = useRef(confirmedIndex * ITEM_H);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setOpen = useCallback((val: boolean) => {
    openRef.current = val;
    _setOpen(val);
  }, []);

  const setOffset = useCallback((val: number) => {
    offsetRef.current = val;
    _setOffset(val);
  }, []);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const startOffset = useRef(confirmedIndex * ITEM_H);
  const isEdgeSwipe = useRef(false);
  const hasScrolled = useRef(false);
  const velY = useRef(0);
  const lastY = useRef(0);
  const lastT = useRef(0);
  const animRef = useRef<number | null>(null);
  const lastSnapIdx = useRef(confirmedIndex);

  // Reset 60s auto-dismiss timer whenever capsule opens or user interacts
  const resetDismissTimer = useCallback(() => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(() => {
      if (openRef.current) {
        // Dismiss without navigating — snap back to confirmed index
        const snapped = confirmedIndex * ITEM_H;
        setOffset(snapped);
        startOffset.current = snapped;
        lastSnapIdx.current = confirmedIndex;
        setOpen(false);
      }
    }, AUTO_DISMISS_MS);
  }, [confirmedIndex, setOffset, setOpen]);

  useEffect(() => {
    if (open) resetDismissTimer();
    else {
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
    }
    return () => { if (dismissTimer.current) clearTimeout(dismissTimer.current); };
  }, [open, resetDismissTimer]);

  useEffect(() => {
    const idx = Math.max(0, NAV.findIndex((n) => n.href === pathname));
    setOffset(idx * ITEM_H);
    startOffset.current = idx * ITEM_H;
    lastSnapIdx.current = idx;
  }, [pathname, setOffset]);

  const triggerPulse = useCallback((idx: number) => {
    setPulsing(idx);
    setTimeout(() => setPulsing(null), 160);
  }, []);

  const snapAndNavigate = useCallback((rawOffset: number, vel: number = 0) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    let current = rawOffset;
    const friction = 0.82;
    const magnetStrength = 0.14;

    function step() {
      const nearIdx = Math.max(0, Math.min(NAV.length - 1, Math.round(current / ITEM_H)));
      const snapPoint = nearIdx * ITEM_H;
      vel += (snapPoint - current) * magnetStrength;
      vel *= friction;
      current += vel;
      current = Math.max(0, Math.min((NAV.length - 1) * ITEM_H, current));

      if (nearIdx !== lastSnapIdx.current) {
        lastSnapIdx.current = nearIdx;
        triggerPulse(nearIdx);
      }

      const dist = Math.abs(snapPoint - current);
      if (Math.abs(vel) < 0.25 && dist < 0.8) {
        setOffset(snapPoint);
        startOffset.current = snapPoint;
        router.push(NAV[nearIdx].href);
        setOpen(false);
        return;
      }

      setOffset(current);
      animRef.current = requestAnimationFrame(step);
    }
    animRef.current = requestAnimationFrame(step);
  }, [router, triggerPulse, setOffset, setOpen]);

  const onTouchStart = useCallback((e: TouchEvent) => {
    const t = e.touches[0];
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
    lastY.current = t.clientY;
    lastT.current = Date.now();
    velY.current = 0;
    hasScrolled.current = false;
    isEdgeSwipe.current = t.clientX > window.innerWidth - EDGE_ZONE || openRef.current;
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
      startOffset.current = offsetRef.current;
    }
    if (openRef.current) resetDismissTimer();
  }, [resetDismissTimer]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!isEdgeSwipe.current) return;
    const t = e.touches[0];
    const dx = t.clientX - touchStartX.current;
    const dy = t.clientY - touchStartY.current;
    const now = Date.now();
    const dt = Math.max(1, now - lastT.current);
    velY.current = (t.clientY - lastY.current) / dt;
    lastY.current = t.clientY;
    lastT.current = now;

    if (!openRef.current && dx < -18) {
      setOpen(true);
      startOffset.current = offsetRef.current;
    } else if (openRef.current && !hasScrolled.current && dx > 50 && Math.abs(dy) < 20) {
      setOpen(false);
      setOffset(confirmedIndex * ITEM_H);
      startOffset.current = confirmedIndex * ITEM_H;
      lastSnapIdx.current = confirmedIndex;
      isEdgeSwipe.current = false;
    } else if (openRef.current && Math.abs(dy) > 6) {
      hasScrolled.current = true;
      e.preventDefault();
      const newOff = Math.max(0, Math.min((NAV.length - 1) * ITEM_H, startOffset.current - dy));
      setOffset(newOff);
      const snapIdx = Math.max(0, Math.min(NAV.length - 1, Math.round(newOff / ITEM_H)));
      if (snapIdx !== lastSnapIdx.current) {
        lastSnapIdx.current = snapIdx;
        triggerPulse(snapIdx);
      }
    }
  }, [confirmedIndex, triggerPulse, setOpen, setOffset]);

  const onTouchEnd = useCallback(() => {
    if (!isEdgeSwipe.current) return;

    if (openRef.current && hasScrolled.current) {
      snapAndNavigate(offsetRef.current, -velY.current * 30);
    }

    isEdgeSwipe.current = false;
    hasScrolled.current = false;
    startOffset.current = offsetRef.current;
  }, [snapAndNavigate]);

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

  // Tap anywhere outside capsule → confirm + navigate
  function confirmNavigation() {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const idx = Math.max(0, Math.min(NAV.length - 1, Math.round(offsetRef.current / ITEM_H)));
    const snapped = idx * ITEM_H;
    setOffset(snapped);
    startOffset.current = snapped;
    lastSnapIdx.current = idx;
    router.push(NAV[idx].href);
    setOpen(false);
  }

  const activeIdx = Math.round(offset / ITEM_H);

  return (
    <>
      {/* 6 bare dots — right edge, visible at rest */}
      <div
        className="md:hidden fixed right-2.5 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-[10px] pointer-events-none"
        style={{ opacity: open ? 0 : 1, transition: "opacity 0.2s ease" }}
      >
        {NAV.map((_, i) => (
          <div key={i} style={{ width: 8, height: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {i === confirmedIndex ? (
              <div className="w-[7px] h-[7px] rounded-full gold-dot-glow" />
            ) : (
              <div className="w-[5px] h-[5px] rounded-full bg-foreground/25" />
            )}
          </div>
        ))}
      </div>

      {/* Tap anywhere → confirm navigation */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40" onPointerDown={confirmNavigation} />
      )}

      {/* Camera Control capsule */}
      <div
        className="md:hidden fixed top-1/2 right-0 z-50"
        style={{
          width: CAPSULE_W,
          height: CAPSULE_H,
          transformOrigin: "right center",
          transform: open
            ? "translateY(-50%) scale(1, 1)"
            : `translateY(-50%) scale(${CLOSED_SCALE_X}, ${CLOSED_SCALE_Y})`,
          opacity: open ? 1 : 0,
          transition: open
            ? "transform 0.44s cubic-bezier(0.34,1.56,0.64,1), opacity 0.22s ease"
            : "transform 0.26s cubic-bezier(0.4,0,0.6,1), opacity 0.18s ease",
          willChange: "transform, opacity",
          pointerEvents: "none",
          // Outer depth shadow — makes it look like it protrudes from the bezel
          filter: "drop-shadow(-6px 0 18px oklch(0 0 0 / 55%)) drop-shadow(-2px 0 6px oklch(0 0 0 / 35%))",
        }}
      >
        {/* Glass body */}
        <div
          className="w-full h-full glass overflow-hidden relative"
          style={{
            borderRadius: "20px 0 0 20px",
            // Perspective curve: makes the left face look like it bends outward
            background: "none",
          }}
        >
          {/* Bezel-bend gradient layer — mimics a curved physical surface catching light */}
          <div
            className="absolute inset-0 pointer-events-none z-20"
            style={{
              borderRadius: "20px 0 0 20px",
              background: `
                linear-gradient(
                  to right,
                  oklch(1 0 0 / 22%) 0px,
                  oklch(1 0 0 / 10%) 4px,
                  transparent 18px
                )
              `,
            }}
          />

          {/* Frosted glass base */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              borderRadius: "20px 0 0 20px",
              backdropFilter: "blur(28px) saturate(200%)",
              WebkitBackdropFilter: "blur(28px) saturate(200%)",
              background:
                "radial-gradient(ellipse 90% 60% at var(--tilt-x) var(--tilt-y), oklch(1 0 0 / 12%) 0%, transparent 70%), oklch(1 0 0 / 8%)",
              boxShadow: `
                -1px 0 0 0 oklch(0.82 0.15 78 / 50%),
                -3px 0 16px oklch(0.76 0.14 78 / 20%),
                inset 1px 0 0 0 oklch(1 0 0 / 30%)
              `,
            }}
          />

          {/* Left rounded-edge specular — the "bevel" that makes it look 3D */}
          <div
            className="absolute top-0 bottom-0 left-0 pointer-events-none z-20"
            style={{
              width: 6,
              borderRadius: "20px 0 0 20px",
              background: "linear-gradient(to right, oklch(1 0 0 / 55%), transparent)",
            }}
          />

          {/* Top/bottom corner softening */}
          <div
            className="absolute top-0 left-0 right-0 pointer-events-none z-20"
            style={{
              height: 20,
              background: "linear-gradient(to bottom, oklch(1 0 0 / 18%), transparent)",
              borderRadius: "20px 0 0 0",
            }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 pointer-events-none z-20"
            style={{
              height: 20,
              background: "linear-gradient(to top, oklch(1 0 0 / 18%), transparent)",
              borderRadius: "0 0 0 20px",
            }}
          />

          {/* Top/bottom wheel fade */}
          <div className="absolute inset-x-0 top-0 h-14 z-10 pointer-events-none drum-fade-top" />
          <div className="absolute inset-x-0 bottom-0 h-14 z-10 pointer-events-none drum-fade-bottom" />

          {/* Center selection band */}
          <div
            className="absolute inset-x-0 z-10 pointer-events-none"
            style={{ top: "50%", height: ITEM_H, transform: "translateY(-50%)" }}
          >
            <div className="h-full mx-1.5 rounded-xl drum-center-highlight" />
          </div>

          {/* 3D drum wheel */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              perspective: "260px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 5,
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                height: CAPSULE_H,
                transformStyle: "preserve-3d",
              }}
            >
              {NAV.map((item, i) => {
                const relativePos = i * ITEM_H - offset;
                const centerDist = relativePos / ITEM_H;
                const rotX = centerDist * DEG_PER_ITEM;
                const opacity = Math.max(0, 1 - Math.abs(centerDist) * 0.44);
                const isActive = i === activeIdx;
                const isPulsing = i === pulsing;

                return (
                  <div
                    key={item.href}
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      height: ITEM_H,
                      top: "50%",
                      marginTop: -ITEM_H / 2,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transform: `translateY(${relativePos}px) rotateX(${rotX}deg)`,
                      transformOrigin: "center center",
                      opacity,
                      transition: "none",
                    }}
                  >
                    <item.icon
                      className={isActive ? "text-foreground" : "text-foreground/35"}
                      style={{
                        width: 18,
                        height: 18,
                        flexShrink: 0,
                        transform: isPulsing ? "scale(1.45)" : "scale(1)",
                        transition: isPulsing ? "none" : "transform 0.1s ease",
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
