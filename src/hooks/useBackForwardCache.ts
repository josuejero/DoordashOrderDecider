// src/hooks/useBackForwardCache.ts
import { useEffect } from "react";

/**
 * Hook for wiring up BFCache (back/forward cache) restore logic.
 * Currently kept minimal but centralised so App.tsx stays small.
 */
export function useBackForwardCache(): void {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Reserved for future refresh logic.
      }
    };

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);
}
