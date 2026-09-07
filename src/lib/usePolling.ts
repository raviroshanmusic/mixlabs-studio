"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// Polling that stops when nobody's looking.
//
// Every poll costs Supabase egress, and the free tier allows 5GB a month. A
// review room left open in a background tab was polling every 45 seconds all
// day — around 2,000 requests, for a screen nobody had looked at since morning.
// That, more than real use, is what put the project over quota.
//
// So: don't poll while the document is hidden, and fetch once on the way back
// so returning to the tab still shows current data. The behaviour while you're
// actually using the app is unchanged.

export function usePolling(
  fn: () => void | Promise<void>,
  intervalMs: number,
  opts: { enabled?: boolean } = {},
) {
  const enabled = opts.enabled ?? true;
  // Held in a ref so a changing callback doesn't tear down and restart the
  // timer on every render.
  const saved = useRef(fn);
  saved.current = fn;

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const run = () => { void saved.current(); };

    const start = () => {
      if (timer) return;
      timer = setInterval(() => {
        // Belt and braces: a tab can be hidden between ticks.
        if (document.visibilityState === "visible") run();
      }, intervalMs);
    };

    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        run();     // catch up immediately rather than waiting a full interval
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [intervalMs, enabled]);
}

// router.refresh() re-runs the whole project page — twenty-odd queries. Tagging
// ten props during a breakdown fired it ten times, so a burst of edits cost far
// more than the edits themselves. Coalescing them into one refresh keeps the
// data fresh without paying per keystroke.
export function useDebouncedRefresh(delayMs = 800) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = null; router.refresh(); }, delayMs);
  };
}
