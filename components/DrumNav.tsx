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
const CAPSULE_W = 64;
const EDGE_ZONE = 36;

export default function DrumNav() {
  const pathname = usePathname();
  const router = useRouter();
  const confirmedIndex = Math.max(0, NAV.findIndex((n) => n.href === pathname));

  const [open, _setOpen] = useState(false);
  const [offset, _setOffset] = useState(confirmedIndex * ITEM_H);
  const [pulsing, setPulsing] = useState<number | null>(null);

  // Refs that mirror state so event handlers don't go stale
  const openRef = useRef(false);
  const offsetRef = useRef(confirmedIndex * ITEM_H);

  const setOpen = useCallback((val: boolean) => {
    openRef.current = val;
    _setOpen(val);
  }, []);

  const setOffset = useCallback((val: number) => {
    offsetRef.current = val;
    _setOffset(val);
  }, []);

  // Gesture refs
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

  // Sync wheel position when route changes externally
  useEffect(() => {
    const idx = Math.max(0, NAV.findIndex((n) => n.href === pathname));
    setOffset(idx * ITEM_H);
    startOffset.current = idx * ITEM_H;
    lastSnapIdx.current = idx;
  }, [pathname, setOffset]);

  const triggerPulse = useCallback((idx: number) => {
    setPulsing(idx);
    setTimeout(() => setPulsing(null), 180);
  }, []);

  const snapAndNavigate = useCallback((rawOffset: number, vel: number = 0) => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    let current = rawOffset;
    const friction = 0.86;

    function step() {
      current += vel;
      vel *= friction;
      const snapIdx = Math.max(0, Math.min(NAV.length - 1, Math.round(current / ITEM_H)));

      if (snapIdx !== lastSnapIdx.current) {
        lastSnapIdx.current = snapIdx;
        triggerPulse(snapIdx);
      }

      if (Math.abs(vel) < 0.5) {
        const snapped = snapIdx * ITEM_H;
        setOffset(snapped);
        startOffset.current = snapped;
        router.push(NAV[snapIdx].href);
        setOpen(false);
        return;
      }

      current = Math.max(0, Math.min((NAV.length - 1) * ITEM_H, current));
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
      // Sync start offset to wherever the animation stopped
      startOffset.current = offsetRef.current;
    }
  }, []);

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
      // Swipe right to dismiss without navigating
      setOpen(false);
      setOffset(confirmedIndex * ITEM_H);
      startOffset.current = confirmedIndex * ITEM_H;
      lastSnapIdx.current = confirmedIndex;
      isEdgeSwipe.current = false;
    } else if (openRef.current && Math.abs(dy) > 6) {
      // Spinning the drum wheel
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
      // Finger lift after scroll → snap and navigate
      snapAndNavigate(offsetRef.current, -velY.current * 35);
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

  // Tap outside capsule → confirm navigation to previewed item
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
  const capsuleH = ITEM_H * 5;

  return (
    <>
      {/* 6 dots — right edge, visible only at rest */}
      <div
        className="md:hidden fixed right-2.5 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2.5 pointer-events-none"
        style={{ opacity: open ? 0 : 1, transition: "opacity 0.15s ease" }}
      >
        {NAV.map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-center"
            style={{ width: 8, height: 8 }}
          >
            {i === confirmedIndex ? (
              <div className="w-[7px] h-[7px] rounded-full gold-dot-glow" />
            ) : (
              <div className="w-[5px] h-[5px] rounded-full bg-foreground/25" />
            )}
          </div>
        ))}
      </div>

      {/* Tap-outside backdrop — confirms navigation */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40"
          onPointerDown={confirmNavigation}
        />
      )}

      {/* Camera Control capsule — flush with right screen edge */}
      <div
        className="md:hidden fixed top-1/2 right-0 z-50"
        style={{
          transform: `translateY(-50%) translateX(${open ? "0px" : `${CAPSULE_W + 4}px`})`,
          transition: open
            ? "transform 0.42s cubic-bezier(0.34,1.56,0.64,1)"
            : "transform 0.26s cubic-bezier(0.4,0,0.6,1)",
          width: CAPSULE_W,
          height: capsuleH,
          willChange: "transform",
        }}
      >
        {/* Glass panel — rounded on left, flush/square on right */}
        <div
          className="w-full h-full glass overflow-hidden relative"
          style={{ borderRadius: "20px 0 0 20px" }}
        >
          {/* Top fade */}
          <div className="absolute inset-x-0 top-0 h-14 z-10 pointer-events-none drum-fade-top" />
          {/* Bottom fade */}
          <div className="absolute inset-x-0 bottom-0 h-14 z-10 pointer-events-none drum-fade-bottom" />

          {/* Center selection highlight band */}
          <div
            className="absolute inset-x-0 z-10 pointer-events-none"
            style={{ top: "50%", height: ITEM_H, transform: "translateY(-50%)" }}
          >
            <div className="h-full mx-2 rounded-xl drum-center-highlight" />
          </div>

          {/* 3D drum wheel */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              perspective: "280px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                height: capsuleH,
                transformStyle: "preserve-3d",
              }}
            >
              {NAV.map((item, i) => {
                const relativePos = i * ITEM_H - offset;
                const centerDist = relativePos / ITEM_H;
                const rotX = centerDist * DEG_PER_ITEM;
                const opacity = Math.max(0, 1 - Math.abs(centerDist) * 0.42);
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
                      className={isActive ? "text-foreground" : "text-foreground/40"}
                      style={{
                        width: 20,
                        height: 20,
                        flexShrink: 0,
                        transform: isPulsing ? "scale(1.4)" : "scale(1)",
                        transition: isPulsing ? "none" : "transform 0.12s ease",
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
