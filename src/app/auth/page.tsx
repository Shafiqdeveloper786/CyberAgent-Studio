"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useAuthStore } from "@/store/authStore";

/**
 * Standalone /auth is deprecated.
 *
 * Instead of a blank standalone page, this route immediately renders the
 * full DashboardShell with the LOGIN modal open on top. The dashboard
 * remains visible in the background (blurred) — no black screen ever.
 */
export default function AuthPage() {
  const { openAuthModal } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    openAuthModal("LOGIN");
    // Mark ready after a tick so the modal is visible immediately
    setReady(true);
  }, [openAuthModal]);

  /* ── Always render the DashboardShell — never return null ── */
  return <DashboardShell title="Sign In">{null}</DashboardShell>;
}