"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, ArrowRight, Zap, RefreshCw, CheckCircle } from "lucide-react";
import { signIn } from "next-auth/react";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

/* ── Types ── */
type ModalStep = "email" | "otp" | "success";
const OTP_LENGTH   = 6;
const RESEND_WAIT  = 60; // seconds

/* ── Google icon ── */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908C16.658 14.083 17.64 11.775 17.64 9.2z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853" />
      <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 6.294C4.672 4.167 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

/* ── 6-digit OTP input ── */
function OtpInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === "Backspace") {
      if (value[idx]) {
        const n = [...value]; n[idx] = ""; onChange(n);
      } else if (idx > 0) {
        refs.current[idx - 1]?.focus();
      }
    }
  };

  const onChange_ = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const d = e.target.value.replace(/\D/g, "").slice(-1);
    const n = [...value]; n[idx] = d; onChange(n);
    if (d && idx < OTP_LENGTH - 1) refs.current[idx + 1]?.focus();
  };

  const onPaste = (e: React.ClipboardEvent, idx: number) => {
    e.preventDefault();
    const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!digits) return;
    const n = [...value];
    digits.split("").forEach((d, i) => { if (idx + i < OTP_LENGTH) n[idx + i] = d; });
    onChange(n);
    refs.current[Math.min(idx + digits.length - 1, OTP_LENGTH - 1)]?.focus();
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {Array.from({ length: OTP_LENGTH }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => onChange_(e, i)}
          onKeyDown={(e) => onKey(e, i)}
          onPaste={(e) => onPaste(e, i)}
          className={cn(
            "w-10 h-12 sm:w-12 sm:h-14 text-center text-lg font-bold rounded-lg outline-none transition-all duration-150",
            value[i]
              ? "text-[#00f2ff] ring-1 ring-[rgba(0,242,255,0.6)]"
              : "text-[#94a3b8] focus:ring-1 focus:ring-[rgba(0,242,255,0.4)]"
          )}
          style={{
            background: value[i] ? "rgba(0,242,255,0.08)" : "rgba(255,255,255,0.04)",
            border:     value[i] ? "1px solid rgba(0,242,255,0.35)" : "1px solid rgba(255,255,255,0.1)",
            caretColor: "#00f2ff",
          }}
        />
      ))}
    </div>
  );
}

/* ── Animation variants ── */
const backdropV = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } };
const modalV = {
  hidden:  { opacity: 0, scale: 0.88, y: 24 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 340, damping: 28 } },
  exit:    { opacity: 0, scale: 0.92, y: 16, transition: { duration: 0.18 } },
};
const stepV = {
  enter:  (d: number) => ({ opacity: 0, x: d > 0 ? 40 : -40 }),
  center: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 300, damping: 28 } },
  exit:   (d: number) => ({ opacity: 0, x: d > 0 ? -40 : 40, transition: { duration: 0.15 } }),
};

