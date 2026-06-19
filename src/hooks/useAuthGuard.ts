"use client";

import { useCallback } from "react";
import { useAuthStore } from "@/store/authStore";

/**
 * useAuthGuard — "Gatekeeper" hook for the dashboard.
 *
 * Wrap any protected action (agent creation, settings, etc.) with this hook.
 * If the user is not authenticated, it opens the LOGIN modal instead of
 * executing the action.
 *
 * @example
 * ```tsx
 * const withGuard = useAuthGuard();
 *
 * <button onClick={withGuard(() => createAgent())}>
 *   Create Agent
 * </button>
 * ```
 */
export function useAuthGuard() {
  const { isLoggedIn, openAuthModal } = useAuthStore();

  const withGuard = useCallback(
    <T extends (...args: unknown[]) => unknown>(action: T) =>
      (...args: Parameters<T>) => {
        if (!isLoggedIn) {
          openAuthModal("LOGIN");
          return;
        }
        return action(...args);
      },
    [isLoggedIn, openAuthModal],
  );

  return withGuard;
}