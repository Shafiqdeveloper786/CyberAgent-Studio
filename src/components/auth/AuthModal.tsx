"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Zap, ArrowRight, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { signIn } from "next-auth/react";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

/* ── Types ── */
type ModalStep = "email" | "otp" | "success";
const OTP_LENGTH  = 6;
const RESEND_WAIT = 60; // seconds

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
            "w-10 h-12 sm:w-12 sm:h-14 text-center text-lg font-bold rounded-xl outline-none transition-all duration-150",
            "focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
            value[i]
              ? "text-slate-900 border-blue-400 bg-blue-50/50"
              : "text-slate-400 border-slate-200 bg-slate-50"
          )}
          style={{
            border: value[i] ? "1.5px solid #93c5fd" : "1px solid #e2e8f0",
            background: value[i] ? "rgba(239,246,255,0.6)" : "#f8fafc",
            caretColor: "#3b82f6",
          }}
        />
      ))}
    </div>
  );
}

/* ── Animation variants ── */
const backdropV = { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } };
const modalV = {
  hidden:  { opacity: 0, scale: 0.92, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 340, damping: 30 } },
  exit:    { opacity: 0, scale: 0.95, y: 12, transition: { duration: 0.18 } },
};
const stepV = {
  enter:  { opacity: 0, y: 12 },
  center: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeOut" as const } },
  exit:   { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

/* ── Component ── */
export function AuthModal() {
  const { authModalState, closeAuthModal, closeModal } = useAuthStore();
  const router = useRouter();

  const [step,        setStep]       = useState<ModalStep>("email");
  const [email,       setEmail]      = useState("");
  const [emailError,  setEmailError] = useState("");
  const [otp,         setOtp]        = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [otpError,    setOtpError]   = useState("");
  const [loading,      setLoading]     = useState(false);
  const [resendTimer,  setResendTimer]  = useState(0);
  const [emailDetail,  setEmailDetail]  = useState("");
  const [otpDetail,    setOtpDetail]    = useState("");

  const isOpen = authModalState !== "CLOSED";

  /* Reset on open — also respects initial step */
  useEffect(() => {
    if (isOpen) {
      setStep(authModalState === "VERIFY" ? "otp" : "email");
      setEmail(""); setEmailError(""); setEmailDetail("");
      setOtp(Array(OTP_LENGTH).fill("")); setOtpError(""); setOtpDetail("");
      setLoading(false); setResendTimer(0);
    }
  }, [isOpen, authModalState]);

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
      setTimeout(() => { router.push("/dashboard"); router.refresh(); closeModal(); }, 2000);
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
      {isOpen && (
        <>
          {/* ── Crisp dark backdrop (no blur — dashboard blur-sm handles that) ── */}
          <motion.div
            key="backdrop"
            variants={backdropV}
            initial="hidden" animate="visible" exit="exit"
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100]"
            style={{ background: "rgba(15,23,42,0.55)" }}
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          />

          {/* ── Foreground modal portal (crisp, no blur) ── */}
          <motion.div
            key="modal"
            variants={modalV}
            initial="hidden" animate="visible" exit="exit"
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[110] w-full max-w-md"
          >
            {/* ── Premium White Card ── */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl p-10 relative overflow-hidden">

              {/* ── Header ── */}
              <div className="flex flex-col items-center gap-3 mb-8">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20">
                  <Zap size={20} className="text-white" />
                </div>
                <div className="text-center">
                  <h2 className="text-slate-900 font-extrabold text-2xl tracking-tight">
                    {step === "success" ? "Welcome aboard!" : "CyberAgent Studio"}
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">
                    {step === "email"   && "Sign in or create an account to get started."}
                    {step === "otp"     && <>Verify your email</>}
                    {step === "success" && "Redirecting to your dashboard…"}
                  </p>
                </div>
              </div>

              {/* ── Step Content ── */}
              <div className="relative min-h-[220px]">
                <AnimatePresence mode="wait">
                  {/* ══════ EMAIL STEP ══════ */}
                  {step === "email" && (
                    <motion.div
                      key="email"
                      variants={stepV}
                      initial="enter" animate="center" exit="exit"
                      className="space-y-4"
                    >
                      {/* Google button */}
                      <button
                        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 py-3 rounded-xl text-sm font-semibold text-slate-700 border border-slate-300 hover:bg-slate-50 active:scale-[0.98] transition-all disabled:opacity-60"
                      >
                        <GoogleIcon /> Continue with Google
                      </button>

                      {/* Divider */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-slate-200" />
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">or email</span>
                        <div className="flex-1 h-px bg-slate-200" />
                      </div>

                      {/* Email field */}
                      <div className="space-y-1.5">
                        <div className="relative">
                          <Mail size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                            onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                            placeholder="your@email.com"
                            className={cn(
                              "w-full pl-10 pr-4 py-3 rounded-xl text-sm text-slate-900 outline-none transition-all",
                              "bg-slate-50 border placeholder:text-slate-400",
                              "focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                              emailError ? "border-red-300 focus:ring-red-400" : "border-slate-200"
                            )}
                          />
                        </div>
                        {emailError && (
                          <div className="pl-1 space-y-0.5">
                            <p className="text-xs text-red-500">{emailError}</p>
                            {emailDetail && <p className="text-[10px] text-slate-400 font-mono leading-snug">{emailDetail}</p>}
                          </div>
                        )}
                      </div>

                      {/* Send OTP */}
                      <button
                        onClick={handleSendOtp}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-60 bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20"
                      >
                        {loading ? (
                          <RefreshCw size={15} className="animate-spin" />
                        ) : (
                          <><ArrowRight size={15} />Send Verification Code</>
                        )}
                      </button>

                      <p className="text-center text-[11px] text-slate-400">
                        By continuing you agree to our{" "}
                        <span className="text-slate-500 hover:text-slate-700 cursor-pointer transition-colors font-medium">Terms of Service</span>
                      </p>
                    </motion.div>
                  )}

                  {/* ══════ OTP STEP ══════ */}
                  {step === "otp" && (
                    <motion.div
                      key="otp"
                      variants={stepV}
                      initial="enter" animate="center" exit="exit"
                      className="space-y-5"
                    >
                      {/* Email display */}
                      <div className="text-center">
                        <p className="text-sm text-slate-700 font-medium">
                          Verification code sent to:
                        </p>
                        <p className="text-sm text-blue-600 font-semibold mt-0.5">
                          {email}
                        </p>
                      </div>

                      {/* OTP Input */}
                      <OtpInput value={otp} onChange={setOtp} />

                      {/* Spam check tip */}
                      <div className="flex items-start gap-2 px-1">
                        <AlertCircle size={13} className="text-slate-400 mt-0.5 shrink-0" />
                        <p className="text-slate-500 text-xs italic leading-relaxed">
                          Didn't receive the code? Please check your Spam or Junk folder as well.
                        </p>
                      </div>

                      {otpError && (
                        <div className="text-center space-y-0.5">
                          <p className="text-xs text-red-500">{otpError}</p>
                          {otpDetail && <p className="text-[10px] text-slate-400 font-mono leading-snug">{otpDetail}</p>}
                        </div>
                      )}

                      {/* Verify */}
                      <button
                        onClick={handleVerify}
                        disabled={loading || otp.join("").length < OTP_LENGTH}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50 bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20"
                      >
                        {loading ? (
                          <RefreshCw size={15} className="animate-spin" />
                        ) : (
                          "Verify & Sign In"
                        )}
                      </button>

                      {/* Controls */}
                      <div className="flex items-center justify-between text-xs">
                        <button
                          onClick={() => { setStep("email"); setOtp(Array(OTP_LENGTH).fill("")); setOtpError(""); }}
                          className="text-slate-500 hover:text-slate-700 transition-colors font-medium"
                        >
                          ← Change email
                        </button>
                        <button
                          onClick={handleResend}
                          disabled={resendTimer > 0 || loading}
                          className="font-medium transition-colors disabled:opacity-50"
                          style={{ color: resendTimer > 0 ? "#94a3b8" : "#3b82f6" }}
                        >
                          {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend code"}
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* ══════ SUCCESS STEP ══════ */}
                  {step === "success" && (
                    <motion.div
                      key="success"
                      variants={stepV}
                      initial="enter" animate="center" exit="exit"
                      className="flex flex-col items-center justify-center gap-4 py-6"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring" as const, stiffness: 400, damping: 20, delay: 0.1 }}
                      >
                        <div className="w-16 h-16 rounded-full flex items-center justify-center bg-green-50 border-2 border-green-200 shadow-sm">
                          <CheckCircle size={32} className="text-green-500" />
                        </div>
                      </motion.div>
                      <p className="text-sm font-semibold text-green-600">✔ Success! Redirecting to dashboard...</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}