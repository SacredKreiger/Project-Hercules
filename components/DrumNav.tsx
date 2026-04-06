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

  // 60s auto-dismiss: closes capsule WITHOUT navigating
  const resetDismissTimer = useCallback(() => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(() => {
      if (!openRef.current) return;
      const snapped = confirmedIndex * ITEM_H;
      setOffset(snapped);
      startOffset.current = snapped;
      lastSnapIdx.current = confirmedIndex;
      setOpen(false);
    }, AUTO_DISMISS_MS);
  }, [confirmedIndex, setOffset, setOpen]);

  useEffect(() => {
    if (open) resetDismissTimer();
    else if (dismissTimer.current) clearTimeout(dismissTimer.current);
    return () => { if (dismissTimer.current) clearTimeout(dismissTimer.current); };
  }, [open, resetDismissTimer]);

  // Sync wheel to route when navigating externally
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

  // BUG FIX: snapTo only moves the wheel — does NOT navigate or close the capsule.
  // Navigation only happens from confirmNavigation() or auto-dismiss.
  const snapTo = useCallback((rawOffset: number, vel: number = 0) => {
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
        // BUG FIX: update startOffset when animation settles so next drag starts correctly
        startOffset.current = snapPoint;
        return;
      }

      setOffset(current);
      animRef.current = requestAnimationFrame(step);
    }
    animRef.current = requestAnimationFrame(step);
  }, [triggerPulse, setOffset]);

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
      // Sync start to wherever the animation stopped
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
      // Swipe in from right edge → open capsule
      setOpen(true);
      startOffset.current = offsetRef.current;
    } else if (openRef.current && !hasScrolled.current && dx > 50 && Math.abs(dy) < 20) {
      // Swipe right → dismiss without navigating
      setOpen(false);
      setOffset(confirmedIndex * ITEM_H);
      startOffset.current = confirmedIndex * ITEM_H;
      lastSnapIdx.current = confirmedIndex;
      isEdgeSwipe.current = false;
    } else if (openRef.current && Math.abs(dy) > 6) {
      // Spinning the drum wheel
      hasScrolled.current = true;
      e.preventDefault(); // prevents click from firing after scroll → backdrop onClick won't trigger
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
      // Finger lift after scroll → snap to nearest item, but STAY OPEN
      snapTo(offsetRef.current, -velY.current * 30);
    }

    isEdgeSwipe.current = false;
    hasScrolled.current = false;
    // Note: startOffset.current updated by snapTo() when it settles
  }, [snapTo]);

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

  // BUG FIX: onClick instead of onPointerDown — onClick is suppressed after a scroll
  // (because e.preventDefault() was called in touchmove), so it only fires on clean taps.
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

      {/* BUG FIX: onClick (not onPointerDown) so scrolling the wheel doesn't immediately confirm */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40"
          onClick={confirmNavigation}
        />
      )}

      {/* Camera Control capsule — blooms from dot cluster position */}
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
          // Outer depth shadow — protrusion from bezel
          filter: "drop-shadow(-6px 0 18px oklch(0 0 0 / 55%)) drop-shadow(-2px 0 6px oklch(0 0 0 / 35%))",
        }}
      >
        {/* BUG FIX: no background:"none" override — let .glass class handle the
            tilt-reactive radial gradient. Removed inner "frosted base" div that
            was duplicating backdrop-filter and bypassing the CSS variable reactivity. */}
        <div
          className="w-full h-full glass overflow-hidden relative"
          style={{ borderRadius: "20px 0 0 20px" }}
        >
          {/* Bezel-bend: left edge specular highlight simulating curved physical surface */}
          <div
            className="absolute top-0 bottom-0 left-0 pointer-events-none z-20"
            style={{
              width: 6,
              background: "linear-gradient(to right, oklch(1 0 0 / 55%), transparent)",
            }}
          />

          {/* Bezel-bend: outer edge gradient sweep (light catching the curve) */}
          <div
            className="absolute inset-0 pointer-events-none z-20"
            style={{
              background:
                "linear-gradient(to right, oklch(1 0 0 / 18%) 0px, oklch(1 0 0 / 8%) 6px, transparent 20px)",
            }}
          />

          {/* Top corner softening */}
          <div
            className="absolute top-0 inset-x-0 pointer-events-none z-20"
            style={{
              height: 20,
              background: "linear-gradient(to bottom, oklch(1 0 0 / 20%), transparent)",
            }}
          />

          {/* Bottom corner softening */}
          <div
            className="absolute bottom-0 inset-x-0 pointer-events-none z-20"
            style={{
              height: 20,
              background: "linear-gradient(to top, oklch(1 0 0 / 20%), transparent)",
            }}
          />

          {/* Left gold edge glow line */}
          <div
            className="absolute top-0 bottom-0 left-0 pointer-events-none z-20"
            style={{
              width: 1,
              background: "linear-gradient(to bottom, transparent, oklch(0.82 0.15 78 / 60%), transparent)",
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
