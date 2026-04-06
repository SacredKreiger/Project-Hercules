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
const CAPSULE_H = ITEM_H * 5;
const EDGE_ZONE = 36;

// iOS 18 spring easing — snappy, overshoots slightly, settles fast
const EASING = "cubic-bezier(0.19, 1, 0.22, 1)";

export default function DrumNav() {
  const pathname = usePathname();
  const router = useRouter();
  const confirmedIndex = Math.max(0, NAV.findIndex((n) => n.href === pathname));

  const [open, _setOpen] = useState(false);
  const [offset, _setOffset] = useState(confirmedIndex * ITEM_H);
  // Haptic: brief scale-down on confirm
  const [confirming, setConfirming] = useState(false);
  // Flash: radial white burst on bezel edge on confirm
  const [flashing, setFlashing] = useState(false);

  const openRef = useRef(false);
  const offsetRef = useRef(confirmedIndex * ITEM_H);
  // Prevents swipe-open gesture from instantly firing global click confirm
  const justOpened = useRef(false);

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
  // True when the capsule was opened during this same touch gesture — that gesture
  // should never trigger snapAndNavigate on lift, only separate scroll gestures should.
  const openedDuringGesture = useRef(false);
  const velY = useRef(0);
  const lastY = useRef(0);
  const lastT = useRef(0);
  const animRef = useRef<number | null>(null);
  const lastSnapIdx = useRef(confirmedIndex);

  useEffect(() => {
    const idx = Math.max(0, NAV.findIndex((n) => n.href === pathname));
    setOffset(idx * ITEM_H);
    startOffset.current = idx * ITEM_H;
    lastSnapIdx.current = idx;
  }, [pathname, setOffset]);

  // Fire haptic visual + flash, then navigate and close
  const fireConfirm = useCallback((idx: number) => {
    // Guard: if already fired (e.g. synthetic click after touchend) — bail out
    if (!openRef.current) return;
    // Immediately block re-entry via the global click listener
    openRef.current = false;

    const snapped = idx * ITEM_H;
    setOffset(snapped);
    startOffset.current = snapped;
    lastSnapIdx.current = idx;

    setConfirming(true);
    setFlashing(true);
    setTimeout(() => setFlashing(false), 160);
    setTimeout(() => {
      router.push(NAV[idx].href);
      setOpen(false);
      setConfirming(false);
    }, 85);
  }, [router, setOffset, setOpen]);

  // Snap wheel with magnetic spring physics — navigates on settle
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
      }

      const dist = Math.abs(snapPoint - current);
      if (Math.abs(vel) < 0.25 && dist < 0.8) {
        setOffset(snapPoint);
        startOffset.current = snapPoint;
        // Settled — fire navigation immediately (the "preview = loading the page")
        fireConfirm(nearIdx);
        return;
      }

      setOffset(current);
      animRef.current = requestAnimationFrame(step);
    }
    animRef.current = requestAnimationFrame(step);
  }, [fireConfirm, setOffset]);

  // Global tap confirm: navigates to whichever item is currently active
  const confirmNavigation = useCallback(() => {
    if (!openRef.current || justOpened.current) return;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    const idx = Math.max(0, Math.min(NAV.length - 1, Math.round(offsetRef.current / ITEM_H)));
    fireConfirm(idx);
  }, [fireConfirm]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("click", confirmNavigation);
    return () => window.removeEventListener("click", confirmNavigation);
  }, [open, confirmNavigation]);

  const onTouchStart = useCallback((e: TouchEvent) => {
    const t = e.touches[0];
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
    lastY.current = t.clientY;
    lastT.current = Date.now();
    velY.current = 0;
    hasScrolled.current = false;
    openedDuringGesture.current = false;
    isEdgeSwipe.current = t.clientX > window.innerWidth - EDGE_ZONE || openRef.current;
    if (animRef.current) {
      cancelAnimationFrame(animRef.current);
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
      setOpen(true);
      openedDuringGesture.current = true;
      startOffset.current = offsetRef.current;
      justOpened.current = true;
      setTimeout(() => { justOpened.current = false; }, 350);
    } else if (openRef.current && !hasScrolled.current && dx > 50 && Math.abs(dy) < 20) {
      // Swipe right → dismiss without navigating
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
    }
  }, [confirmedIndex, setOpen, setOffset]);

  const onTouchEnd = useCallback(() => {
    if (!isEdgeSwipe.current) return;

    if (openRef.current && hasScrolled.current && !openedDuringGesture.current) {
      // Finger lift → spring to nearest item → navigate
      snapAndNavigate(offsetRef.current, -velY.current * 30);
    }

    isEdgeSwipe.current = false;
    hasScrolled.current = false;
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

  const activeIdx = Math.round(offset / ITEM_H);

  return (
    <>
      {/* 6 indicator dots — same size, filled = current page, outline = inactive */}
      <div
        className="md:hidden fixed right-2.5 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-[10px] pointer-events-none"
        style={{ opacity: open ? 0 : 1, transition: `opacity 0.18s ${EASING}` }}
      >
        {NAV.map((_, i) => (
          <div key={i} style={{ width: 8, height: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                // Filled for active page, outline only for inactive
                background: i === confirmedIndex ? "var(--foreground)" : "transparent",
                // border adapts: black in light mode, white in dark mode via --foreground
                border: "1.5px solid var(--foreground)",
                opacity: i === confirmedIndex ? 1 : 0.35,
                transition: `all 0.25s ${EASING}`,
              }}
            />
          </div>
        ))}
      </div>

      {/* Camera Control capsule */}
      <div
        className="md:hidden fixed top-1/2 right-0 z-50"
        style={{
          width: CAPSULE_W,
          height: CAPSULE_H,
          transformOrigin: "right center",
          transform: open
            ? `translateY(-50%) translateX(0) scale(${confirming ? 0.97 : 1})`
            : "translateY(-50%) translateX(105%)",
          transition: open && !confirming
            ? `transform 0.52s ${EASING}`
            : confirming
            ? "transform 0.06s ease-in"
            : `transform 0.38s ${EASING}`,
          willChange: "transform",
          pointerEvents: "none",
          filter: "drop-shadow(-6px 0 20px rgba(0,0,0,0.55)) drop-shadow(-2px 0 6px rgba(0,0,0,0.35))",
        }}
      >
        <div
          className="w-full h-full overflow-hidden relative"
          style={{
            borderRadius: "24px 0 0 24px",
            background: "rgba(20, 20, 20, 0.75)",
            backdropFilter: "blur(15px) saturate(180%)",
            WebkitBackdropFilter: "blur(15px) saturate(180%)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRight: "none",
          }}
        >
          {/* Left rounded-edge specular */}
          <div
            className="absolute top-0 left-0 bottom-0 pointer-events-none z-20"
            style={{ width: 6, background: "linear-gradient(to right, rgba(255,255,255,0.18), transparent)" }}
          />

          {/* Bezel-bend: 3D curvature where screen meets bezel */}
          <div
            className="absolute top-0 right-0 bottom-0 pointer-events-none z-20"
            style={{
              width: 12,
              background: "linear-gradient(to right, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.2) 90%, rgba(0,0,0,0.5) 100%)",
            }}
          />

          {/* Flash: radial white burst on confirm tap — simulates physical button press */}
          {flashing && (
            <div
              className="absolute inset-0 pointer-events-none z-30"
              style={{
                background: "radial-gradient(ellipse 80% 50% at 80% 50%, rgba(255,255,255,0.22) 0%, transparent 70%)",
                animation: `bezel-flash 0.16s ${EASING} forwards`,
              }}
            />
          )}

          {/* Top fade */}
          <div className="absolute inset-x-0 top-0 h-14 z-10 pointer-events-none"
            style={{ background: "linear-gradient(to bottom, rgba(20,20,20,0.92), transparent)" }} />
          {/* Bottom fade */}
          <div className="absolute inset-x-0 bottom-0 h-14 z-10 pointer-events-none"
            style={{ background: "linear-gradient(to top, rgba(20,20,20,0.92), transparent)" }} />

          {/* Center selection band */}
          <div
            className="absolute inset-x-0 z-10 pointer-events-none"
            style={{ top: "50%", height: ITEM_H, transform: "translateY(-50%)" }}
          >
            <div
              className="h-full mx-1.5 rounded-xl"
              style={{
                background: "rgba(255,255,255,0.07)",
                borderTop: "1px solid rgba(255,255,255,0.12)",
                borderBottom: "1px solid rgba(255,255,255,0.12)",
              }}
            />
          </div>

          {/* 3D magnetic drum wheel */}
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
            <div style={{ position: "relative", width: "100%", height: CAPSULE_H, transformStyle: "preserve-3d" }}>
              {NAV.map((item, i) => {
                const relativePos = i * ITEM_H - offset;
                const centerDist = relativePos / ITEM_H;
                const rotX = centerDist * DEG_PER_ITEM;

                // Magnetic scale: active icon snaps up 20%, nearby icons pulled proportionally
                const distAbs = Math.abs(centerDist);
                const magneticScale = i === activeIdx
                  ? 1.2
                  : Math.max(0.82, 1.0 - distAbs * 0.09);

                // Brightness: active full, inactive dims to 0.4
                const iconOpacity = i === activeIdx
                  ? 1
                  : Math.max(0.4, 1 - distAbs * 0.28);

                // 3D depth fade for items far off-center
                const depthOpacity = Math.max(0, 1 - distAbs * 0.42);

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
                      opacity: depthOpacity,
                      transition: "none",
                    }}
                  >
                    <item.icon
                      style={{
                        width: 18,
                        height: 18,
                        flexShrink: 0,
                        color: `rgba(255,255,255,${iconOpacity})`,
                        // Magnetic scale applied with spring easing
                        transform: `scale(${magneticScale})`,
                        transition: `transform 0.4s ${EASING}, color 0.3s ${EASING}`,
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
