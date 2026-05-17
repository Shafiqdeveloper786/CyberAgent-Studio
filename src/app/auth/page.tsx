"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { LoginCard } from "@/components/auth/LoginCard";
import { OtpVerification } from "@/components/auth/OtpVerification";

type Step      = "login" | "otp";
type OtpStatus = "idle" | "error" | "success";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_SECS = 60;

/* ── Floating neon orb ── */
function Orb({ color, style }: { color: string; style: React.CSSProperties }) {
  return (
    <div
      className="absolute rounded-full pointer-events-none"
      style={{
        background: `radial-gradient(circle, ${color}, transparent 70%)`,
        filter:     "blur(60px)",
        opacity:    0.22,
        ...style,
      }}
    />
  );
}

export default function AuthPage() {
  const router = useRouter();

  const [step,     setStep]     = useState<Step>("login");
  const [email,    setEmail]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [otpStatus, setOtpStatus] = useState<OtpStatus>("idle");

  const [resendTimer, setResendTimer] = useState(RESEND_SECS);
  const [canResend,   setCanResend]   = useState(false);

  /* Countdown when on OTP step */
  useEffect(() => {
    if (step !== "otp") return;
    setResendTimer(RESEND_SECS);
    setCanResend(false);
    const interval = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) { clearInterval(interval); setCanResend(true); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  /* ── Send OTP ── */
  const handleSendOtp = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError(""); setLoading(true);
    try {
      const res  = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json() as { error?: string; detail?: string };
      if (!res.ok) {
        setError(data.error ?? "Failed to send code.");
        if (data.detail) toast.error(data.detail.split("\n")[0]);
      } else {
        setStep("otp");
        toast.success(`Code sent to ${trimmed}`);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Verify OTP ── */
  const handleVerify = async (code: string) => {
    setError(""); setLoading(true); setOtpStatus("idle");
    try {
      const result = await signIn("otp", {
        email:    email.trim().toLowerCase(),
        token:    code,
        redirect: false,
      });
      if (result?.error || !result?.ok) {
        setOtpStatus("error");
        setError("Invalid or expired code. Try again.");
        toast.error("Incorrect OTP — please re-enter.");
      } else {
        setOtpStatus("success");
        toast.success("Verified! Taking you to the dashboard…");
        /* Immediate redirect */
        setTimeout(() => router.push("/dashboard"), 900);
      }
    } catch {
      setOtpStatus("error");
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Resend OTP ── */
  const handleResend = async () => {
    setError(""); setOtpStatus("idle"); setLoading(true);
    try {
      const res  = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Could not resend code.");
      } else {
        setStep("otp"); // resets countdown via useEffect
        toast.success("New code sent!");
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Back to login ── */
  const handleBack = () => {
    setStep("login");
    setError("");
    setOtpStatus("idle");
  };

  return (
    <div
      className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden"
      style={{ background: "#000000", fontFamily: "var(--font-urbanist, var(--font-sans))" }}
    >
      {/* ── Subtle grid ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,242,255,0.025) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(0,242,255,0.025) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* ── Animated neon orbs ── */}
      <motion.div
        className="absolute pointer-events-none"
        animate={{ x: [0, 80, -40, 0], y: [0, -60, 80, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        style={{ top: "10%", left: "15%", width: 500, height: 500 }}
      >
        <Orb color="#00f2ff" style={{ width: "100%", height: "100%" }} />
      </motion.div>
      <motion.div
        className="absolute pointer-events-none"
        animate={{ x: [0, -60, 40, 0], y: [0, 80, -40, 0] }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        style={{ bottom: "10%", right: "15%", width: 420, height: 420 }}
      >
        <Orb color="#a855f7" style={{ width: "100%", height: "100%" }} />
      </motion.div>
      <motion.div
        className="absolute pointer-events-none"
        animate={{ x: [0, 40, -30, 0], y: [0, -40, 60, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut", delay: 6 }}
        style={{ top: "50%", right: "25%", width: 280, height: 280 }}
      >
        <Orb color="#00f2ff" style={{ width: "100%", height: "100%", opacity: 0.12 }} />
      </motion.div>

      {/* ── Card ── */}
      <div className="relative w-full max-w-[440px] z-10">
        <AnimatePresence mode="wait">
          {step === "login" ? (
            <LoginCard
              key="login"
              email={email}
              onEmailChange={(v) => { setEmail(v); setError(""); }}
              onSendOtp={handleSendOtp}
              onGoogleLogin={() => signIn("google", { callbackUrl: "/dashboard" })}
              loading={loading}
              error={error}
              onBackToHome={() => router.push("/")}
            />
          ) : (
            <OtpVerification
              key="otp"
              email={email.trim().toLowerCase()}
              onVerify={handleVerify}
              onResend={handleResend}
              onBack={handleBack}
              loading={loading}
              error={error}
              status={otpStatus}
              resendTimer={resendTimer}
              canResend={canResend}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
