"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, LogIn, LogOut, Sparkles, X, AlertCircle } from "lucide-react";
import { useSession, signIn, signOut } from "next-auth/react";
import { useAuthStore } from "@/store/authStore";

interface NavbarProps {
  title?: string;
}

/* ── Sign-out confirmation modal ── */
function SignOutModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)" }}
        onClick={(e) => e.target === e.currentTarget && onCancel()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1,    y: 0 }}
          exit={{ opacity: 0, scale: 0.95,    y: 8 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          className="relative w-full max-w-sm rounded-2xl overflow-hidden"
          style={{
            background:   "linear-gradient(135deg,rgba(8,8,18,0.98),rgba(5,5,12,1))",
            border:       "1px solid rgba(255,255,255,0.1)",
            boxShadow:    "0 0 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,242,255,0.04)",
          }}
        >
          {/* Top accent line */}
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg,transparent,rgba(248,113,113,0.7),rgba(245,158,11,0.5),transparent)" }} />

          <div className="p-6 space-y-5">
            {/* Icon + heading */}
            <div className="flex flex-col items-center gap-3 text-center">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", boxShadow: "0 0 20px rgba(248,113,113,0.1)" }}
              >
                <AlertCircle size={24} className="text-red-400" />
              </div>
              <div>
                <p className="text-[16px] font-black text-[#e2e8f0]">Sign Out?</p>
                <p className="text-[12px] text-[#64748b] mt-1 leading-relaxed max-w-[260px]">
                  Are you sure you want to sign out from your{" "}
                  <span
                    style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 700 }}
                  >
                    CyberAgent
                  </span>{" "}
                  session?
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-[#94a3b8] hover:text-[#e2e8f0] transition-all hover:bg-white/[0.05]"
                style={{ border: "1px solid rgba(255,255,255,0.09)" }}
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all hover:opacity-90 active:scale-[0.97]"
                style={{
                  background: "linear-gradient(90deg,rgba(248,113,113,0.2),rgba(239,68,68,0.15))",
                  border:     "1px solid rgba(248,113,113,0.35)",
                  color:      "#f87171",
                  boxShadow:  "0 0 16px rgba(248,113,113,0.1)",
                }}
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Close X */}
          <button
            onClick={onCancel}
            className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-[#475569] hover:text-[#94a3b8] hover:bg-white/[0.06] transition-all"
          >
            <X size={13} />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function Navbar({ title }: NavbarProps) {
  const { data: session, status } = useSession();
  const { openPricing }           = useAuthStore();
  const [signOutConfirm, setSignOutConfirm] = useState(false);

  const isLoggedIn = status === "authenticated";
  const user       = session?.user;

  const initials = user?.name
    ? user.name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  const handleSignOut = () => signOut({ callbackUrl: "/auth" });

  return (
    <>
      {/* Keyframes injected once */}
      <style>{`
        @keyframes pro-pulse {
          0%,100% { box-shadow: 0 0 16px rgba(0,242,255,0.12); border-color: rgba(0,242,255,0.3); }
          50%      { box-shadow: 0 0 28px rgba(0,242,255,0.45), 0 0 50px rgba(168,85,247,0.2); border-color: rgba(0,242,255,0.6); }
        }
      `}</style>

      <header
        className="flex items-center justify-between px-4 sm:px-6 py-3 shrink-0"
        style={{
          background:     "rgba(6,6,12,0.9)",
          borderBottom:   "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(14px)",
          boxShadow:      "0 1px 0 rgba(0,242,255,0.04)",
        }}
      >
        {/* ── Left: page heading ── */}
        <div className="flex items-center min-w-0">
          <h1
            className="text-[15px] sm:text-[16px] font-black truncate max-w-[200px] sm:max-w-[320px] tracking-tight"
            style={{
              background:           "linear-gradient(90deg,#00f2ff,#a855f7)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor:  "transparent",
              filter:               "drop-shadow(0 0 8px rgba(0,242,255,0.3))",
            }}
          >
            {title ?? "CyberAgent Studio"}
          </h1>
        </div>

        {/* ── Right: controls ── */}
        <div className="flex items-center gap-2 sm:gap-3">

          {/* PRO badge — persistent neon pulse */}
          <button
            onClick={openPricing}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-widest transition-all hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(90deg,rgba(0,242,255,0.18),rgba(168,85,247,0.18))",
              border:     "1px solid rgba(0,242,255,0.3)",
              color:      "#00f2ff",
              animation:  "pro-pulse 2.5s ease-in-out infinite",
            }}
            title="View pricing plans"
          >
            <Sparkles size={10} />
            PRO
          </button>

          {/* Notification bell */}
          {isLoggedIn && (
            <button
              className="relative flex items-center justify-center w-8 h-8 rounded-lg text-[#64748b] hover:text-[#94a3b8] transition-colors"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <Bell size={15} />
              <span
                className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                style={{ background: "#00f2ff", boxShadow: "0 0 6px #00f2ff" }}
              />
            </button>
          )}

          {/* Auth area */}
          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              {/* Avatar */}
              {user?.image ? (
                <div
                  className="w-8 h-8 rounded-full overflow-hidden cursor-pointer hover:ring-2 hover:ring-[rgba(0,242,255,0.45)] transition-all"
                  title={user.email ?? ""}
                >
                  <Image src={user.image} alt={user.name ?? "Avatar"} width={32} height={32} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-full text-[12px] font-bold cursor-pointer select-none hover:ring-2 hover:ring-[rgba(0,242,255,0.4)] transition-all"
                  style={{ background: "linear-gradient(135deg,#00f2ff,#a855f7)", color: "#050505" }}
                  title={user?.email ?? ""}
                >
                  {initials}
                </div>
              )}

              {/* Sign out — opens confirmation modal */}
              <button
                onClick={() => setSignOutConfirm(true)}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-[#64748b] hover:text-[#f87171] transition-all hover:bg-red-400/[0.06]"
                title="Sign out"
              >
                <LogOut size={12} />
                <span className="hidden md:inline">Sign out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-[12px] sm:text-[13px] font-semibold transition-all active:scale-[0.97] hover:opacity-90"
              style={{ background: "linear-gradient(90deg,rgba(0,242,255,0.18),rgba(168,85,247,0.18))", border: "1px solid rgba(0,242,255,0.3)", color: "#00f2ff", boxShadow: "0 0 18px rgba(0,242,255,0.1)" }}
            >
              <LogIn size={13} />
              <span>Login / Register</span>
            </button>
          )}
        </div>
      </header>

      {/* Sign-out confirmation modal */}
      {signOutConfirm && (
        <SignOutModal
          onConfirm={handleSignOut}
          onCancel={() => setSignOutConfirm(false)}
        />
      )}
    </>
  );
}
