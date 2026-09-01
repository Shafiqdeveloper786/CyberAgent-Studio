"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = (): (() => void) => () => {};

/**
 * Returns the current page origin in a hydration-safe way.
 *
 *  - Server render + React's hydration pass → `ssrFallback`
 *    (deterministic string, must equal what the server HTML contains).
 *  - After hydration → `window.location.origin` (the live runtime host,
 *    e.g. http://localhost:3001 when port 3000 is taken in dev).
 *
 * `useSyncExternalStore` performs the server→client swap internally with
 * a single post-hydration re-render, so there is NO hydration mismatch and
 * no "setState-in-effect" lint violation.
 */
export function useClientOrigin(ssrFallback: string): string {
  return useSyncExternalStore(
    emptySubscribe,
    () => window.location.origin,
    () => ssrFallback
  );
}