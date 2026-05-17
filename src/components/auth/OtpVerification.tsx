"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, CheckCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const OTP_LEN = 6;

type OtpStatus = "idle" | "error" | "success";

/* ── Per-status box styling ── */
const BOX_STYLES: Record<OtpStatus, React.CSSProperties> = {
  idle: {
    background: "rgba(255,255,255,0.04)",
    border:     "1.5px solid rgba(255,255,255,0.1)",
    color:      "#00f2ff",
  },
  error: {
    background: "rgba(239,68,68,0.07)",
    border:     "1.5px solid rgba(239,68,68,0.5)",
    color:      "#f87171",
    boxShadow:  "0 0 16px rgba(239,68,68,0.15)",
  },
  success: {
    background: "rgba(0,255,148,0.07)",
    border:     "1.5px solid rgba(0,255,148,0.5)",
    color:      "#00ff94",
    boxShadow:  "0 0 16px rgba(0,255,148,0.15)",
  },
};

const FOCUS_SHADOW: Record<OtpStatus, string> = {
  idle:    "0 0 0 3px rgba(0,242,255,0.12), 0 0 18px rgba(0,242,255,0.18)",
  error:   "0 0 0 3px rgba(239,68,68,0.15)",
  success: "0 0 0 3px rgba(0,255,148,0.15)",
};

