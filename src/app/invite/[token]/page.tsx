"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from 'next/image';
import { motion, AnimatePresence } from "framer-motion";
import { Shield, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

type State = "verifying" | "success" | "error" | "logging_in";

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const router = useRouter();
  const [state, setState] = useState<State>("verifying");
  const [errorMsg, setErrorMsg] = useState("");
  const [token, setToken] = useState<string>("");

  useEffect(() => {
    params.then(({ token: t }) => {
      setToken(t);
      acceptInvite(t);
    });
  }, [params]);

  const acceptInvite = async (inviteToken: string) => {
    try {
      setState("verifying");
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: inviteToken }),
      });

      const data = (await res.json()) as { ok: boolean; email?: string; otp?: string; error?: string };

      if (!data.ok || !data.email || !data.otp) {
        setErrorMsg(data.error || "This invitation is invalid or has expired.");
        setState("error");
        return;
      }

      setState("logging_in");
      // Auto sign-in using the temporary OTP
      const result = await signIn("otp", {
        email: data.email,
        token: data.otp,
        redirect: false,
      });

      if (result?.error) {
        setErrorMsg("Authentication failed. Please try signing in manually.");
        setState("error");
        return;
      }

      setState("success");
      // Redirect to dashboard after brief success animation
      setTimeout(() => {
        router.push("/dashboard");
      }, 1800);
    } catch (err) {
      console.error("[invite/page] Error:", err);
      setErrorMsg("A network error occurred. Please try again.");
      setState("error");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      {/* Background gradient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-violet-400/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md"
      >
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Image src="/logo.png" alt="CyberAgent Studio" width={180} height={40} className="object-contain" style={{ maxHeight: '40px' }} />
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1 bg-gradient-to-r from-blue-500 via-violet-500 to-indigo-500" />

          <div className="p-8 flex flex-col items-center text-center gap-6">
            <AnimatePresence mode="wait">
              {/* Verifying state */}
              {(state === "verifying" || state === "logging_in") && (
                <motion.div
                  key="verifying"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center gap-5"
                >
                  <div className="relative">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                      <Shield size={28} className="text-blue-600" />
                    </div>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                      className="absolute -top-1 -right-1"
                    >
                      <Loader2 size={18} className="text-blue-500" />
                    </motion.div>
                  </div>
                  <div>
                    <h1 className="text-lg font-black text-slate-900 tracking-tight">
                      {state === "verifying" ? "Verifying Credentials" : "Granting Access"}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                      {state === "verifying"
                        ? "Validating your secure workspace invitation…"
                        : "Setting up your account and signing you in…"}
                    </p>
                  </div>
                  <div className="flex gap-1.5 mt-2">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-blue-400"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Success state */}
              {state === "success" && (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center gap-5"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center"
                  >
                    <CheckCircle size={28} className="text-emerald-600" />
                  </motion.div>
                  <div>
                    <h1 className="text-lg font-black text-slate-900 tracking-tight">Welcome Aboard!</h1>
                    <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">
                      Your account has been verified. Redirecting you to your workspace…
                    </p>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                    <motion.div
                      className="h-full bg-emerald-500 rounded-full"
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 1.8, ease: "linear" }}
                    />
                  </div>
                </motion.div>
              )}

              {/* Error state */}
              {state === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center gap-5"
                >
                  <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center">
                    <AlertCircle size={28} className="text-rose-600" />
                  </div>
                  <div>
                    <h1 className="text-lg font-black text-slate-900 tracking-tight">Invitation Invalid</h1>
                    <p className="text-sm text-slate-500 mt-1.5 leading-relaxed max-w-xs">
                      {errorMsg}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 w-full">
                    <button
                      onClick={() => router.push("/dashboard")}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] transition-all shadow-sm shadow-blue-500/20"
                    >
                      Go to Dashboard
                    </button>
                    <button
                      onClick={() => router.push("/auth")}
                      className="w-full py-2.5 rounded-xl text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all"
                    >
                      Sign In Manually
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 border-t border-slate-100 bg-slate-50/50">
            <p className="text-[11px] text-slate-400 text-center">
              This is a secure, one-time workspace invitation link.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
