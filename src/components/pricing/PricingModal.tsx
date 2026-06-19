"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Check, Zap, TrendingUp, Cpu, Sparkles,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

/* ════════════════════════════════════════════════
    Plan data — adjusted accents for light theme
════════════════════════════════════════════════ */
interface Plan {
  id: string; name: string; monthlyPrice: number; tagline: string;
  icon: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }>;
  accent: string; desc: string;
  features: string[]; cta: string; popular: boolean;
}

const PLANS: Plan[] = [
  {
    id: "basic", name: "Basic", monthlyPrice: 15,
    tagline: "Perfect for solo builders",
    icon: Zap,
    accent: "#64748b",
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
    accent: "#2563eb",
    desc: "Real power, real scale, real results.",
    features: [
      "3 Chatbot Agents",
      "5,000 Messages / month",
      'No "Powered by" Branding',
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
    accent: "#7c3aed",
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

/* Animation variants */
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

/* Plan card — light theme */
function PlanCard({ plan, annual, index, onActivate }: {
  plan: Plan; annual: boolean; index: number;
  onActivate: () => void;
}) {
  const price = annual ? Math.round(plan.monthlyPrice * 0.8) : plan.monthlyPrice;
  const Icon  = plan.icon;

  return (
    <motion.div
      custom={index} variants={cardV} initial="hidden" animate="visible"
      className={cn(
        "relative flex flex-col rounded-2xl p-6 transition-all duration-200 bg-white border",
        plan.popular
          ? "border-blue-600 ring-2 ring-blue-600/20 shadow-lg md:-translate-y-3 md:scale-[1.03]"
          : "border-slate-200 shadow-sm hover:border-slate-300"
      )}
    >
      {/* Popular badge */}
      {plan.popular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-widest whitespace-nowrap bg-blue-600 text-white shadow-sm">
          <Sparkles size={9} /> MOST POPULAR
        </div>
      )}

      {/* Icon + name */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-slate-50 border border-slate-200">
          <Icon size={18} style={{ color: plan.accent }} />
        </div>
        <div>
          <p className={cn("text-[16px] font-black", plan.popular ? "text-blue-600" : "text-slate-900")}>{plan.name}</p>
          <p className="text-[11px] text-slate-500 leading-snug">{plan.tagline}</p>
        </div>
      </div>

      {/* Price */}
      <div className="mb-5">
        <div className="flex items-end gap-1">
          <span className="text-[40px] font-black leading-none tracking-tight text-slate-900">${price}</span>
          <div className="mb-2 flex flex-col">
            <span className="text-[12px] text-slate-500">/mo</span>
            {annual && <span className="text-[10px] text-emerald-600 font-semibold">20% off</span>}
          </div>
        </div>
        {annual && <p className="text-[11px] text-slate-400 mt-0.5">Billed annually (${price * 12}/yr)</p>}
      </div>

      {/* Divider */}
      <div className="mb-5 h-px bg-slate-100" />

      {/* Features */}
      <ul className="flex flex-col gap-2.5 flex-1 mb-6">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[12px] text-slate-600">
            <Check size={12} className="mt-0.5 shrink-0" style={{ color: plan.accent }} />
            {f}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onActivate(); }}
        className={cn(
          "w-full py-3 rounded-xl text-[13px] font-bold tracking-wide transition-all duration-150 active:scale-[0.97]",
          plan.popular
            ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
            : plan.id === "enterprise"
            ? "bg-purple-600 text-white hover:bg-purple-700 shadow-sm"
            : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
        )}
      >
        {plan.cta}
      </button>
    </motion.div>
  );
}

/* ════════════════════════════════════════════════
    Main Modal — Light Theme
════════════════════════════════════════════════ */
export function PricingModal() {
  const { pricingOpen, closePricing } = useAuthStore();
  const [annual, setAnnual] = useState(false);
  const [showManualPaymentModal, setShowManualPaymentModal] = useState(false);

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
          style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(8px)" }}
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <motion.div
            key="pricing-modal"
            variants={modalV} initial="hidden" animate="visible" exit="exit"
            className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white border border-slate-200 shadow-2xl"
          >
            {/* Close */}
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-4 right-4 z-10 flex items-center justify-center w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all border border-slate-200 bg-white"
            >
              <X size={15} />
            </button>

            {/* Header */}
            <div className="px-6 sm:px-10 pt-8 pb-6 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold mb-4 bg-blue-50 text-blue-600 border border-blue-200">
                <Sparkles size={10} /> Transparent pricing — cancel anytime
              </div>

              <h2 className="text-[24px] sm:text-[28px] font-black text-slate-900 tracking-tight">
                Choose Your <span className="text-blue-600">Plan</span>
              </h2>
              <p className="text-[13px] text-slate-500 mt-2">Scale your AI chatbot business. Upgrade or cancel anytime.</p>

              {/* Billing toggle — light */}
              <div className="flex items-center justify-center gap-3 mt-5">
                <span className={cn("text-[13px] font-medium transition-colors", !annual ? "text-slate-900" : "text-slate-400")}>Monthly</span>
                <button
                  type="button"
                  onClick={() => setAnnual((a) => !a)}
                  className="relative w-11 h-6 rounded-full transition-all duration-200 bg-white border"
                  style={{
                    background: annual ? "#2563eb" : "#e2e8f0",
                    borderColor: annual ? "#2563eb" : "#cbd5e1",
                  }}
                >
                  <motion.div
                    animate={{ x: annual ? 20 : 2 }}
                    transition={{ type: "spring" as const, stiffness: 400, damping: 28 }}
                    className="absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm"
                  />
                </button>
                <div className="flex items-center gap-2">
                  <span className={cn("text-[13px] font-medium transition-colors", annual ? "text-slate-900" : "text-slate-400")}>Annual</span>
                  {annual && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200"
                    >
                      SAVE 20%
                    </motion.span>
                  )}
                </div>
              </div>
            </div>

            {/* Plan cards */}
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
              <p className="text-[11px] text-slate-400">
                All plans include a 14-day free trial.{" "}
                <span className="text-slate-500 hover:text-slate-700 cursor-pointer transition-colors font-medium">View full feature comparison →</span>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Manual Payment Modal — Light */}
      {showManualPaymentModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(8px)" }}>
          <div className="relative max-w-md w-full p-6 sm:p-8 rounded-2xl bg-white border border-slate-200 shadow-xl">
            {/* Close */}
            <button
              type="button"
              onClick={() => setShowManualPaymentModal(false)}
              className="absolute top-3.5 right-3.5 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
            >
              <X size={13} />
            </button>

            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-amber-50 border border-amber-200">
              <span className="text-2xl">⚡</span>
            </div>

            <h3 className="text-[20px] font-black tracking-tight text-slate-900 text-center mb-1.5">
              Secure Plan Activation
            </h3>

            <p className="text-[11px] text-amber-600 font-bold tracking-widest uppercase text-center animate-pulse mb-4 pb-3 border-b border-slate-200">
              Automated Gateway Nodes Syncing
            </p>

            <p className="text-[13px] text-slate-500 leading-relaxed mb-5 text-center">
              Our automated direct-checkout architecture is currently undergoing
              beta optimization cycles. Full-scale instant payment
              provisioning channels will be activated deployment-wide shortly.
            </p>

            <div className="rounded-xl p-4 mb-4 space-y-3 bg-slate-50 border border-slate-200">
              <p className="text-[12px] text-slate-500 leading-relaxed">
                To upgrade your account immediately via manual wire processing, please establish
                direct coordinates with our secure global billing desk:
              </p>

              <div className="flex flex-wrap gap-2">
                {[
                  { icon: "⚡", label: "Easypaisa" },
                  { icon: "📱", label: "JazzCash" },
                  { icon: "🏦", label: "Bank Transfer" },
                ].map(({ icon, label }) => (
                  <span key={label}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                    {icon} {label}
                  </span>
                ))}
              </div>

              <div>
                <div
                  className="px-4 py-3 rounded-xl font-mono text-xs text-blue-700 text-center break-all select-all font-bold tracking-wider cursor-pointer transition-all bg-white border border-slate-200 hover:bg-blue-50 shadow-sm"
                  onClick={() => navigator.clipboard.writeText("muhammadshafiqchohan12@gmail.com")}
                >
                  muhammadshafiqchohan12@gmail.com
                </div>
                <span className="block text-center text-slate-400 text-[10px] uppercase tracking-widest mt-1.5 font-bold">
                  👉 Click to Copy Secure Coordinates
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic text-center mb-5">
              Automated checkout nodes will become fully operational in the upcoming patch update.
            </p>

            <button
              type="button"
              onClick={() => setShowManualPaymentModal(false)}
              className="w-full text-white font-bold uppercase tracking-widest py-3 px-6 rounded-xl hover:opacity-90 active:scale-[0.98] transition-all bg-blue-600 shadow-sm"
            >
              Return & Modify Plan
            </button>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}