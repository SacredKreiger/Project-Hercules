"use client";

import { useEffect, useState } from "react";

export function MealsEnabledGate({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("hc-meals-enabled");
    if (stored === "false") setEnabled(false);
  }, []);

  if (!enabled) return null;
  return <>{children}</>;
}
