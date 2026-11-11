"use client";

import { useEffect, useRef } from "react";
import { nextFreshnessRefresh } from "@/app/assessment/evidenceLifecycle";

/** No polling or background timers while hidden. Keep one request in flight. */
export default function useFreshnessRefresh(refresh: () => Promise<unknown>, nextRefreshAt?: string | null, enabled = true) {
  const latest = useRef(refresh);
  latest.current = refresh;
  const runningRef = useRef(false);
  const lastAttemptRef = useRef(0);
  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      clearTimeout(timer);
      if (!disposed && document.visibilityState !== "hidden") timer = setTimeout(run, nextFreshnessRefresh(nextRefreshAt));
    };
    const run = async () => {
      if (disposed || runningRef.current || document.visibilityState === "hidden") return;
      // focus and visibilitychange commonly arrive together.
      if (Date.now() - lastAttemptRef.current < 1000) return;
      runningRef.current = true;
      lastAttemptRef.current = Date.now();
      try { await latest.current(); }
      finally { runningRef.current = false; schedule(); }
    };
    const visible = () => { if (document.visibilityState === "hidden") clearTimeout(timer); else void run(); };
    window.addEventListener("focus", run);
    document.addEventListener("visibilitychange", visible);
    schedule();
    return () => { disposed = true; clearTimeout(timer); window.removeEventListener("focus", run); document.removeEventListener("visibilitychange", visible); };
  }, [enabled, nextRefreshAt]);
}
