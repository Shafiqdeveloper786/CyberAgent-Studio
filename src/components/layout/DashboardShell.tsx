"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from 'next/image';
import { Menu, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { AuthModal } from "@/components/auth/AuthModal";
import { PricingModal } from "@/components/pricing/PricingModal";
import { useAuthStore } from "@/store/authStore";

interface DashboardShellProps {
  children: React.ReactNode;
  title?: string;
}

export function DashboardShell({ children, title }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session, status } = useSession();
  const { login, logout, openAuthModal, isLoggedIn: localLoggedIn } = useAuthStore();

  /* ── Sync NextAuth session → local auth store ── */
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const u = session.user;
      login({
        email: u.email ?? "",
        name: u.name ?? "",
        initials: u.name
          ? u.name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
          : "U",
      });
    } else if (status === "unauthenticated") {
      logout();
    }
  }, [status, session, login, logout]);

  /* ── Auto-open login modal when user signs out ── */
  useEffect(() => {
    if (status === "unauthenticated") {
      // Small delay so the DashboardShell has time to mount/redirect first
      const timer = setTimeout(() => openAuthModal("LOGIN"), 300);
      return () => clearTimeout(timer);
    }
  }, [status, openAuthModal]);

  /* ── Source of truth for blur: NextAuth session status or local store login ── */
  const isAuthenticated = status === "authenticated" || localLoggedIn;

  return (
    <>
      {/* Global modals */}
      <AuthModal />
      <PricingModal />

      {/* Clean white/light layout container */}
      <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans selection:bg-blue-500/20 selection:text-blue-900">
        
        {/* ── Desktop sidebar ── */}
        <div className="hidden md:flex h-full shrink-0 border-r border-slate-200 bg-white">
          <Sidebar />
        </div>

        {/* ── Mobile sidebar overlay ── */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              key="mobile-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex md:hidden"
            >
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setMobileOpen(false)}
              />
              <motion.div
                initial={{ x: -260 }}
                animate={{ x: 0 }}
                exit={{ x: -260 }}
                transition={{ type: "spring", stiffness: 350, damping: 35 }}
                className="relative z-10 h-full flex w-[260px] border-r border-slate-200 bg-white"
              >
                <Sidebar />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main content area (blurred+locked when unauthenticated) ── */}
        <div
          className={`flex flex-col flex-1 min-w-0 overflow-hidden relative z-10 transition-all duration-300 ${
            !isAuthenticated ? "blur-sm pointer-events-none select-none" : ""
          }`}
        >
          
          {/* Mobile topbar */}
          <div className="flex items-center justify-between px-5 py-3.5 shrink-0 md:hidden border-b border-slate-200 bg-white">
            <div className="flex items-center gap-3.5">
              <button
                onClick={() => setMobileOpen((v) => !v)}
                className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-blue-600 transition-all bg-white border border-slate-200 active:scale-95"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
              >
                <AnimatePresence mode="wait" initial={false}>
                  {mobileOpen ? (
                    <motion.span
                      key="close"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0,   opacity: 1 }}
                      exit={{   rotate: 90,   opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <X size={16} />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="menu"
                      initial={{ rotate: 90,  opacity: 0 }}
                      animate={{ rotate: 0,   opacity: 1 }}
                      exit={{   rotate: -90,  opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Menu size={16} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              <Image
                src="/logo.png"
                alt="CyberAgent Studio"
                width={140}
                height={40}
                className="object-contain"
                style={{ height: '36px', width: 'auto' }}
                quality={100}
                priority
              />
            </div>
          </div>

          {/* Desktop navbar */}
          <div className="bg-white border-b border-slate-100">
            <Navbar title={title} />
          </div>

          {/* Page content main container with Suspense for skeleton */}
          <main className="flex-1 overflow-auto bg-slate-50/50 relative">
            <Suspense fallback={<ContentSkeleton />}>
              {children}
            </Suspense>
          </main>
        </div>
      </div>
    </>
  );
}

/* ── Content loading skeleton (mirrors dashboard layout) ── */
function ContentSkeleton() {
  return (
    <div className="flex flex-col h-full w-full bg-slate-50">
      {/* Skeleton header bar */}
      <div className="shrink-0 px-6 py-4 border-b border-slate-100 bg-white">
        <div className="flex items-center justify-between">
          <div className="h-5 w-48 rounded-lg bg-slate-200 animate-pulse" />
          <div className="h-8 w-24 rounded-xl bg-slate-200 animate-pulse" />
        </div>
      </div>

      {/* Skeleton filter bar */}
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-24 rounded-xl bg-slate-200 animate-pulse" />
          <div className="h-9 w-24 rounded-xl bg-slate-200 animate-pulse" />
          <div className="h-9 w-24 rounded-xl bg-slate-200 animate-pulse" />
          <div className="h-9 w-48 rounded-xl bg-slate-200 animate-pulse ml-auto" />
        </div>

        {/* Skeleton cards grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="h-4 flex-1 rounded-lg bg-slate-200 animate-pulse" />
                  <div className="h-5 w-20 rounded-lg bg-slate-200 animate-pulse" />
                </div>
                <div className="h-3 w-3/4 rounded bg-slate-100 animate-pulse mb-2" />
                <div className="h-3 w-1/2 rounded bg-slate-100 animate-pulse" />
              </div>
            ))}
          </div>
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-slate-100 bg-white h-full min-h-[400px] flex items-center justify-center shadow-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-200 animate-pulse" />
                <div className="h-4 w-48 rounded-lg bg-slate-200 animate-pulse" />
                <div className="h-3 w-64 rounded bg-slate-100 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
