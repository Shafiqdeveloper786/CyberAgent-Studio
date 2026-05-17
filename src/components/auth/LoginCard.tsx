"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, ArrowRight, Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Google icon ── */
function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908C16.658 14.083 17.64 11.775 17.64 9.2z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 6.294C4.672 4.167 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

interface Props {
  email:          string;
  onEmailChange:  (v: string) => void;
  onSendOtp:      () => void;
  onGoogleLogin:  () => void;
  loading:        boolean;
  error:          string;
  onBackToHome:   () => void;
}

export function LoginCard({
  email, onEmailChange, onSendOtp, onGoogleLogin, loading, error, onBackToHome,
}: Props) {
  const [emailFocused, setEmailFocused] = useState(false);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") onSendOtp();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="relative w-full"
      style={{ fontFamily: "var(--font-urbanist, var(--font-sans))" }}
    >
      {/* Glassmorphism card */}
      <div
        className="relative rounded-3xl overflow-hidden px-8 pt-8 pb-9 sm:px-10"
        style={{
          background:     "rgba(4, 4, 14, 0.82)",
          backdropFilter: "blur(28px) saturate(160%)",
          border:         "1px solid rgba(255,255,255,0.075)",
          boxShadow:
            "0 0 0 1px rgba(0,242,255,0.04), 0 0 80px rgba(0,242,255,0.07), 0 32px 80px rgba(0,0,0,0.75)",
        }}
      >
        {/* Top gradient line */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg,transparent,rgba(0,242,255,0.7) 40%,rgba(168,85,247,0.7) 60%,transparent)" }}
        />

        {/* Back to home */}
        <button
          onClick={onBackToHome}
          className="absolute top-5 left-6 flex items-center gap-1.5 text-[12px] font-medium text-[#475569] hover:text-[#94a3b8] transition-colors group"
        >
          <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
          Home
        </button>

        {/* Brand */}
        <div className="flex flex-col items-center gap-3 mb-7 mt-2">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{
              background:  "linear-gradient(135deg,rgba(0,242,255,0.2),rgba(168,85,247,0.2))",
              border:      "1px solid rgba(0,242,255,0.3)",
              boxShadow:   "0 0 28px rgba(0,242,255,0.2), inset 0 1px 0 rgba(0,242,255,0.15)",
            }}
          >
            <Zap size={22} className="text-[#00f2ff]" />
          </div>
          <div className="text-center">
            <h1 className="text-[26px] font-black tracking-tight text-[#f1f5f9]">
              CyberAgent Studio
            </h1>
            <p className="text-[13px] text-[#475569] mt-0.5 font-medium">
              Sign in or create your account
            </p>
          </div>
        </div>

        {/* Google button */}
        <button
          onClick={onGoogleLogin}
          disabled={loading}
          className={cn(
            "group w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl",
            "text-[14px] font-semibold text-[#e2e8f0] transition-all duration-200",
            "active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed",
            "hover:bg-white/[0.08] hover:border-white/20",
            "hover:shadow-[0_0_24px_rgba(255,255,255,0.07)]"
          )}
          style={{
            background: "rgba(255,255,255,0.05)",
            border:     "1px solid rgba(255,255,255,0.11)",
          }}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
          <span className="text-[11px] font-semibold text-[#334155] uppercase tracking-[0.12em]">
            or email
          </span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.07)" }} />
        </div>

        {/* Email input */}
        <div className="space-y-2">
          <div
            className="relative rounded-2xl transition-all duration-200"
            style={{
              border:     emailFocused ? "1px solid rgba(0,242,255,0.5)" : "1px solid rgba(255,255,255,0.1)",
              boxShadow:  emailFocused
                ? "0 0 0 3px rgba(0,242,255,0.09), inset 0 0 12px rgba(0,242,255,0.04)"
                : "none",
            }}
          >
            <Mail
              size={15}
              className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200"
              style={{ color: emailFocused ? "#00f2ff" : "#334155" }}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              onKeyDown={handleKey}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              placeholder="your@email.com"
              className="w-full pl-11 pr-4 py-3.5 bg-transparent rounded-2xl text-[14px] text-[#e2e8f0] outline-none placeholder:text-[#2d3748] font-medium"
            />
          </div>

          {/* Error */}
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-[12px] text-red-400 pl-1"
            >
              {error}
            </motion.p>
          )}
        </div>

        {/* Send code button */}
        <button
          onClick={onSendOtp}
          disabled={loading || !email.trim()}
          className={cn(
            "mt-4 w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl",
            "text-[14px] font-bold tracking-wide text-black transition-all duration-200",
            "active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed",
            "hover:shadow-[0_0_36px_rgba(0,242,255,0.35)]"
          )}
          style={{
            background: "linear-gradient(135deg, #00f2ff 0%, #a855f7 100%)",
            boxShadow:  loading ? "none" : "0 0 22px rgba(0,242,255,0.25)",
          }}
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin text-black" />
          ) : (
            <><ArrowRight size={15} />Send Verification Code</>
          )}
        </button>

        {/* Footer */}
        <p className="mt-5 text-center text-[11px] text-[#1e293b] font-medium">
          By continuing you agree to our{" "}
          <span className="text-[#334155] hover:text-[#64748b] cursor-pointer transition-colors">
            Terms of Service
          </span>
        </p>
      </div>
    </motion.div>
  );
}
