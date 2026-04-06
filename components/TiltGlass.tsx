"use client";

import { useEffect } from "react";

export default function TiltGlass() {
  useEffect(() => {
    let permission = false;

    function apply(beta: number, gamma: number) {
      // beta: -180 to 180 (front/back tilt), gamma: -90 to 90 (left/right tilt)
      const x = Math.min(100, Math.max(0, (gamma + 90) / 180 * 100));
      const y = Math.min(100, Math.max(0, (beta + 90) / 180 * 100));
      document.documentElement.style.setProperty("--tilt-x", `${x.toFixed(1)}%`);
      document.documentElement.style.setProperty("--tilt-y", `${y.toFixed(1)}%`);
    }

    function handleOrientation(e: DeviceOrientationEvent) {
      apply(e.beta ?? 45, e.gamma ?? 0);
    }

    // iOS 13+ requires permission
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof (DeviceOrientationEvent as any).requestPermission === "function"
    ) {
      (DeviceOrientationEvent as any).requestPermission()
        .then((res: string) => {
          if (res === "granted") {
            window.addEventListener("deviceorientation", handleOrientation, true);
            permission = true;
          }
        })
        .catch(() => {});
    } else if (typeof DeviceOrientationEvent !== "undefined") {
      window.addEventListener("deviceorientation", handleOrientation, true);
      permission = true;
    }

    // Fallback: mouse tilt for desktop only — skip on touch devices to prevent
    // synthetic mousemove events from jumping the gradient on tap.
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    function handleMouse(e: MouseEvent) {
      const x = (e.clientX / window.innerWidth) * 100;
      const y = (e.clientY / window.innerHeight) * 100;
      document.documentElement.style.setProperty("--tilt-x", `${x.toFixed(1)}%`);
      document.documentElement.style.setProperty("--tilt-y", `${y.toFixed(1)}%`);
    }
    if (!isTouchDevice) {
      window.addEventListener("mousemove", handleMouse);
    }

    return () => {
      window.removeEventListener("deviceorientation", handleOrientation);
      window.removeEventListener("mousemove", handleMouse);
    };
  }, []);

  return null;
}
