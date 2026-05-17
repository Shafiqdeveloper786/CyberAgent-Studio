"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Check, Zap, TrendingUp, Cpu, Sparkles,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

/* ════════════════════════════════════════════════
   Plan data
════════════════════════════════════════════════ */
interface Plan {
  id: string; name: string; monthlyPrice: number; tagline: string;
  icon: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }>;
  accent: string; glow: string; desc: string;
  features: string[]; cta: string; popular: boolean;
}

const PLANS: Plan[] = [
  {
    id: "basic", name: "Basic", monthlyPrice: 15,
    tagline: "Perfect for solo builders",
    icon: Zap,
    accent: "#64748b", glow: "rgba(100,116,139,0.2)",
    desc: "Get started with core AI chat features.",
    features: [
      "1 Chatbot Agent",
      "500 Messages / month",
      "Basic UI Customization",
      "3 Accent Color Themes",
      "Email Support",
      "Standard Analytics",
    ],
    cta: "Start Basic", popular: false,
  },
  {
    id: "pro", name: "Pro", monthlyPrice: 39,
    tagline: "For growing businesses",
    icon: TrendingUp,
    accent: "#00f2ff", glow: "rgba(0,242,255,0.25)",
    desc: "Real power, real scale, real results.",
    features: [
      "3 Chatbot Agents",
      "5,000 Messages / month",
      "No \"Powered by\" Branding",
      "Lead Generation Forms",
      "All UI Themes + Custom Colors",
      "Priority Support",
      "Advanced Analytics",
    ],
    cta: "Upgrade to Pro", popular: true,
  },
  {
    id: "enterprise", name: "Enterprise", monthlyPrice: 79,
    tagline: "Unlimited scale",
    icon: Cpu,
    accent: "#a855f7", glow: "rgba(168,85,247,0.25)",
    desc: "Unlimited agents. Full control.",
    features: [
      "Unlimited Agents",
      "20,000 Messages / month",
      "Custom AI System Prompts",
      "Advanced Analytics + Funnels",
      "White-label Solution",
      "Custom Integrations (API)",
      "Dedicated Account Manager",
    ],
    cta: "Contact Sales", popular: false,
  },
];

/* ════════════════════════════════════════════════
   Animation variants
════════════════════════════════════════════════ */
const backdropV = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1 },
  exit:    { opacity: 0, transition: { duration: 0.2 } },
};
const modalV = {
  hidden:  { opacity: 0, y: 32, scale: 0.93 },
  visible: { opacity: 1, y: 0,  scale: 1, transition: { type: "spring" as const, stiffness: 300, damping: 28 } },
  exit:    { opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.18 } },
};
const cardV = {
  hidden:  { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: 0.06 + i * 0.07, type: "spring" as const, stiffness: 280, damping: 26 },
  }),
};

