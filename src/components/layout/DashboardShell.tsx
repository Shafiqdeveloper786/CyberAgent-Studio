"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Zap } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import { AuthModal } from "@/components/auth/AuthModal";
import { PricingModal } from "@/components/pricing/PricingModal";

interface DashboardShellProps {
  children: React.ReactNode;
  title?: string;
}

export function DashboardShell({ children, title }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Global modals — rendered above everything */}
      <AuthModal />
      <PricingModal />

      <div className="flex h-screen overflow-hidden">
        {/* ── Desktop sidebar ── */}
        <div className="hidden md:flex h-full shrink-0">
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
              {/* Backdrop */}
              <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setMobileOpen(false)}
              />

              {/* Slide-in panel */}
              <motion.div
                initial={{ x: -240 }}
                animate={{ x: 0 }}
                exit={{ x: -240 }}
                transition={{ type: "spring", stiffness: 320, damping: 32 }}
                className="relative z-10 h-full flex"
              >
                <Sidebar />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main content ── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Mobile topbar */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0 md:hidden"
            style={{
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              background:   "rgba(8,8,12,0.97)",
            }}
          >
            <div className="flex items-center gap-3">
              {/* Animated hamburger */}
              <button
                onClick={() => setMobileOpen((v) => !v)}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-[#64748b] hover:text-[#94a3b8] transition-all hover:bg-white/[0.05]"
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
                      <X size={18} />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="menu"
                      initial={{ rotate: 90,  opacity: 0 }}
                      animate={{ rotate: 0,   opacity: 1 }}
                      exit={{   rotate: -90,  opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Menu size={18} />
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              {/* Brand */}
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center justify-center w-6 h-6 rounded-md"
                  style={{
                    background: "linear-gradient(135deg, rgba(0,242,255,0.2), rgba(168,85,247,0.2))",
                    border:     "1px solid rgba(0,242,255,0.25)",
                  }}
                >
                  <Zap size={12} className="text-[#00f2ff]" />
                </div>
                <span className="text-[13px] font-semibold text-[#e2e8f0]">
                  CyberAgent Studio
                </span>
              </div>
            </div>
          </div>

          {/* Desktop navbar */}
          <Navbar title={title} />

          {/* Page content */}
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </div>
    </>
  );
}
