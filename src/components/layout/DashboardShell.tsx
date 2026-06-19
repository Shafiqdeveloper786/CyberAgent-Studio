"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Zap } from "lucide-react";
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

  /* ── Source of truth for blur: NextAuth session status ── */
  const isAuthenticated = status === "authenticated";

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

              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30">
                  <Zap size={11} className="text-blue-600" />
                </div>
                <span className="text-[13px] font-bold uppercase tracking-wider text-slate-800">
                  CyberAgent Studio
                </span>
              </div>
            </div>
          </div>

          {/* Desktop navbar */}
          <div className="bg-white border-b border-slate-100">
            <Navbar title={title} />
          </div>

          {/* Page content main container */}
          <main className="flex-1 overflow-auto bg-slate-50/50 relative">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