/* ════════════════════════════════════════════════
   Plan card — fires modal, no routing
════════════════════════════════════════════════ */
function PlanCard({ plan, annual, index, onActivate }: {
  plan: Plan; annual: boolean; index: number;
  onActivate: () => void;
}) {
  const price = annual ? Math.round(plan.monthlyPrice * 0.8) : plan.monthlyPrice;
  const Icon  = plan.icon;

  return (
    <motion.div
      custom={index} variants={cardV} initial="hidden" animate="visible"
      className={cn("relative flex flex-col rounded-2xl p-6 transition-all duration-200 overflow-hidden", plan.popular && "md:-translate-y-3 md:scale-[1.03]")}
      style={{
        background: plan.popular
          ? `linear-gradient(160deg,${plan.glow.replace("0.25","0.08")} 0%,rgba(0,0,0,0.7) 60%)`
          : "rgba(255,255,255,0.025)",
        border:     plan.popular ? `1.5px solid ${plan.accent}45` : `1px solid rgba(255,255,255,0.08)`,
        boxShadow:  plan.popular ? `0 0 40px ${plan.glow}, 0 20px 60px rgba(0,0,0,0.4)` : "none",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg,transparent,${plan.accent},transparent)` }} />

      {/* Popular badge */}
      {plan.popular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest whitespace-nowrap"
          style={{ background: "linear-gradient(90deg,rgba(0,242,255,0.25),rgba(168,85,247,0.25))", border: "1px solid rgba(0,242,255,0.4)", color: "#00f2ff", boxShadow: "0 0 20px rgba(0,242,255,0.2)" }}>
          <Sparkles size={9} /> MOST POPULAR
        </div>
      )}

      {/* Icon + name */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${plan.accent}15`, border: `1px solid ${plan.accent}30`, boxShadow: `0 0 12px ${plan.glow.replace("0.25","0.15")}` }}>
          <Icon size={18} style={{ color: plan.accent }} />
        </div>
        <div>
          <p className="text-[16px] font-black" style={{
            background: plan.popular ? `linear-gradient(90deg,${plan.accent},#a855f7)` : "none",
            WebkitBackgroundClip: plan.popular ? "text" : "unset",
            WebkitTextFillColor:  plan.popular ? "transparent" : "#e2e8f0",
            color: plan.popular ? undefined : "#e2e8f0",
          }}>{plan.name}</p>
          <p className="text-[11px] text-[#64748b] leading-snug">{plan.tagline}</p>
        </div>
      </div>

      {/* Price */}
      <div className="mb-5">
        <div className="flex items-end gap-1">
          <span className="text-[40px] font-black leading-none tracking-tight"
            style={{ color: plan.popular ? plan.accent : "#e2e8f0", textShadow: plan.popular ? `0 0 20px ${plan.glow}` : "none" }}>
            ${price}
          </span>
          <div className="mb-2 flex flex-col">
            <span className="text-[12px] text-[#64748b]">/mo</span>
            {annual && <span className="text-[10px] text-[#00ff94]">20% off</span>}
          </div>
        </div>
        {annual && <p className="text-[11px] text-[#334155] mt-0.5">Billed annually (${price * 12}/yr)</p>}
      </div>

      {/* Divider */}
      <div className="mb-5 h-px" style={{ background: `linear-gradient(90deg,${plan.accent}30,transparent)` }} />

      {/* Features */}
      <ul className="flex flex-col gap-2.5 flex-1 mb-6">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[12px] text-[#94a3b8]">
            <Check size={12} className="mt-0.5 shrink-0" style={{ color: plan.accent }} />
            {f}
          </li>
        ))}
      </ul>

      {/* CTA — opens modal, no routing */}
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onActivate(); }}
        className="w-full py-3 rounded-xl text-[13px] font-black tracking-wide transition-all duration-150 active:scale-[0.97] hover:opacity-90"
        style={plan.popular
          ? { background: `linear-gradient(90deg,${plan.accent}28,${plan.accent}15)`, border: `1px solid ${plan.accent}45`, color: plan.accent, boxShadow: `0 0 22px ${plan.glow.replace("0.25","0.2")}` }
          : plan.id === "enterprise"
          ? { background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.3)", color: "#a855f7" }
          : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)", color: "#94a3b8" }
        }
      >
        {plan.cta}
      </button>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════
   Main Modal