/* ═══════════════════════════════════════════
   6-box OTP input
═══════════════════════════════════════════ */
function OtpBoxes({
  value, onChange, status, disabled,
}: {
  value:    string[];
  onChange: (v: string[]) => void;
  status:   OtpStatus;
  disabled: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  /* Focus first empty box on mount */
  useEffect(() => {
    const first = value.findIndex((d) => !d);
    refs.current[first === -1 ? OTP_LEN - 1 : first]?.focus();
  }, []);  // eslint-disable-line

  const focus = (i: number) => refs.current[Math.max(0, Math.min(OTP_LEN - 1, i))]?.focus();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, i: number) => {
    const digit = e.target.value.replace(/\D/g, "").slice(-1);
    const next  = [...value];
    next[i]     = digit;
    onChange(next);
    if (digit && i < OTP_LEN - 1) focus(i + 1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, i: number) => {
    if (e.key === "Backspace") {
      if (value[i]) {
        const next = [...value]; next[i] = ""; onChange(next);
      } else if (i > 0) {
        focus(i - 1);
      }
    } else if (e.key === "ArrowLeft")  { focus(i - 1); }
    else if (e.key === "ArrowRight") { focus(i + 1); }
  };

  const handlePaste = (e: React.ClipboardEvent, i: number) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LEN);
    if (!digits) return;
    const next = [...value];
    digits.split("").forEach((d, j) => { if (i + j < OTP_LEN) next[i + j] = d; });
    onChange(next);
    focus(Math.min(i + digits.length, OTP_LEN - 1));
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {Array.from({ length: OTP_LEN }).map((_, i) => {
        const isFilled = !!value[i];
        return (
          <input
            key={i}
            ref={(el) => { refs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={value[i] ?? ""}
            disabled={disabled && status !== "error"}
            onChange={(e) => handleChange(e, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onPaste={(e) => handlePaste(e, i)}
            className={cn(
              "w-11 h-14 sm:w-14 sm:h-16 text-center text-[22px] sm:text-[26px]",
              "font-black rounded-2xl outline-none transition-all duration-150",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
            style={{
              ...BOX_STYLES[isFilled && status === "idle" ? "idle" : status],
              border: isFilled && status === "idle"
                ? "1.5px solid rgba(0,242,255,0.45)"
                : BOX_STYLES[status].border,
              background: isFilled && status === "idle"
                ? "rgba(0,242,255,0.09)"
                : BOX_STYLES[status].background,
              boxShadow: isFilled && status === "idle"
                ? "0 0 16px rgba(0,242,255,0.18)"
                : BOX_STYLES[status].boxShadow,
              caretColor: "#00f2ff",
              fontFamily: "var(--font-urbanist, var(--font-sans))",
            }}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow = FOCUS_SHADOW[status];
              e.currentTarget.style.border    = "1.5px solid rgba(0,242,255,0.6)";
            }}
            onBlur={(e) => {
              const filled = !!value[i];
              e.currentTarget.style.boxShadow = filled && status === "idle"
                ? "0 0 16px rgba(0,242,255,0.18)" : (BOX_STYLES[status].boxShadow ?? "none");
              e.currentTarget.style.border    = filled && status === "idle"
                ? "1.5px solid rgba(0,242,255,0.45)" : (BOX_STYLES[status].border as string);
            }}
          />
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Main component
═══════════════════════════════════════════ */
interface Props {
  email:     string;
  onVerify:  (otp: string) => void;
  onResend:  () => void;
  onBack:    () => void;
  loading:   boolean;
  error:     string;
  status:    OtpStatus;
  resendTimer: number;
  canResend:   boolean;
}

export function OtpVerification({
  email, onVerify, onResend, onBack,
  loading, error, status, resendTimer, canResend,
}: Props) {
  const [otp, setOtp] = useState<string[]>(Array(OTP_LEN).fill(""));

  /* Reset boxes when status changes back to idle (e.g. after resend) */
  useEffect(() => {
    if (status === "idle" && error === "") setOtp(Array(OTP_LEN).fill(""));
  }, [status, error]);

  const handleVerify = useCallback(() => {
    const code = otp.join("");
    if (code.length === OTP_LEN) onVerify(code);
  }, [otp, onVerify]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleVerify();
  };

  const mm = String(Math.floor(resendTimer / 60)).padStart(2, "0");
  const ss = String(resendTimer % 60).padStart(2, "0");
  const allFilled = otp.every(Boolean);

  /* Derive button state */
  const btnColor =
    status === "success" ? "#00ff94"
    : status === "error"   ? "#f87171"
    : "#00f2ff";

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
          style={{
            background: status === "error"
              ? "linear-gradient(90deg,transparent,rgba(239,68,68,0.7) 50%,transparent)"
              : status === "success"
              ? "linear-gradient(90deg,transparent,rgba(0,255,148,0.7) 50%,transparent)"
              : "linear-gradient(90deg,transparent,rgba(0,242,255,0.7) 40%,rgba(168,85,247,0.7) 60%,transparent)",
          }}
        />

        {/* Back button */}
        <button
          onClick={onBack}
          disabled={loading}
          className="absolute top-5 left-6 flex items-center gap-1.5 text-[12px] font-medium text-[#475569] hover:text-[#94a3b8] transition-colors disabled:opacity-40 group"
        >
          <ArrowLeft size={13} className="transition-transform group-hover:-translate-x-0.5" />
          Back
        </button>

        {/* Header */}
        <div className="text-center mb-7 mt-2">
          {/* Animated envelope icon */}
          <motion.div
            animate={{ y: [-3, 3, -3] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{
              background:
                status === "success"
                  ? "rgba(0,255,148,0.12)"
                  : status === "error"
                  ? "rgba(239,68,68,0.12)"
                  : "linear-gradient(135deg,rgba(0,242,255,0.15),rgba(168,85,247,0.15))",
              border:
                status === "success"
                  ? "1px solid rgba(0,255,148,0.3)"
                  : status === "error"
                  ? "1px solid rgba(239,68,68,0.3)"
                  : "1px solid rgba(0,242,255,0.25)",
              boxShadow:
                status === "success"
                  ? "0 0 28px rgba(0,255,148,0.2)"
                  : status === "error"
                  ? "0 0 28px rgba(239,68,68,0.2)"
                  : "0 0 28px rgba(0,242,255,0.15)",
            }}
          >
            {status === "success" ? (
              <CheckCircle size={26} className="text-[#00ff94]" />
            ) : (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="4" width="20" height="16" rx="3" stroke={btnColor} strokeWidth="1.5" strokeOpacity="0.8" fill="none"/>
                <path d="M2 7l10 7 10-7" stroke={btnColor} strokeWidth="1.5" strokeOpacity="0.8" strokeLinecap="round"/>
              </svg>
            )}
          </motion.div>

          <h2 className="text-[24px] font-black tracking-tight text-[#f1f5f9]">
            {status === "success" ? "Verified!" : "Check your inbox"}
          </h2>
          <p className="text-[13px] text-[#475569] mt-1.5 font-medium leading-relaxed">
            {status === "success"
              ? "Redirecting to your dashboard…"
              : <>We sent a 6-digit code to <span className="text-[#00f2ff]">{email}</span></>
            }
          </p>
        </div>

        {/* OTP boxes */}
        <div className="space-y-4" onKeyDown={handleKey}>
          <OtpBoxes
            value={otp}
            onChange={setOtp}
            status={status}
            disabled={loading || status === "success"}
          />

          {/* Status messages */}
          <div className="min-h-[20px] text-center">
            {status === "error" && error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[12px] font-semibold text-red-400"
              >
                {error}
              </motion.p>
            )}
            {status === "success" && (
              <motion.p
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-[12px] font-semibold text-[#00ff94]"
              >
                ✓ Code verified — signing you in
              </motion.p>
            )}
          </div>
        </div>

        {/* Verify button */}
        <button
          onClick={handleVerify}
          disabled={!allFilled || loading || status === "success"}
          className={cn(
            "mt-5 w-full flex items-center justify-center gap-2.5 py-3.5 rounded-2xl",
            "text-[14px] font-bold tracking-wide transition-all duration-200",
            "active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          )}
          style={{
            background:
              status === "success"
                ? "linear-gradient(135deg,#00ff94,#00e070)"
                : status === "error"
                ? "linear-gradient(135deg,#ef4444,#dc2626)"
                : "linear-gradient(135deg,#00f2ff,#a855f7)",
            color:     status === "success" ? "#000" : status === "error" ? "#fff" : "#000",
            boxShadow: !allFilled || loading ? "none" :
              status === "success" ? "0 0 28px rgba(0,255,148,0.4)" :
              status === "error"   ? "0 0 28px rgba(239,68,68,0.35)" :
              "0 0 28px rgba(0,242,255,0.3)",
          }}
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : status === "success" ? (
            <><CheckCircle size={16} />Signed In</>
          ) : (
            "Verify & Sign In"
          )}
        </button>

        {/* Resend countdown */}
        <div className="mt-4 flex items-center justify-center gap-2 text-[13px]">
          {canResend ? (
            <>
              <span className="text-[#475569] font-medium">Didn&apos;t get it?</span>
              <button
                onClick={onResend}
                disabled={loading}
                className="flex items-center gap-1.5 font-bold text-[#00f2ff] hover:text-[#00d4e0] transition-colors disabled:opacity-40"
              >
                <RefreshCw size={12} />
                Resend code
              </button>
            </>
          ) : (
            <span className="text-[#334155] font-medium tabular-nums">
              Resend in{" "}
              <span className="text-[#475569] font-bold">{mm}:{ss}</span>
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