/* ── Component ── */
export function AuthModal() {
  const { modalOpen, closeModal } = useAuthStore();
  const router = useRouter();

  const [step,        setStep]       = useState<ModalStep>("email");
  const [direction,   setDirection]  = useState(1);
  const [email,       setEmail]      = useState("");
  const [emailError,  setEmailError] = useState("");
  const [otp,         setOtp]        = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [otpError,    setOtpError]   = useState("");
  const [loading,      setLoading]     = useState(false);
  const [resendTimer,  setResendTimer]  = useState(0);
  const [emailDetail,  setEmailDetail]  = useState("");
  const [otpDetail,    setOtpDetail]    = useState("");

  /* Reset on open */
  useEffect(() => {
    if (modalOpen) {
      setStep("email"); setDirection(1);
      setEmail(""); setEmailError(""); setEmailDetail("");
      setOtp(Array(OTP_LENGTH).fill("")); setOtpError(""); setOtpDetail("");
      setLoading(false); setResendTimer(0);
    }
  }, [modalOpen]);

  /* Escape to close */
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [closeModal]);

  /* Resend countdown */
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [resendTimer]);

  const validateEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  /* ── Send OTP ── */
  const handleSendOtp = useCallback(async () => {
    if (!validateEmail(email)) { setEmailError("Please enter a valid email address."); return; }
    setEmailError(""); setLoading(true);
    try {
      const res  = await fetch("/api/auth/send-otp", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailError(data.error ?? "Failed to send code. Please try again.");
        setEmailDetail(data.detail ? String(data.detail).split("\n")[0] : "");
        return;
      }
      setEmailDetail("");
      setDirection(1);
      setStep("otp");
      setResendTimer(RESEND_WAIT);
    } catch {
      setEmailError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [email]);

  /* ── Verify OTP → sign in ── */
  const handleVerify = useCallback(async () => {
    const code = otp.join("");
    if (code.length < OTP_LENGTH) { setOtpError("Please enter all 6 digits."); return; }
    setOtpError(""); setLoading(true);
    try {
      const result = await signIn("otp", { email, token: code, redirect: false });
      if (result?.error || !result?.ok) {
        setOtpError("Invalid or expired code. Please try again.");
        return;
      }
      setStep("success");
      setTimeout(() => { router.push("/dashboard"); router.refresh(); closeModal(); }, 1400);
    } catch {
      setOtpError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [otp, email, router, closeModal]);

  /* ── Resend OTP ── */
  const handleResend = useCallback(async () => {
    if (resendTimer > 0 || loading) return;
    setOtp(Array(OTP_LENGTH).fill("")); setOtpError(""); setLoading(true);
    try {
      const res  = await fetch("/api/auth/send-otp", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error ?? "Could not resend code.");
        setOtpDetail(data.detail ? String(data.detail).split("\n")[0] : "");
        return;
      }
      setOtpDetail("");
      setResendTimer(RESEND_WAIT);
    } catch {
      setOtpError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [resendTimer, loading, email]);

  return (
    <AnimatePresence>
      {modalOpen && (
        <motion.div
          key="backdrop"
          variants={backdropV}
          initial="hidden" animate="visible" exit="exit"
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onClick={(e) => e.target === e.currentTarget && closeModal()}
        >
          <motion.div
            key="modal"
            variants={modalV}
            initial="hidden" animate="visible" exit="exit"
            className="relative w-full max-w-md rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(145deg, rgba(10,10,18,0.98), rgba(5,5,12,0.99))",
              border:     "1px solid rgba(0,242,255,0.18)",
              boxShadow:  "0 0 0 1px rgba(0,242,255,0.06), 0 0 60px rgba(0,242,255,0.08), 0 32px 80px rgba(0,0,0,0.7)",
            }}
          >
            {/* Grid texture */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
              style={{ backgroundImage: "linear-gradient(rgba(0,242,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,242,255,1) 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

            {/* Top glow bar */}
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent, rgba(0,242,255,0.6), rgba(168,85,247,0.6), transparent)" }} />

            {/* Close */}
            <button onClick={closeModal}
              className="absolute top-4 right-4 z-10 flex items-center justify-center w-8 h-8 rounded-lg text-[#64748b] hover:text-[#94a3b8] transition-all hover:bg-white/[0.06]"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              <X size={15} />
            </button>

            {/* Header */}
            <div className="px-8 pt-8 pb-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-4"
                style={{ background: "linear-gradient(135deg, rgba(0,242,255,0.15), rgba(168,85,247,0.15))", border: "1px solid rgba(0,242,255,0.25)", boxShadow: "0 0 24px rgba(0,242,255,0.12)" }}>
                <Zap size={22} className="text-[#00f2ff]" />
              </div>
              <h2 className="text-[20px] font-bold text-[#e2e8f0] tracking-tight">
                {step === "success" ? "Welcome aboard!" : "CyberAgent Studio"}
              </h2>
              <p className="text-[13px] text-[#64748b] mt-1.5">
                {step === "email"   && "Sign in or create an account to get started."}
                {step === "otp"     && <>Code sent to <span className="text-[#00f2ff]">{email}</span></>}
                {step === "success" && "Redirecting to your dashboard…"}
              </p>
            </div>

            {/* Step content */}
            <div className="relative overflow-hidden px-8 pb-8" style={{ minHeight: 260 }}>
              <AnimatePresence mode="wait" custom={direction}>

                {/* ── EMAIL STEP ── */}
                {step === "email" && (
                  <motion.div key="email" custom={direction} variants={stepV} initial="enter" animate="center" exit="exit" className="space-y-4">

                    {/* Google */}
                    <button
                      onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-[14px] font-semibold text-[#e2e8f0] transition-all hover:bg-white/[0.07] active:scale-[0.98] disabled:opacity-60"
                      style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)" }}
                    >
                      <GoogleIcon /> Continue with Google
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-white/[0.07]" />
                      <span className="text-[11px] text-[#334155] uppercase tracking-widest">or email</span>
                      <div className="flex-1 h-px bg-white/[0.07]" />
                    </div>

                    {/* Email field */}
                    <div className="space-y-1.5">
                      <div className="relative">
                        <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#334155]" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                          onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                          placeholder="Enter your email address"
                          className="w-full pl-9 pr-4 py-3 rounded-xl text-[13px] text-[#e2e8f0] outline-none transition-all placeholder:text-[#334155] focus:ring-1 focus:ring-[rgba(0,242,255,0.4)]"
                          style={{ background: "rgba(255,255,255,0.04)", border: emailError ? "1px solid rgba(239,68,68,0.5)" : "1px solid rgba(255,255,255,0.09)" }}
                        />
                      </div>
                      {emailError && (
                        <div className="pl-1 space-y-0.5">
                          <p className="text-[11px] text-red-400">{emailError}</p>
                          {emailDetail && <p className="text-[10px] text-[#475569] font-mono leading-snug">{emailDetail}</p>}
                        </div>
                      )}
                    </div>

                    {/* Send OTP */}
                    <button
                      onClick={handleSendOtp}
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-bold tracking-wide transition-all active:scale-[0.98] disabled:opacity-70"
                      style={{
                        background: loading ? "rgba(0,242,255,0.12)" : "linear-gradient(90deg, rgba(0,242,255,0.2), rgba(168,85,247,0.2))",
                        border:     "1px solid rgba(0,242,255,0.3)",
                        color:      "#00f2ff",
                        boxShadow:  loading ? "none" : "0 0 24px rgba(0,242,255,0.12)",
                      }}
                    >
                      {loading ? <RefreshCw size={15} className="animate-spin" /> : <><ArrowRight size={15} />Send Code</>}
                    </button>

                    <p className="text-center text-[11px] text-[#334155]">
                      By continuing you agree to our{" "}
                      <span className="text-[#64748b] hover:text-[#94a3b8] cursor-pointer transition-colors">Terms of Service</span>
                    </p>
                  </motion.div>
                )}

                {/* ── OTP STEP ── */}
                {step === "otp" && (
                  <motion.div key="otp" custom={direction} variants={stepV} initial="enter" animate="center" exit="exit" className="space-y-6">

                    <OtpInput value={otp} onChange={setOtp} />

                    {otpError && (
                      <div className="text-center space-y-0.5">
                        <p className="text-[11px] text-red-400">{otpError}</p>
                        {otpDetail && <p className="text-[10px] text-[#475569] font-mono leading-snug">{otpDetail}</p>}
                      </div>
                    )}

                    {/* Verify */}
                    <button
                      onClick={handleVerify}
                      disabled={loading || otp.join("").length < OTP_LENGTH}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-bold tracking-wide transition-all active:scale-[0.98] disabled:opacity-50"
                      style={{
                        background: otp.join("").length === OTP_LENGTH
                          ? "linear-gradient(90deg, rgba(0,242,255,0.25), rgba(168,85,247,0.25))"
                          : "rgba(255,255,255,0.04)",
                        border: otp.join("").length === OTP_LENGTH
                          ? "1px solid rgba(0,242,255,0.35)"
                          : "1px solid rgba(255,255,255,0.08)",
                        color:     otp.join("").length === OTP_LENGTH ? "#00f2ff" : "#334155",
                        boxShadow: otp.join("").length === OTP_LENGTH ? "0 0 20px rgba(0,242,255,0.1)" : "none",
                      }}
                    >
                      {loading ? <RefreshCw size={15} className="animate-spin" /> : "Verify & Sign In"}
                    </button>

                    {/* Controls */}
                    <div className="flex items-center justify-between text-[12px]">
                      <button
                        onClick={() => { setDirection(-1); setStep("email"); setOtp(Array(OTP_LENGTH).fill("")); setOtpError(""); }}
                        className="text-[#64748b] hover:text-[#94a3b8] transition-colors"
                      >
                        ← Change email
                      </button>
                      <button
                        onClick={handleResend}
                        disabled={resendTimer > 0 || loading}
                        className="transition-colors disabled:opacity-50"
                        style={{ color: resendTimer > 0 ? "#64748b" : "#00f2ff" }}
                      >
                        {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend code"}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ── SUCCESS STEP ── */}
                {step === "success" && (
                  <motion.div key="success" custom={direction} variants={stepV} initial="enter" animate="center" exit="exit"
                    className="flex flex-col items-center justify-center gap-4 py-8">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring" as const, stiffness: 400, damping: 20, delay: 0.1 }}
                    >
                      <div className="w-16 h-16 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(0,255,148,0.1)", border: "2px solid rgba(0,255,148,0.35)", boxShadow: "0 0 30px rgba(0,255,148,0.2)" }}>
                        <CheckCircle size={32} className="text-[#00ff94]" />
                      </div>
                    </motion.div>
                    <p className="text-[14px] text-[#64748b]">Signing you in…</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