════════════════════════════════════════════════ */
export function PricingModal() {
  const { pricingOpen, closePricing } = useAuthStore();
  const [annual,                 setAnnual]                 = useState(false);
  const [showManualPaymentModal, setShowManualPaymentModal] = useState(false);

  /* Escape key — close payment modal first, then pricing modal */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (showManualPaymentModal) { setShowManualPaymentModal(false); return; }
      closePricing();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [closePricing, showManualPaymentModal]);

  const handleClose = () => {
    setShowManualPaymentModal(false);
    closePricing();
  };

  return (
    <AnimatePresence>
      {pricingOpen && (
        <motion.div
          key="pricing-backdrop"
          variants={backdropV} initial="hidden" animate="visible" exit="exit"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(12px)" }}
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <motion.div
            key="pricing-modal"
            variants={modalV} initial="hidden" animate="visible" exit="exit"
            className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl"
            style={{
              background: "linear-gradient(160deg,rgba(8,8,18,0.99) 0%,rgba(5,5,12,1) 100%)",
              border:     "1px solid rgba(255,255,255,0.09)",
              boxShadow:  "0 0 0 1px rgba(0,242,255,0.04), 0 0 80px rgba(0,242,255,0.06), 0 40px 100px rgba(0,0,0,0.7)",
            }}
          >
            {/* Rainbow top line */}
            <div className="absolute top-0 left-0 right-0 h-px rounded-t-2xl"
              style={{ background: "linear-gradient(90deg,transparent 0%,rgba(0,242,255,0.7) 35%,rgba(168,85,247,0.7) 65%,transparent 100%)" }} />

            {/* Cyber grid texture */}
            <div className="absolute inset-0 rounded-2xl pointer-events-none opacity-[0.02]"
              style={{ backgroundImage: "linear-gradient(rgba(0,242,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,242,255,1) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

            {/* Close */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 flex items-center justify-center w-8 h-8 rounded-lg text-[#64748b] hover:text-[#94a3b8] hover:bg-white/[0.06] transition-all"
              style={{ border: "1px solid rgba(255,255,255,0.08)" }}
            >
              <X size={15} />
            </button>

            {/* Header */}
            <div className="px-6 sm:px-10 pt-8 pb-6 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold mb-4"
                style={{ background: "rgba(0,242,255,0.08)", border: "1px solid rgba(0,242,255,0.2)", color: "#00f2ff" }}>
                <Sparkles size={10} /> Transparent pricing — cancel anytime
              </div>

              <h2 className="text-[24px] sm:text-[28px] font-black text-[#e2e8f0] tracking-tight">
                Choose Your{" "}
                <span style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  Plan
                </span>
              </h2>
              <p className="text-[13px] text-[#64748b] mt-2">Scale your AI chatbot business. Upgrade or cancel anytime.</p>

              {/* Billing toggle */}
              <div className="flex items-center justify-center gap-3 mt-5">
                <span className={cn("text-[13px] font-medium transition-colors", !annual ? "text-[#e2e8f0]" : "text-[#334155]")}>Monthly</span>
                <button
                  type="button"
                  onClick={() => setAnnual((a) => !a)}
                  className="relative w-11 h-6 rounded-full transition-all duration-200"
                  style={{
                    background: annual ? "linear-gradient(90deg,rgba(0,242,255,0.35),rgba(168,85,247,0.35))" : "rgba(255,255,255,0.08)",
                    border:     annual ? "1px solid rgba(0,242,255,0.3)" : "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <motion.div
                    animate={{ x: annual ? 20 : 2 }}
                    transition={{ type: "spring" as const, stiffness: 400, damping: 28 }}
                    className="absolute top-[3px] w-4 h-4 rounded-full"
                    style={{ background: annual ? "#00f2ff" : "#64748b", boxShadow: annual ? "0 0 8px rgba(0,242,255,0.6)" : "none" }}
                  />
                </button>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[13px] font-medium transition-colors", annual ? "text-[#e2e8f0]" : "text-[#334155]")}>Annual</span>
                  {annual && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                      style={{ background: "rgba(0,255,148,0.1)", border: "1px solid rgba(0,255,148,0.25)", color: "#00ff94" }}
                    >
                      SAVE 20%
                    </motion.span>
                  )}
                </div>
              </div>
            </div>

            {/* Plan cards — any CTA opens the shared payment modal */}
            <div className="px-4 sm:px-6 pb-8 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 md:items-start">
              {PLANS.map((plan, i) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  annual={annual}
                  index={i}
                  onActivate={() => setShowManualPaymentModal(true)}
                />
              ))}
            </div>

            <div className="px-6 sm:px-10 pb-6 text-center">
              <p className="text-[11px] text-[#334155]">
                All plans include a 14-day free trial.{" "}
                <span className="text-[#64748b] hover:text-[#94a3b8] cursor-pointer transition-colors">View full feature comparison →</span>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ══════════════════════════════════════════════
          Manual payment modal — z-[110], pure state
      ══════════════════════════════════════════════ */}
      {showManualPaymentModal && (
        <div className="fixed inset-0 bg-black/88 backdrop-blur-xl z-[110] flex items-center justify-center p-4">
          <div
            className="relative max-w-md w-full p-6 sm:p-8 rounded-2xl overflow-hidden text-white"
            style={{
              background: "rgba(8,8,10,0.97)",
              border:     "1px solid rgba(0,242,255,0.4)",
              boxShadow:  "0 0 50px rgba(0,242,255,0.15), 0 0 100px rgba(0,0,0,0.8)",
            }}
          >
            {/* Top prismatic bar */}
            <div className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: "linear-gradient(90deg,#f59e0b,#00f2ff 50%,#a855f7)" }} />

            {/* Corner brackets */}
            <div className="absolute top-3 left-3 w-4 h-4 pointer-events-none"
              style={{ borderTop: "1.5px solid rgba(0,242,255,0.45)", borderLeft: "1.5px solid rgba(0,242,255,0.45)" }} />
            <div className="absolute top-3 right-10 w-4 h-4 pointer-events-none"
              style={{ borderTop: "1.5px solid rgba(0,242,255,0.45)", borderRight: "1.5px solid rgba(0,242,255,0.45)" }} />
            <div className="absolute bottom-3 left-3 w-4 h-4 pointer-events-none"
              style={{ borderBottom: "1.5px solid rgba(168,85,247,0.4)", borderLeft: "1.5px solid rgba(168,85,247,0.4)" }} />
            <div className="absolute bottom-3 right-3 w-4 h-4 pointer-events-none"
              style={{ borderBottom: "1.5px solid rgba(168,85,247,0.4)", borderRight: "1.5px solid rgba(168,85,247,0.4)" }} />

            {/* Close */}
            <button
              type="button"
              onClick={() => setShowManualPaymentModal(false)}
              className="absolute top-3.5 right-3.5 w-7 h-7 flex items-center justify-center rounded-lg transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#475569" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#475569"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
            >
              <X size={13} />
            </button>

            {/* Icon badge */}
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.28)", boxShadow: "0 0 20px rgba(245,158,11,0.1)" }}>
              <span className="text-2xl" style={{ filter: "drop-shadow(0 0 8px rgba(245,158,11,0.7))" }}>⚡</span>
            </div>

            {/* Heading — gradient text */}
            <h3
              className="text-[20px] font-black tracking-tight text-center mb-1.5"
              style={{
                background: "linear-gradient(90deg,#ffffff,#a5f3fc,#00f2ff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Secure Plan Activation
            </h3>

            {/* Subtitle — amber pulse */}
            <p className="text-[11px] text-amber-400 font-extrabold tracking-widest uppercase text-center animate-pulse mb-4 pb-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              Automated Gateway Nodes Syncing
            </p>

            {/* Body paragraph with accent words */}
            <p className="text-[13px] text-zinc-300 leading-relaxed mb-5 text-center">
              Our automated direct-checkout architecture is currently undergoing{" "}
              <span className="text-cyan-400 font-semibold">beta optimization cycles</span>.
              Full-scale instant payment{" "}
              <span className="text-cyan-400 font-semibold">provisioning channels</span>{" "}
              will be activated deployment-wide shortly.
            </p>

            {/* Transfer block */}
            <div className="rounded-xl p-4 mb-4 space-y-3"
              style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(255,255,255,0.07)" }}>

              <p className="text-[12px] text-zinc-400 leading-relaxed">
                To upgrade your account immediately via manual wire processing, please establish
                direct coordinates with our secure global billing desk:
              </p>

              {/* Payment method tags */}
              <div className="flex flex-wrap gap-2">
                {[
                  { icon: "⚡", label: "Easypaisa" },
                  { icon: "📱", label: "JazzCash" },
                  { icon: "🏦", label: "Bank Transfer" },
                ].map(({ icon, label }) => (
                  <span
                    key={label}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold"
                    style={{
                      background: "rgba(16,185,129,0.08)",
                      border:     "1px solid rgba(16,185,129,0.22)",
                      color:      "#34d399",
                    }}
                  >
                    {icon} {label}
                  </span>
                ))}
              </div>

              {/* Email terminal */}
              <div>
                <div
                  className="px-4 py-3 rounded-xl font-mono text-xs text-[#00f2ff] text-center break-all select-all font-black tracking-wider cursor-pointer transition-all duration-300"
                  style={{
                    background: "rgba(0,0,0,0.8)",
                    border:     "1px solid #00f2ff",
                    boxShadow:  "0 0 15px rgba(0,242,255,0.2)",
                  }}
                  onClick={() => navigator.clipboard.writeText("muhammadshafiqchohan12@gmail.com")}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(0,242,255,0.05)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(0,0,0,0.8)"; }}
                >
                  muhammadshafiqchohan12@gmail.com
                </div>
                <span className="block text-center text-zinc-500 text-[10px] uppercase tracking-widest mt-1.5 font-bold">
                  👉 Click to Copy Secure Coordinates
                </span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-600 italic text-center mb-5">
              Automated checkout nodes will become fully operational in the upcoming patch update.
            </p>

            {/* CTA */}
            <button
              type="button"
              onClick={() => setShowManualPaymentModal(false)}
              className="w-full text-black font-black uppercase tracking-widest py-3 px-6 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all duration-300 text-xs"
              style={{
                background: "linear-gradient(90deg,#06b6d4,#00f2ff)",
                boxShadow:  "0 4px 20px rgba(0,242,255,0.3)",
              }}
            >
              Return &amp; Modify Plan
            </button>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
