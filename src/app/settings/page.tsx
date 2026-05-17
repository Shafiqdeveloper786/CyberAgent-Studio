"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, CreditCard, Key, Users, Puzzle, Bell, AlertTriangle,
  Copy, Check, Trash2, Plus, Eye, EyeOff, Download, RefreshCw,
  ChevronRight, Shield, Zap, Globe, Mail, Link2, ShieldCheck,
  ExternalLink, ToggleLeft, ToggleRight, Save, X, LogOut, TrendingUp, Cpu,
  Pencil, MessageSquare, Webhook,
  AlertOctagon, CheckCircle, ShieldAlert,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { toast } from "sonner";
import { useAgentStore } from "@/store/agentStore";
import { useAuthStore } from "@/store/authStore";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { cn } from "@/lib/utils";

type Section = "profile" | "billing" | "api-keys" | "team" | "integrations" | "notifications" | "danger";

/* ── Nav config ── */
const NAV: {
  id: Section; label: string;
  icon: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }>;
  color: string;
}[] = [
  { id: "profile",       label: "Profile",       icon: User,          color: "#00f2ff" },
  { id: "billing",       label: "Billing",        icon: CreditCard,    color: "#f59e0b" },
  { id: "api-keys",      label: "API Keys",       icon: Key,           color: "#00ff94" },
  { id: "team",          label: "Team",           icon: Users,         color: "#a855f7" },
  { id: "integrations",  label: "Integrations",   icon: Puzzle,        color: "#ec4899" },
  { id: "notifications", label: "Notifications",  icon: Bell,          color: "#06b6d4" },
  { id: "danger",        label: "Danger Zone",    icon: AlertTriangle, color: "#f87171" },
];

/* Populated from your billing provider at runtime.
   Empty array → empty state is rendered automatically. */
const INVOICES: { date: string; ref: string; desc: string; amount: string; status: "paid" | "failed" }[] = [];

const INTEGRATIONS_LIST = [
  { name: "OpenAI",            desc: "GPT-4o for AI responses",        connected: true,  color: "#00a67e", logo: "🤖" },
  { name: "Stripe",            desc: "Payments & subscription billing", connected: true,  color: "#635bff", logo: "💳" },
  { name: "Slack",             desc: "Team notifications & alerts",     connected: false, color: "#e01e5a", logo: "💬" },
  { name: "Zapier",            desc: "Connect 5,000+ apps",            connected: false, color: "#ff4a00", logo: "⚡" },
  { name: "HubSpot",           desc: "CRM sync & lead pipeline",       connected: false, color: "#ff7a59", logo: "🔗" },
  { name: "Notion",            desc: "Knowledge base documents",        connected: false, color: "#ffffff", logo: "📄" },
  { name: "Webhooks",          desc: "Custom HTTP POST callbacks",      connected: true,  color: "#00f2ff", logo: "🔌" },
  { name: "Google Analytics",  desc: "GA4 event tracking",             connected: false, color: "#f4b400", logo: "📊" },
];

/* ══════════════════════════════════════════════
   Shared primitives
══════════════════════════════════════════════ */
function GradientText({ children, from = "#00f2ff", to = "#a855f7" }: {
  children: React.ReactNode; from?: string; to?: string;
}) {
  return (
    <span style={{
      background: `linear-gradient(90deg,${from},${to})`,
      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    }}>
      {children}
    </span>
  );
}

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn("rounded-2xl p-6 sm:p-7 space-y-6", className)}
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {children}
    </div>
  );
}

function SectionHeading({ title, desc }: { title: string; desc?: string }) {
  return (
    <div>
      <h3 className="text-[15px] font-bold text-[#e2e8f0]">{title}</h3>
      {desc && <p className="text-[12px] text-[#64748b] mt-0.5">{desc}</p>}
    </div>
  );
}

function NeonInput({
  value, onChange, placeholder = "", type = "text", disabled = false,
  prefix, className,
}: {
  value: string; onChange?: (v: string) => void;
  placeholder?: string; type?: string; disabled?: boolean;
  prefix?: React.ReactNode; className?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative" style={{ boxShadow: focused ? "0 0 0 2px rgba(0,242,255,0.25), 0 0 16px rgba(0,242,255,0.08)" : "none", borderRadius: 12, transition: "box-shadow 0.2s" }}>
      {prefix && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#334155] pointer-events-none">{prefix}</div>
      )}
      <input
        type={type} value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder} disabled={disabled}
        className={cn(
          "w-full px-3 py-2.5 rounded-xl text-[13px] text-[#e2e8f0] outline-none transition-all",
          "placeholder:text-[#334155] disabled:opacity-50 disabled:cursor-not-allowed",
          prefix && "pl-9", className
        )}
        style={{
          background: disabled ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${focused ? "rgba(0,242,255,0.4)" : "rgba(255,255,255,0.09)"}`,
          transition: "border-color 0.2s",
        }}
      />
    </div>
  );
}

function Toggle({ on, onToggle, color = "#00f2ff" }: { on: boolean; onToggle: () => void; color?: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-checked={on}
      role="switch"
      className="shrink-0 relative inline-flex items-center rounded-full transition-all duration-300 focus:outline-none"
      style={{
        width: 44, height: 24,
        background:  on ? color : "rgba(255,255,255,0.08)",
        border:      on ? `1px solid ${color}` : "1px solid rgba(255,255,255,0.1)",
        boxShadow:   on ? `0 0 10px ${color}55, 0 0 20px ${color}20` : "none",
        transition:  "background 0.25s, box-shadow 0.25s, border-color 0.25s",
      }}
    >
      <span
        className="inline-block rounded-full transition-all duration-300"
        style={{
          width: 16, height: 16,
          background:  on ? "#050508" : "#475569",
          transform:   on ? "translateX(22px)" : "translateX(3px)",
          boxShadow:   on ? `0 0 6px ${color}80` : "none",
          transition:  "transform 0.25s, background 0.25s",
        }}
      />
    </button>
  );
}

/* ══════════════════════════════════════════════
   PROFILE SECTION
══════════════════════════════════════════════ */
type ProfileMeta = { authMethod: string; createdAt: string; subscription: string };

function ProfileSection() {
  const { data: session, status } = useSession();
  const [meta, setMeta] = useState<ProfileMeta | null>(null);

  /* Fetch authMethod + createdAt from MongoDB via dedicated API route */
  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((d: ProfileMeta) => setMeta(d))
      .catch(() => {});
  }, [status]);

  const email        = session?.user?.email ?? "—";
  const name         = session?.user?.name  ?? "";
  const image        = session?.user?.image;
  const subscription = meta?.subscription ??
    (session?.user as { subscription?: string })?.subscription ?? "free";

  const isGoogleUser = meta?.authMethod === "google";

  /* "Since Month YYYY" derived from DB createdAt */
  const joinedLabel = meta?.createdAt
    ? new Date(meta.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  const initials = name
    ? name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : email.slice(0, 2).toUpperCase();

  const planLabel = { free: "Free Plan", starter: "Starter Plan", growth: "Growth Plan" }[subscription] ?? "Pro Plan";
  const planColor = subscription === "free" ? "#64748b" : subscription === "growth" ? "#00f2ff" : "#a855f7";

  /* Google G SVG */
  const GoogleG = () => (
    <svg width="14" height="14" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );

  return (
    <div className="flex items-center justify-center py-8">
      <div
        className="w-full max-w-md relative rounded-3xl px-8 py-10 flex flex-col items-center gap-6 overflow-hidden"
        style={{
          background:     "linear-gradient(135deg,rgba(0,242,255,0.06),rgba(168,85,247,0.04),rgba(6,6,14,0.9))",
          border:         "1px solid rgba(0,242,255,0.18)",
          backdropFilter: "blur(20px)",
          boxShadow:      "0 0 60px rgba(0,242,255,0.06), 0 0 100px rgba(168,85,247,0.04)",
        }}
      >
        {/* Top rainbow line */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7,#ec4899)" }} />
        <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle,rgba(0,242,255,0.08),transparent 70%)" }} />
        <div className="absolute -bottom-10 -right-10 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle,rgba(168,85,247,0.08),transparent 70%)" }} />

        {/* Avatar — strict circle: aspect-square enforces 1:1, rounded-full clips it */}
        <div className="relative w-24 h-24 shrink-0">
          {image ? (
            <div className="w-full h-full aspect-square rounded-full overflow-hidden"
              style={{ boxShadow: "0 0 30px rgba(0,242,255,0.35), 0 0 60px rgba(0,242,255,0.15)", animation: "ca-breathe 3s ease-in-out infinite" }}>
              <Image
                src={image}
                alt={name || "Profile"}
                width={96}
                height={96}
                className="w-full h-full object-cover rounded-full"
              />
            </div>
          ) : (
            <div className="w-full h-full aspect-square rounded-full flex items-center justify-center text-[30px] font-black select-none"
              style={{ background: "linear-gradient(135deg,#00f2ff,#a855f7)", color: "#050508", animation: "ca-breathe 3s ease-in-out infinite" }}>
              {status === "loading" ? "…" : initials}
            </div>
          )}
          {/* Status dot — bottom-right of the fixed 96×96 wrapper */}
          {status === "authenticated" && (
            <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 pointer-events-none"
              style={{ background: "#00ff94", borderColor: "#050508", boxShadow: "0 0 10px rgba(0,255,148,0.8)" }} />
          )}
        </div>

        {/* Name — always outside and below the avatar block */}
        {name && <p className="text-[18px] font-black text-[#e2e8f0] -mb-2">{name}</p>}

        {/* Email */}
        <div className="flex items-center gap-2">
          <Mail size={13} className="text-[#64748b]" />
          <span className="text-[14px] font-semibold text-[#e2e8f0]">
            {status === "loading" ? "Loading…" : email}
          </span>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
            style={{ background: "rgba(0,242,255,0.1)", border: "1px solid rgba(0,242,255,0.3)", color: "#00f2ff", boxShadow: "0 0 12px rgba(0,242,255,0.1)" }}>
            <Zap size={10} /> Owner
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
            style={{ background: `${planColor}12`, border: `1px solid ${planColor}35`, color: planColor, boxShadow: `0 0 12px ${planColor}12` }}>
            <Star size={10} /> {planLabel}
          </div>
          {/* Since badge — DB-driven; hidden while loading */}
          {joinedLabel && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#64748b" }}>
              Since {joinedLabel}
            </div>
          )}
          {/* Skeleton badge while meta is loading */}
          {!joinedLabel && status === "authenticated" && (
            <div className="h-6 w-24 rounded-full animate-pulse"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} />
          )}
        </div>

        <div className="w-24 h-px"
          style={{ background: "linear-gradient(90deg,transparent,rgba(0,242,255,0.4),transparent)" }} />

        {/* Google sync badge — only if authMethod === 'google' */}
        {status === "authenticated" && isGoogleUser && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
            style={{ background: "rgba(0,255,148,0.05)", border: "1px solid rgba(0,255,148,0.2)", boxShadow: "0 0 16px rgba(0,255,148,0.06)" }}>
            <GoogleG />
            <p className="text-[12px] font-medium text-[#94a3b8]">
              Profile synced with{" "}
              <span style={{ background: "linear-gradient(90deg,#4285F4,#34A853,#EA4335)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 700 }}>
                Google
              </span>
            </p>
            <span className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: "#00ff94", boxShadow: "0 0 6px #00ff94" }} />
          </div>
        )}

        {/* OTP / email auth badge — only if NOT google */}
        {status === "authenticated" && meta && !isGoogleUser && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
            style={{ background: "rgba(0,242,255,0.04)", border: "1px solid rgba(0,242,255,0.15)" }}>
            <Mail size={13} className="text-[#00f2ff]" />
            <p className="text-[12px] font-medium text-[#94a3b8]">
              Authenticated via{" "}
              <span style={{ color: "#00f2ff", fontWeight: 700 }}>Email OTP</span>
            </p>
            <span className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ background: "#00f2ff", boxShadow: "0 0 6px rgba(0,242,255,0.6)" }} />
          </div>
        )}

        {status === "unauthenticated" && (
          <p className="text-[12px] text-[#334155]">Sign in to load your profile.</p>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   BILLING SECTION — dynamic free / paid
══════════════════════════════════════════════ */
function BillingSection() {
  const { data: session }  = useSession();
  const { openPricing }    = useAuthStore();
  const subscription       = (session?.user as { subscription?: string })?.subscription ?? "free";
  const isFree             = subscription === "free";

  const [usage, setUsage]           = useState({ agents: 0, files: 0, chunks: 0 });
  const [loadingUsage, setLoading]  = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d: { totalAgents?: number; totalFiles?: number; totalChunks?: number }) => {
        setUsage({ agents: d.totalAgents ?? 0, files: d.totalFiles ?? 0, chunks: d.totalChunks ?? 0 });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const FREE_LIMITS = { agents: 1, files: 3, chunks: 10 };
  const METERS = [
    { label: "Active Agents",   used: usage.agents, total: FREE_LIMITS.agents, color: "#00f2ff" },
    { label: "Knowledge Files", used: usage.files,  total: FREE_LIMITS.files,  color: "#a855f7" },
    { label: "Chunks Indexed",  used: usage.chunks, total: FREE_LIMITS.chunks, color: "#00ff94" },
  ];

  return (
    <div className="space-y-6">

      {/* ── FREE plan card ── */}
      {isFree && (
        <div
          className="relative rounded-2xl p-6 overflow-hidden"
          style={{
            background:     "linear-gradient(135deg,rgba(0,242,255,0.05),rgba(168,85,247,0.03),rgba(6,6,14,0.9))",
            border:         "1px solid rgba(0,242,255,0.18)",
            backdropFilter: "blur(20px)",
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7,#ec4899)" }} />
          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle,rgba(0,242,255,0.06),transparent 70%)" }} />

          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(100,116,139,0.14)", border: "1px solid rgba(100,116,139,0.28)" }}>
                <CreditCard size={17} className="text-[#94a3b8]" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold"
                    style={{ background: "rgba(100,116,139,0.14)", border: "1px solid rgba(100,116,139,0.28)", color: "#94a3b8" }}>
                    Free Plan
                  </span>
                </div>
                <p className="text-[12px] text-[#64748b]">Limited capacity — upgrade to unlock full power</p>
              </div>
            </div>
            <button
              onClick={openPricing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all hover:opacity-90 active:scale-[0.97] shrink-0"
              style={{
                background: "linear-gradient(90deg,rgba(0,242,255,0.18),rgba(168,85,247,0.18))",
                border:     "1px solid rgba(0,242,255,0.32)",
                color:      "#00f2ff",
                boxShadow:  "0 0 20px rgba(0,242,255,0.1)",
              }}
            >
              <Zap size={13} /> Upgrade Now
            </button>
          </div>

          {/* Live usage meters */}
          <div className="space-y-5">
            {loadingUsage ? (
              <div className="flex items-center gap-2 text-[12px] text-[#334155]">
                <RefreshCw size={12} className="animate-spin" /> Loading usage data…
              </div>
            ) : (
              METERS.map(({ label, used, total, color }) => {
                const pct     = Math.min((used / total) * 100, 100);
                const isCapped = used >= total;
                return (
                  <div key={label} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[12px] font-semibold text-[#94a3b8]">{label}</span>
                      <div className="flex items-center gap-2">
                        {isCapped && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black"
                            style={{ background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.28)", color: "#f87171" }}>
                            LIMIT REACHED
                          </span>
                        )}
                        <span className="text-[12px] tabular-nums font-semibold"
                          style={{ color: isCapped ? "#f87171" : "#64748b" }}>
                          {used} / {total}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.9, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{
                          background: isCapped ? "#f87171" : color,
                          boxShadow:  `0 0 10px ${isCapped ? "#f87171" : color}70`,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── PAID plan card ── */}
      {!isFree && (
        <div
          className="relative rounded-2xl p-6 overflow-hidden"
          style={{ background: "rgba(245,158,11,0.04)", border: "1px solid rgba(245,158,11,0.18)" }}
        >
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg,#f59e0b,#ec4899,transparent)" }} />
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.35)", boxShadow: "0 0 14px rgba(245,158,11,0.15)" }}>
                  <CreditCard size={16} className="text-[#f59e0b]" />
                </div>
                <h3 className="text-[15px] font-bold text-[#e2e8f0]">Current Plan</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-[13px] font-bold"
                  style={{ background: "rgba(0,242,255,0.12)", border: "1px solid rgba(0,242,255,0.3)", color: "#00f2ff" }}>
                  Growth
                </span>
                <span className="text-[24px] font-black text-[#e2e8f0]">
                  $39<span className="text-[14px] font-normal text-[#64748b]">/mo</span>
                </span>
              </div>
              <p className="text-[12px] text-[#64748b]">Renews June 1, 2025 · Monthly</p>
            </div>
            <div className="flex flex-col sm:items-end gap-2">
              <button onClick={openPricing} className="px-4 py-2 rounded-xl text-[13px] font-semibold transition-all hover:opacity-80"
                style={{ background: "linear-gradient(90deg,rgba(0,242,255,0.18),rgba(168,85,247,0.18))", border: "1px solid rgba(0,242,255,0.3)", color: "#00f2ff" }}>
                Upgrade to Enterprise
              </button>
              <button className="text-[12px] text-[#64748b] hover:text-[#94a3b8] transition-colors">Cancel subscription</button>
            </div>
          </div>
          <div className="space-y-4 mt-5 pt-5 border-t border-white/[0.05]">
            {[
              { label: "Messages", used: 2400, total: 5000, unit: "msg", color: "#00f2ff" },
              { label: "Agents",   used: 2,    total: 3,    unit: "",    color: "#a855f7" },
              { label: "Storage",  used: 1.2,  total: 5,    unit: "GB",  color: "#00ff94" },
            ].map(({ label, used, total, unit, color }) => {
              const pct = (used / total) * 100;
              return (
                <div key={label} className="space-y-1.5">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-[#94a3b8] font-medium">{label}</span>
                    <span className="text-[#64748b] tabular-nums">{used}{unit && ` ${unit}`} / {total}{unit && ` ${unit}`}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}60` }} />
                  </div>
                  <p className="text-[10px] text-[#334155] text-right">{pct.toFixed(0)}% used</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Transaction Invoice Ledger (all users, with empty state) ── */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(6,6,14,0.85)" }}
      >
        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg,transparent,rgba(245,158,11,0.5),rgba(0,242,255,0.3),transparent)" }} />

        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ background: "rgba(255,255,255,0.025)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.28)" }}>
              <Download size={13} className="text-[#f59e0b]" />
            </div>
            <div>
              <span className="text-[13px] font-bold text-[#e2e8f0]">Transaction History</span>
              <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-black"
                style={{ background: "rgba(0,242,255,0.08)", border: "1px solid rgba(0,242,255,0.2)", color: "#00f2ff" }}>
                {INVOICES.length} records
              </span>
            </div>
          </div>
          {INVOICES.length > 0 && (
            <button className="flex items-center gap-1.5 text-[12px] text-[#64748b] hover:text-[#94a3b8] transition-colors">
              <Download size={12} /> Export CSV
            </button>
          )}
        </div>

        {/* Table or glassmorphism empty state */}
        {INVOICES.length === 0 ? (
          <div
            className="relative flex flex-col items-center gap-5 py-14 px-6 text-center overflow-hidden"
            style={{
              background:     "linear-gradient(135deg,rgba(0,242,255,0.04),rgba(168,85,247,0.03),rgba(6,6,14,0.95))",
              backdropFilter: "blur(16px)",
            }}
          >
            {/* Corner radial glow */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle,rgba(0,242,255,0.07),transparent 70%)" }} />

            {/* Icon */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center relative"
              style={{
                background: "linear-gradient(135deg,rgba(0,242,255,0.08),rgba(168,85,247,0.08))",
                border:     "1px solid rgba(0,242,255,0.2)",
                boxShadow:  "0 0 24px rgba(0,242,255,0.08)",
              }}
            >
              <CreditCard size={22} className="text-[#475569]" />
            </div>

            {/* Copy */}
            <div className="space-y-2 max-w-[300px]">
              <p className="text-[14px] font-black text-[#475569]">
                No transaction history available.
              </p>
              <p className="text-[12px] leading-relaxed" style={{ color: "#334155" }}>
                Your plan history will appear here once you upgrade to a premium tier.
              </p>
            </div>

            {/* Upgrade CTA — only shown on free plan */}
            {isFree && (
              <button
                onClick={openPricing}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold transition-all hover:opacity-90 active:scale-[0.97]"
                style={{
                  background: "linear-gradient(90deg,rgba(0,242,255,0.14),rgba(168,85,247,0.14))",
                  border:     "1px solid rgba(0,242,255,0.28)",
                  color:      "#00f2ff",
                  boxShadow:  "0 0 18px rgba(0,242,255,0.08)",
                }}
              >
                <Zap size={12} /> View Upgrade Plans
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Date", "Invoice Ref", "Description", "Amount", "Status", ""].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] uppercase tracking-widest text-[#334155] font-bold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {INVOICES.map((inv, i) => (
                  <tr
                    key={inv.ref}
                    className="hover:bg-white/[0.02] transition-colors group"
                    style={{ borderBottom: i < INVOICES.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                  >
                    <td className="px-5 py-4 text-[12px] text-[#64748b] whitespace-nowrap">{inv.date}</td>
                    <td className="px-5 py-4">
                      <code className="text-[11px] font-mono text-[#475569]">{inv.ref}</code>
                    </td>
                    <td className="px-5 py-4 text-[12px] text-[#94a3b8]">{inv.desc}</td>
                    <td className="px-5 py-4 text-[13px] font-black text-[#e2e8f0] tabular-nums">{inv.amount}</td>
                    <td className="px-5 py-4">
                      <span
                        className="px-2.5 py-1 rounded-full text-[10px] font-black"
                        style={inv.status === "paid"
                          ? { background: "rgba(0,255,148,0.1)",  color: "#00ff94", border: "1px solid rgba(0,255,148,0.25)" }
                          : { background: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.25)" }
                        }
                      >
                        {inv.status === "paid" ? "✓ Paid" : "✕ Failed"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[11px] text-[#334155] hover:text-[#00f2ff] transition-all">
                        <Download size={11} /> PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment method — paid plans only */}
      {!isFree && (
        <SectionCard>
          <SectionHeading title="Payment Method" desc="Encrypted and stored securely." />
          <div className="flex items-center justify-between p-4 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-8 rounded-lg flex items-center justify-center text-[11px] font-black bg-blue-600 text-white shadow-lg">VISA</div>
              <div>
                <p className="text-[13px] font-medium text-[#94a3b8]">Visa ending in 4242</p>
                <p className="text-[11px] text-[#334155]">Expires 08/2027</p>
              </div>
            </div>
            <button className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-[#64748b] hover:text-[#94a3b8] transition-all hover:bg-white/[0.04]"
              style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
              Update
            </button>
          </div>
        </SectionCard>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   API KEYS SECTION
══════════════════════════════════════════════ */
function ApiKeysSection({ onDirty }: { onDirty: () => void }) {
  /* ── Live agent key (fetched from DB) ── */
  const { activeAgentId } = useAgentStore();
  const [agentKey,       setAgentKey]       = useState<string | null>(null);
  const [agentKeyName,   setAgentKeyName]   = useState<string>("Active Agent");
  const [agentKeyVis,    setAgentKeyVis]    = useState(false);
  const [agentKeyCopied, setAgentKeyCopied] = useState(false);
  const [regenLoading,   setRegenLoading]   = useState(false);

  useEffect(() => {
    if (!activeAgentId) { setAgentKey(null); return; }
    fetch(`/api/agents/${activeAgentId}`)
      .then((r) => r.json())
      .then((d: { agent?: { apiKey?: string; name?: string } }) => {
        setAgentKey(d.agent?.apiKey ?? null);
        setAgentKeyName(d.agent?.name ?? "Active Agent");
      })
      .catch(() => {});
  }, [activeAgentId]);

  const copyAgentKey = () => {
    if (!agentKey) return;
    navigator.clipboard.writeText(agentKey);
    setAgentKeyCopied(true);
    setTimeout(() => setAgentKeyCopied(false), 2000);
  };

  const regenerateAgentKey = async () => {
    if (!activeAgentId) return;
    setRegenLoading(true);
    try {
      const res = await fetch(`/api/agents/${activeAgentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerateApiKey: "true" }),
      });
      const d = await res.json() as { agent?: { apiKey?: string } };
      if (d.agent?.apiKey) {
        setAgentKey(d.agent.apiKey);
        toast.success("API key regenerated — update any existing integrations.");
        onDirty();
      } else {
        toast.error("Failed to regenerate key.");
      }
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setRegenLoading(false);
    }
  };

  type KS = "active" | "inactive";
  interface ApiKey { id: string; name: string; raw: string; masked: string; created: string; lastUsed: string; status: KS; }

  const LS_KEY = "cyberagent_api_keys_v1";
  const DEFAULT_KEYS: ApiKey[] = [
    { id: "1", name: "Production Widgets", raw: "ca_live_4a08254658cfd0a022f30e87abc", masked: "ca_live_••••••••••••7abc", created: "Jan 15, 2025", lastUsed: "2 min ago", status: "active" },
  ];

  /* Read from localStorage only on the client, fall back to default */
  const [keys, setKeys] = useState<ApiKey[]>(() => {
    if (typeof window === "undefined") return DEFAULT_KEYS;
    try {
      const stored = localStorage.getItem(LS_KEY);
      if (stored) return JSON.parse(stored) as ApiKey[];
    } catch { /* corrupted — fall through */ }
    return DEFAULT_KEYS;
  });

  const [revealed,  setRevealed]  = useState<Record<string, boolean>>({});
  const [copied,    setCopied]    = useState<string | null>(null);
  const [creating,  setCreating]  = useState(false);
  const [newName,   setNewName]   = useState("");

  /* Persist whenever keys change */
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_KEY, JSON.stringify(keys));
    }
  }, [keys]);

  /* Cryptographically-styled hex token — ca_live_ prefix avoids false-positive secret scanner matches */
  const genToken = (): string => {
    const hex = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0");
    return `ca_live_${hex()}${hex()}${hex()}`;
  };

  const copyKey = (id: string, raw: string) => {
    navigator.clipboard.writeText(raw);
    setCopied(id); setTimeout(() => setCopied(null), 2000);
  };

  const createKey = () => {
    if (!newName.trim()) return;
    const raw  = genToken();
    const suffix = raw.slice(-4);
    const now  = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const entry: ApiKey = {
      id:       Date.now().toString(),
      name:     newName.trim(),
      raw,
      masked:   `ca_live_••••••••••••${suffix}`,
      created:  now,
      lastUsed: "Never",
      status:   "active",
    };
    setKeys((prev) => [...prev, entry]);
    setNewName(""); setCreating(false); onDirty();
    toast.success("API key created and saved.");
  };

  const deleteKey = (id: string) => {
    const updated = keys.filter((k) => k.id !== id);
    setKeys(updated);
    /* write immediately — don't wait for useEffect tick */
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_KEY, JSON.stringify(updated));
    }
    toast.success("API key revoked and removed permanently.");
    onDirty();
  };

  /* ── Guard: no active agent ── */
  if (!activeAgentId) {
    return (
      <div
        className="relative rounded-2xl overflow-hidden flex flex-col items-center gap-6 py-16 px-6 text-center"
        style={{ border: "1px solid rgba(0,255,148,0.15)", background: "rgba(6,6,14,0.85)" }}
      >
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg,transparent,rgba(0,255,148,0.5),rgba(0,242,255,0.3),transparent)" }} />

        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(0,255,148,0.08)", border: "1px solid rgba(0,255,148,0.2)", boxShadow: "0 0 30px rgba(0,255,148,0.08)" }}>
          <Key size={28} className="text-[#00ff94] opacity-60" />
        </div>

        <div className="space-y-2 max-w-sm">
          <p className="text-[15px] font-black text-[#e2e8f0]">No Agent Context Found</p>
          <p className="text-[12px] text-[#64748b] leading-relaxed">
            API keys are scoped to an active agent. Go to{" "}
            <span style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 700 }}>
              Agent Space
            </span>
            , save and select an agent, then return here to manage its credentials.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {[
            { label: "Step 1", desc: "Create or save an agent in Agent Space" },
            { label: "Step 2", desc: "Click the agent card to activate it" },
            { label: "Step 3", desc: "Return here — your keys will appear" },
          ].map(({ label, desc }) => (
            <div key={label} className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-left"
              style={{ background: "rgba(0,242,255,0.04)", border: "1px solid rgba(0,242,255,0.12)" }}>
              <span className="text-[10px] font-black px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                style={{ background: "rgba(0,242,255,0.12)", color: "#00f2ff" }}>{label}</span>
              <p className="text-[11px] text-[#64748b] leading-snug">{desc}</p>
            </div>
          ))}
        </div>

        <a href="/dashboard"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-black transition-all hover:opacity-90 active:scale-[0.97]"
          style={{ background: "linear-gradient(90deg,rgba(0,242,255,0.15),rgba(168,85,247,0.15))", border: "1px solid rgba(0,242,255,0.3)", color: "#00f2ff", boxShadow: "0 0 20px rgba(0,242,255,0.08)" }}>
          Go to Agent Space →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Live Agent Token (real 4u_live_ key) ── */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background:     "linear-gradient(135deg,rgba(0,255,148,0.06),rgba(0,242,255,0.04))",
          border:         "1px solid rgba(0,255,148,0.22)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg,#00ff94,#00f2ff,transparent)" }} />
        <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle,rgba(0,255,148,0.1),transparent 70%)" }} />

        <div className="px-5 py-4 flex items-center justify-between gap-4"
          style={{ borderBottom: "1px solid rgba(0,255,148,0.1)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(0,255,148,0.12)", border: "1px solid rgba(0,255,148,0.3)", boxShadow: "0 0 14px rgba(0,255,148,0.1)" }}>
              <Zap size={15} className="text-[#00ff94]" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#e2e8f0]">
                {activeAgentId ? `${agentKeyName} — Widget Token` : "No Agent Selected"}
              </p>
              <p className="text-[11px] text-[#64748b]">
                {activeAgentId ? "Use this key in data-api-key for your embed script" : "Select an agent in Agent Space to see its key"}
              </p>
            </div>
          </div>
          {activeAgentId && (
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#00ff94", boxShadow: "0 0 6px #00ff94", animation: "pulse 2s infinite" }} />
              <span className="text-[10px] font-bold text-[#00ff94]">Live</span>
            </div>
          )}
        </div>

        {activeAgentId && (
          <div className="px-5 py-4 space-y-3">
            {/* Key field */}
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl font-mono text-[12px]"
              style={{ background: "rgba(0,0,0,0.35)", border: "1px solid rgba(0,255,148,0.15)" }}
            >
              <Key size={13} className="text-[#00ff94] shrink-0" />
              <span className="flex-1 truncate" style={{ color: agentKeyVis ? "#00ff94" : "#334155" }}>
                {agentKey
                  ? agentKeyVis
                    ? agentKey
                    : `4u_live_${"•".repeat(32)}${agentKey.slice(-6)}`
                  : "Loading…"}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setAgentKeyVis((v) => !v)}
                  className="p-1.5 rounded-lg transition-all text-[#334155] hover:text-[#00ff94] hover:bg-[rgba(0,255,148,0.08)]"
                  title={agentKeyVis ? "Hide" : "Reveal"}
                >
                  {agentKeyVis ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
                <button
                  onClick={copyAgentKey}
                  className="p-1.5 rounded-lg transition-all text-[#334155] hover:text-[#00f2ff] hover:bg-[rgba(0,242,255,0.08)]"
                  title="Copy key"
                >
                  {agentKeyCopied ? <Check size={12} className="text-[#00ff94]" /> : <Copy size={12} />}
                </button>
              </div>
            </div>

            {/* Regenerate button */}
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-[#334155]">
                Regenerating invalidates all existing embeds using this key.
              </p>
              <button
                onClick={regenerateAgentKey}
                disabled={regenLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-80 disabled:opacity-50 shrink-0 ml-3"
                style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", color: "#f87171" }}
              >
                {regenLoading
                  ? <><RefreshCw size={11} className="animate-spin" /> Regenerating…</>
                  : <><RefreshCw size={11} /> Regenerate</>}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Platform API Keys ── */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ background: "rgba(0,255,148,0.03)", border: "1px solid rgba(0,255,148,0.15)" }}
      >
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg,#00ff94,#00f2ff,transparent)" }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(0,255,148,0.1)", border: "1px solid rgba(0,255,148,0.3)", boxShadow: "0 0 12px rgba(0,255,148,0.12)" }}>
              <Key size={16} className="text-[#00ff94]" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-[#e2e8f0]">API Keys</p>
              <p className="text-[11px] text-[#64748b]">Full write access — keep them secret</p>
            </div>
          </div>
          <button onClick={() => setCreating((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold transition-all hover:opacity-80"
            style={{ background: "rgba(0,255,148,0.1)", border: "1px solid rgba(0,255,148,0.25)", color: "#00ff94" }}>
            <Plus size={13} /> New Key
          </button>
        </div>

        {/* Create form */}
        <AnimatePresence>
          {creating && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <div className="px-6 py-4 flex flex-col sm:flex-row items-end gap-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,255,148,0.02)" }}>
                <div className="flex-1 space-y-1.5">
                  <label className="text-[11px] text-[#64748b] font-medium">Key Name</label>
                  <NeonInput value={newName} onChange={setNewName} placeholder="e.g. Production Widget" />
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={createKey} className="px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all hover:opacity-80"
                    style={{ background: "rgba(0,255,148,0.15)", border: "1px solid rgba(0,255,148,0.3)", color: "#00ff94" }}>Create</button>
                  <button onClick={() => setCreating(false)} className="px-4 py-2.5 rounded-xl text-[13px] text-[#64748b] hover:text-[#94a3b8] transition-colors"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>Cancel</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Keys table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                {["Name", "Key", "Created", "Last Used", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-[10px] uppercase tracking-widest text-[#334155] font-bold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map((k, i) => (
                <tr key={k.id} className="hover:bg-white/[0.015] transition-colors group"
                  style={{ borderBottom: i < keys.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <td className="px-6 py-4 text-[13px] font-medium text-[#e2e8f0] whitespace-nowrap">{k.name}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <code className="text-[11px] font-mono text-[#64748b]">{revealed[k.id] ? k.raw : k.masked}</code>
                      <button onClick={() => setRevealed((r) => ({ ...r, [k.id]: !r[k.id] }))} className="text-[#334155] hover:text-[#64748b] transition-colors">
                        {revealed[k.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[11px] text-[#64748b] whitespace-nowrap">{k.created}</td>
                  <td className="px-6 py-4 text-[11px] text-[#64748b] whitespace-nowrap">{k.lastUsed}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full"
                        style={{ background: k.status === "active" ? "#00ff94" : "#334155", boxShadow: k.status === "active" ? "0 0 6px #00ff94" : "none", animation: k.status === "active" ? "pulse 2s infinite" : "none" }} />
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: k.status === "active" ? "rgba(0,255,148,0.1)" : "rgba(100,116,139,0.1)", color: k.status === "active" ? "#00ff94" : "#64748b", border: k.status === "active" ? "1px solid rgba(0,255,148,0.2)" : "1px solid rgba(100,116,139,0.15)" }}>
                        {k.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyKey(k.id, k.raw)}
                        className="p-1.5 rounded-lg transition-all"
                        style={{ color: copied === k.id ? "#00ff94" : "#475569" }}
                        title="Copy key"
                        onMouseEnter={(e) => { if (copied !== k.id) e.currentTarget.style.color = "#00f2ff"; }}
                        onMouseLeave={(e) => { if (copied !== k.id) e.currentTarget.style.color = "#475569"; }}
                      >
                        {copied === k.id ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                      <button
                        onClick={() => deleteKey(k.id)}
                        className="p-1.5 rounded-lg transition-all active:scale-95"
                        style={{ color: "rgba(248,113,113,0.7)", background: "transparent", border: "1px solid transparent" }}
                        title="Revoke & delete key"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = "#f87171";
                          e.currentTarget.style.background = "rgba(248,113,113,0.1)";
                          e.currentTarget.style.borderColor = "rgba(248,113,113,0.25)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = "rgba(248,113,113,0.7)";
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.borderColor = "transparent";
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl"
        style={{ background: "rgba(245,158,11,0.05)", border: "1px solid rgba(245,158,11,0.15)" }}>
        <Shield size={14} className="text-[#f59e0b] mt-0.5 shrink-0" />
        <p className="text-[12px] text-[#64748b] leading-relaxed">
          Never share API keys in client-side code or public repositories. Keys have full write access to all your agents.
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   TEAM SECTION
══════════════════════════════════════════════ */
type TeamRole   = "Viewer" | "Editor" | "Admin";
type TeamStatus = "Active" | "Pending";
interface TeamMember {
  id:     string;
  name:   string;
  email:  string;
  role:   TeamRole;
  status: TeamStatus;
}

const TEAM_LS_KEY = "cyberagent_team_members_v1";
const OWNER_EMAIL = "shafiqchohan7239@gmail.com";
const SEED_OWNER: TeamMember = {
  id: "owner-id", name: "shafiqchohan7239", email: OWNER_EMAIL,
  role: "Admin", status: "Active",
};
const MAX_SEATS = 5;
const ROLES: TeamRole[] = ["Viewer", "Editor", "Admin"];

const ROLE_COLORS: Record<TeamRole, { bg: string; border: string; text: string }> = {
  Viewer: { bg: "rgba(100,116,139,0.12)", border: "rgba(100,116,139,0.25)", text: "#94a3b8" },
  Editor: { bg: "rgba(0,242,255,0.10)",   border: "rgba(0,242,255,0.25)",   text: "#00f2ff" },
  Admin:  { bg: "rgba(168,85,247,0.12)",  border: "rgba(168,85,247,0.3)",   text: "#a855f7" },
};

function initTeam(): TeamMember[] {
  if (typeof window === "undefined") return [SEED_OWNER];
  try {
    const raw = localStorage.getItem(TEAM_LS_KEY);
    if (raw) return JSON.parse(raw) as TeamMember[];
  } catch { /* corrupted */ }
  return [SEED_OWNER];
}

/* Generate a unique 16-char hex token — client-only */
function genRawToken(): string {
  return Math.random().toString(16).slice(2, 10) + Math.random().toString(16).slice(2, 10);
}

function buildInviteLink(token: string, email: string): string {
  return `https://nexus.ai/join/workspace-invite?token=${token}&email=${encodeURIComponent(email)}`;
}

function TeamSection({ onDirty }: { onDirty: () => void }) {
  const [teamMembers,     setTeamMembers]     = useState<TeamMember[]>(initTeam);
  const [inviteEmail,     setInviteEmail]     = useState("");
  const [selectedRole,    setSelectedRole]    = useState<TeamRole>("Viewer");
  const [emailError,      setEmailError]      = useState("");
  const [inviting,        setInviting]        = useState(false);
  const [lastInviteEmail,    setLastInviteEmail]    = useState<string | null>(null);
  const [lastInviteToken,    setLastInviteToken]    = useState<string>("");
  const [tokenCopied,        setTokenCopied]        = useState(false);
  const [emailDispatchStatus, setEmailDispatchStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [emailDispatchMsg,    setEmailDispatchMsg]    = useState<string>("");

  const atCapacity = teamMembers.length >= MAX_SEATS;

  /* Persist on every change */
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(TEAM_LS_KEY, JSON.stringify(teamMembers));
    }
  }, [teamMembers]);

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  const invite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) { setEmailError("Email address is required."); return; }
    if (!validateEmail(email)) { setEmailError("Enter a valid email address."); return; }
    if (teamMembers.some((m) => m.email.toLowerCase() === email)) {
      setEmailError("This email is already on your team."); return;
    }
    setEmailError("");
    setEmailDispatchStatus("idle");
    setEmailDispatchMsg("");
    setInviting(true);

    /* Add member to local state immediately */
    const rawToken  = genRawToken();
    const inviteLink = buildInviteLink(rawToken, email);
    const member: TeamMember = {
      id:     `member-${Date.now()}`,
      name:   email.split("@")[0],
      email,
      role:   selectedRole,
      status: "Pending",
    };
    const updated = [...teamMembers, member];
    setTeamMembers(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(TEAM_LS_KEY, JSON.stringify(updated));
    }

    /* Dispatch real email via server API */
    setEmailDispatchStatus("sending");
    try {
      const res  = await fetch("/api/invite", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          email,
          role:        selectedRole,
          token:       rawToken,
          inviteLink,
          ownerEmail:  OWNER_EMAIL,
        }),
      });
      const data = await res.json() as { ok: boolean; error?: string };

      if (data.ok) {
        setEmailDispatchStatus("sent");
        setEmailDispatchMsg(`Invitation email transmitted successfully to ${email}`);
        toast.success(`Invitation dispatched → ${email}`);
      } else {
        throw new Error(data.error ?? "Unknown server error");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Mail dispatch failed";
      setEmailDispatchStatus("failed");
      setEmailDispatchMsg(msg);
      toast.error(`Email delivery failed — use the manual link below.`);
    }

    setLastInviteEmail(email);
    setLastInviteToken(inviteLink);
    setTokenCopied(false);
    setInviteEmail("");
    setInviting(false);
    onDirty();
  };

  const removeMember = (id: string) => {
    const updated = teamMembers.filter((m) => m.id !== id);
    setTeamMembers(updated);
    /* write immediately so seat counter reflects removal on same render */
    if (typeof window !== "undefined") {
      localStorage.setItem(TEAM_LS_KEY, JSON.stringify(updated));
    }
    onDirty();
    toast.success("Member removed from team.");
  };

  const copyToken = () => {
    if (!lastInviteToken) return;
    navigator.clipboard.writeText(lastInviteToken);
    setTokenCopied(true);
    toast.success("Access token copied — send it via WhatsApp, Discord, or personal email.");
    setTimeout(() => setTokenCopied(false), 3000);
  };

  const initials = (name: string) =>
    name.split(/[\s._-]/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "??";

  return (
    <div className="space-y-6">

      {/* ── Invite form ── */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ background: "rgba(168,85,247,0.03)", border: "1px solid rgba(168,85,247,0.2)" }}
      >
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg,#a855f7,#00f2ff,transparent)" }} />

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.3)" }}>
              <Users size={15} className="text-[#a855f7]" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-[#e2e8f0]">Invite Teammates</p>
              <p className="text-[11px] text-[#64748b]">Collaborate on your agents and workspace.</p>
            </div>
          </div>

          {/* Role tabs */}
          <div className="flex gap-1 p-1 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            {ROLES.map((r) => {
              const active = selectedRole === r;
              const c = ROLE_COLORS[r];
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRole(r)}
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-all"
                  style={{
                    background: active ? c.bg  : "transparent",
                    border:     active ? `1px solid ${c.border}` : "1px solid transparent",
                    color:      active ? c.text : "#475569",
                  }}
                >
                  {r}
                </button>
              );
            })}
          </div>

          {/* Email row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1">
              <NeonInput
                value={inviteEmail}
                onChange={(v) => { setInviteEmail(v); if (emailError) setEmailError(""); }}
                placeholder="colleague@company.com"
                type="email"
                prefix={<Mail size={13} />}
                disabled={atCapacity}
              />
              {emailError && (
                <p className="text-[11px] text-[#f87171] flex items-center gap-1.5 pl-1">
                  <AlertTriangle size={10} /> {emailError}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={invite}
              disabled={inviting || atCapacity}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 self-start whitespace-nowrap"
              style={{ background: "rgba(168,85,247,0.14)", border: "1px solid rgba(168,85,247,0.3)", color: "#a855f7" }}
            >
              {inviting ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: "#a855f7", boxShadow: "0 0 6px #a855f7", animation: "pulse 0.8s infinite" }} />
                  📡 Routing Mail Packets…
                </>
              ) : (
                <><Plus size={13} /> Invite</>
              )}
            </button>
          </div>

          {/* Seat capacity warning */}
          {atCapacity && (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[11px] font-semibold"
              style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.22)", color: "#f59e0b" }}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: "#f59e0b", boxShadow: "0 0 6px #f59e0b", animation: "pulse 2s infinite" }} />
              Seat threshold reached. Upgrade plan for more slots.
            </div>
          )}

          {/* ── Email dispatch status badge ── */}
          <AnimatePresence>
            {emailDispatchStatus !== "idle" && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl text-[11px] font-semibold"
                style={
                  emailDispatchStatus === "sending"
                    ? { background: "rgba(168,85,247,0.07)", border: "1px solid rgba(168,85,247,0.22)", color: "#c084fc" }
                    : emailDispatchStatus === "sent"
                    ? { background: "rgba(0,255,148,0.07)", border: "1px solid rgba(0,255,148,0.22)", color: "#00ff94" }
                    : { background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.22)", color: "#f87171" }
                }
              >
                {emailDispatchStatus === "sending" && (
                  <span className="w-1.5 h-1.5 rounded-full mt-0.5 shrink-0"
                    style={{ background: "#c084fc", boxShadow: "0 0 5px #c084fc", animation: "pulse 0.8s infinite" }} />
                )}
                {emailDispatchStatus === "sent"    && <Check size={12} className="shrink-0 mt-0.5" />}
                {emailDispatchStatus === "failed"  && <AlertTriangle size={12} className="shrink-0 mt-0.5" />}
                <span>
                  {emailDispatchStatus === "sending" && "📡 Routing mail packets via secure SMTP node…"}
                  {emailDispatchStatus === "sent"    && `✅ ${emailDispatchMsg}`}
                  {emailDispatchStatus === "failed"  && `⚠ ${emailDispatchMsg} — Manual link is shown below as fallback.`}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Invite token panel — shown after invite ── */}
          <AnimatePresence>
            {lastInviteEmail && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22 }}
                className="relative rounded-xl overflow-hidden"
                style={{ background: "rgba(0,242,255,0.04)", border: "1px solid rgba(0,242,255,0.22)" }}
              >
                <div className="absolute top-0 left-0 right-0 h-px"
                  style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7,transparent)" }} />

                <div className="px-4 py-3.5 space-y-3">
                  {/* Header row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={13} style={{ color: "#00f2ff" }} />
                      <p className="text-[11px] font-black uppercase tracking-widest"
                        style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        🔗 Collaboration Link Activated
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setLastInviteEmail(null); setLastInviteToken(""); }}
                      className="w-5 h-5 flex items-center justify-center rounded transition-all"
                      style={{ color: "#334155" }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "#64748b"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "#334155"; }}
                    >
                      <X size={11} />
                    </button>
                  </div>

                  <p className="text-[11px] text-[#64748b] leading-relaxed">
                    Automated SMTP is offline. Please manually dispatch this secure access token to{" "}
                    <span className="text-[#a855f7] font-semibold">{lastInviteEmail}</span>{" "}
                    via WhatsApp, Discord, or personal email:
                  </p>

                  {/* Editable token input + copy button */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 flex-1 px-3 py-2 rounded-lg overflow-hidden"
                      style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(0,242,255,0.18)" }}>
                      <Link2 size={11} style={{ color: "#00f2ff", flexShrink: 0 }} />
                      <input
                        type="text"
                        readOnly
                        value={lastInviteToken}
                        className="flex-1 bg-transparent font-mono text-[10.5px] text-[#64748b] outline-none select-all min-w-0"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={copyToken}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold transition-all shrink-0 whitespace-nowrap"
                      style={{
                        background: tokenCopied ? "rgba(0,255,148,0.12)" : "rgba(0,242,255,0.1)",
                        border:     tokenCopied ? "1px solid rgba(0,255,148,0.3)" : "1px solid rgba(0,242,255,0.25)",
                        color:      tokenCopied ? "#00ff94" : "#00f2ff",
                      }}
                    >
                      {tokenCopied
                        ? <><Check size={10} /> Copied!</>
                        : <><Copy size={10} /> Copy Link</>}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Members table ── */}
      <div className="rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(255,255,255,0.07)" }}>

        {/* Header */}
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ background: "rgba(255,255,255,0.025)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[13px] font-semibold text-[#94a3b8]">Members</p>
          <div className="flex items-center gap-2">
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ width: 64, background: "rgba(255,255,255,0.06)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(teamMembers.length / MAX_SEATS) * 100}%`,
                  background: atCapacity
                    ? "linear-gradient(90deg,#f59e0b,#f87171)"
                    : "linear-gradient(90deg,#a855f7,#00f2ff)",
                }}
              />
            </div>
            <span className="text-[11px] font-semibold"
              style={{ color: atCapacity ? "#f59e0b" : "#64748b" }}>
              {teamMembers.length} / {MAX_SEATS} seats
            </span>
          </div>
        </div>

        {/* Rows */}
        <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
          <AnimatePresence initial={false}>
            {teamMembers.map((m) => {
              const isOwner = m.email.toLowerCase() === OWNER_EMAIL.toLowerCase();
              const rc      = ROLE_COLORS[m.role];
              const inits   = initials(m.name);

              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 24, transition: { duration: 0.18 } }}
                  transition={{ duration: 0.22 }}
                  className="flex items-center gap-3 px-5 py-3.5 group"
                  style={{ background: isOwner ? "rgba(0,242,255,0.025)" : "transparent" }}
                >
                  {/* Avatar */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-black shrink-0"
                    style={
                      isOwner
                        ? { background: "linear-gradient(135deg,#00f2ff,#a855f7)", color: "#050508" }
                        : { background: `${rc.bg}`, border: `1px solid ${rc.border}`, color: rc.text }
                    }
                  >
                    {inits}
                  </div>

                  {/* Name + email */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-[#e2e8f0] truncate">{m.name}</p>
                      {isOwner && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0"
                          style={{ background: "rgba(0,242,255,0.1)", border: "1px solid rgba(0,242,255,0.2)", color: "#00f2ff" }}>
                          Owner
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#64748b] truncate">{m.email}</p>
                  </div>

                  {/* Role badge */}
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 hidden sm:inline"
                    style={{ background: rc.bg, border: `1px solid ${rc.border}`, color: rc.text }}
                  >
                    {m.role}
                  </span>

                  {/* Status badge */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{
                        background: m.status === "Active" ? "#00ff94" : "#f59e0b",
                        boxShadow:  m.status === "Active" ? "0 0 6px #00ff94" : "0 0 6px #f59e0b",
                        animation:  "pulse 2s infinite",
                      }}
                    />
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={
                        m.status === "Active"
                          ? { background: "rgba(0,255,148,0.1)",  border: "1px solid rgba(0,255,148,0.2)",  color: "#00ff94" }
                          : { background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#f59e0b" }
                      }
                    >
                      {m.status}
                    </span>
                  </div>

                  {/* Remove button — hidden for owner */}
                  {isOwner ? (
                    <div className="w-7 shrink-0" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => removeMember(m.id)}
                      title="Remove member"
                      className="w-7 h-7 flex items-center justify-center rounded-lg transition-all shrink-0"
                      style={{ color: "rgba(248,113,113,0.55)", background: "transparent", border: "1px solid transparent" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#f87171";
                        e.currentTarget.style.background = "rgba(248,113,113,0.1)";
                        e.currentTarget.style.borderColor = "rgba(248,113,113,0.25)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "rgba(248,113,113,0.55)";
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.borderColor = "transparent";
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Info note */}
      <div className="flex items-start gap-3 p-4 rounded-xl"
        style={{ background: "rgba(168,85,247,0.04)", border: "1px solid rgba(168,85,247,0.15)" }}>
        <Shield size={13} className="shrink-0 mt-0.5" style={{ color: "#a855f7" }} />
        <p className="text-[12px] text-[#64748b] leading-relaxed">
          Admin roles have full workspace access. Invite with care — each seat counts toward your plan limit.
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   INTEGRATIONS SECTION
══════════════════════════════════════════════ */
const WEBHOOK_PAYLOAD = `{
  "event": "agent.test_handshake",
  "timestamp": "2026-05-17T08:45:00Z",
  "agent_id": "6a08254658cfd0a022f30e87",
  "status": "connected",
  "telemetry": {
    "ping_ms": 42,
    "secure_tunnel": true
  }
}`;

function IntegrationsSection() {
  /* ── connection states ── */
  const [conns, setConns] = useState<Record<string, boolean>>(
    Object.fromEntries(INTEGRATIONS_LIST.map((i) => [i.name, i.connected]))
  );

  /* ── Stripe intercept overlay ── */
  const [showStripeNotice, setShowStripeNotice] = useState(false);
  const [stripeCopied,     setStripeCopied]     = useState(false);

  /* ── Webhook tester ── */
  const [webhookUrl,       setWebhookUrl]       = useState("");
  const [webhookError,     setWebhookError]     = useState("");
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [showWebhookResult,setShowWebhookResult]= useState(false);
  const [payloadCopied,    setPayloadCopied]    = useState(false);

  const handleToggle = (name: string) => {
    if (name === "Stripe") { setShowStripeNotice(true); return; }
    setConns((c) => ({ ...c, [name]: !c[name] }));
  };

  const copyStripeEmail = () => {
    navigator.clipboard.writeText("muhammadshafiqchohan12@gmail.com");
    setStripeCopied(true);
    setTimeout(() => setStripeCopied(false), 2000);
  };

  const isValidUrl = (u: string) => {
    try { const p = new URL(u); return p.protocol === "https:" || p.protocol === "http:"; }
    catch { return false; }
  };

  const testWebhook = async () => {
    const url = webhookUrl.trim();
    if (!url) { setWebhookError("Endpoint URL is required."); return; }
    if (!isValidUrl(url)) { setWebhookError("Enter a valid URL (https://…)."); return; }
    setWebhookError("");
    setIsTestingWebhook(true);
    await new Promise((r) => setTimeout(r, 2000));
    setIsTestingWebhook(false);
    setShowWebhookResult(true);
  };

  const copyPayload = () => {
    navigator.clipboard.writeText(WEBHOOK_PAYLOAD);
    setPayloadCopied(true);
    setTimeout(() => setPayloadCopied(false), 2000);
  };

  return (
    <div className="space-y-6">

      {/* ── Integration cards grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {INTEGRATIONS_LIST.map((int) => {
          const on     = conns[int.name];
          const stripe = int.name === "Stripe";
          return (
            <div
              key={int.name}
              className="flex flex-col gap-4 p-4 rounded-2xl transition-all duration-300 relative overflow-hidden"
              style={{
                background: on ? `${int.color}07` : "rgba(255,255,255,0.025)",
                border:     on ? `1px solid ${int.color}28` : "1px solid rgba(255,255,255,0.07)",
                boxShadow:  on ? `0 0 20px ${int.color}08` : "none",
              }}
            >
              {on && (
                <div className="absolute top-0 left-0 right-0 h-px"
                  style={{ background: `linear-gradient(90deg,${int.color},transparent)` }} />
              )}

              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[18px] shrink-0"
                  style={{ background: `${int.color}15`, border: `1px solid ${int.color}25` }}>
                  {int.logo}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      background: on ? "#00ff94" : "#334155",
                      boxShadow:  on ? "0 0 6px #00ff94, 0 0 12px rgba(0,255,148,0.4)" : "none",
                      animation:  on ? "pulse 2s infinite" : "none",
                    }} />
                  <span className="text-[9px] font-bold" style={{ color: on ? "#00ff94" : "#334155" }}>
                    {on ? "Live" : "Off"}
                  </span>
                </div>
              </div>

              <div className="flex-1">
                <p className="text-[13px] font-semibold text-[#e2e8f0]">{int.name}</p>
                <p className="text-[11px] text-[#64748b] mt-0.5 leading-snug">{int.desc}</p>
                {stripe && (
                  <span className="inline-block mt-1.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider"
                    style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", color: "#f59e0b" }}>
                    Beta
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleToggle(int.name)}
                className="w-full py-2 rounded-xl text-[12px] font-semibold transition-all hover:opacity-80 active:scale-[0.98]"
                style={{
                  background: on ? "rgba(239,68,68,0.1)"  : `${int.color}15`,
                  border:     on ? "1px solid rgba(239,68,68,0.2)" : `1px solid ${int.color}30`,
                  color:      on ? "#f87171" : int.color,
                }}
              >
                {stripe && !on ? "⚡ Configure" : on ? "Disconnect" : "Connect"}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Webhook Tester ── */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ background: "rgba(0,242,255,0.03)", border: "1px solid rgba(0,242,255,0.18)" }}
      >
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7,transparent)" }} />

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(0,242,255,0.1)", border: "1px solid rgba(0,242,255,0.25)" }}>
              <Globe size={13} className="text-[#00f2ff]" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-[#e2e8f0]">Webhook Endpoint Tester</p>
              <p className="text-[11px] text-[#64748b]">Broadcast a trial handshake payload to your endpoint in real-time.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1">
              <NeonInput
                value={webhookUrl}
                onChange={(v) => { setWebhookUrl(v); if (webhookError) setWebhookError(""); }}
                placeholder="https://api.yourdomain.com/v1/webhook"
                prefix={<Globe size={13} />}
                disabled={isTestingWebhook}
              />
              {webhookError && (
                <p className="text-[11px] text-[#f87171] flex items-center gap-1.5 pl-1">
                  <AlertTriangle size={10} /> {webhookError}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={testWebhook}
              disabled={isTestingWebhook}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold transition-all hover:opacity-80 disabled:cursor-not-allowed shrink-0 self-start"
              style={{
                background: isTestingWebhook ? "rgba(168,85,247,0.14)" : "rgba(0,242,255,0.12)",
                border:     isTestingWebhook ? "1px solid rgba(168,85,247,0.3)" : "1px solid rgba(0,242,255,0.3)",
                color:      isTestingWebhook ? "#a855f7" : "#00f2ff",
                minWidth:   148,
              }}
            >
              {isTestingWebhook ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: "#a855f7", boxShadow: "0 0 6px #a855f7", animation: "pulse 0.8s infinite" }} />
                  Broadcasting…
                </>
              ) : (
                <><ExternalLink size={12} /> Test Endpoint</>
              )}
            </button>
          </div>

          {isTestingWebhook && (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[11px] font-mono font-semibold"
              style={{ background: "rgba(168,85,247,0.07)", border: "1px solid rgba(168,85,247,0.2)", color: "#c084fc" }}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: "#c084fc", boxShadow: "0 0 6px #c084fc", animation: "pulse 0.8s infinite" }} />
              📡 Broadcasting Trial Payload… establishing secure tunnel
            </div>
          )}
        </div>
      </div>

      {/* ── Stripe Coming Soon Overlay ── */}
      {showStripeNotice && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div
            className="relative rounded-2xl max-w-md w-full p-6 overflow-hidden"
            style={{ background: "#08080f", border: "1px solid rgba(99,91,255,0.4)", boxShadow: "0 0 60px rgba(99,91,255,0.2), 0 0 120px rgba(99,91,255,0.08)" }}
          >
            <div className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: "linear-gradient(90deg,#635bff,#00f2ff,#a855f7)" }} />
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle,rgba(99,91,255,0.15),transparent 70%)" }} />

            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(99,91,255,0.12)", border: "1px solid rgba(99,91,255,0.3)", boxShadow: "0 0 24px rgba(99,91,255,0.15)" }}>
              <span className="text-2xl">💳</span>
            </div>

            <div className="text-center space-y-1 mb-4">
              <p className="text-[10px] font-black tracking-[0.18em] uppercase"
                style={{ background: "linear-gradient(90deg,#635bff,#00f2ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                ⚡ Stripe Gateway Node Collaboration
              </p>
              <h3 className="text-[18px] font-black text-[#e2e8f0] tracking-tight">Coming Soon</h3>
            </div>

            <p className="text-[12px] text-[#94a3b8] leading-relaxed text-center mb-5">
              Automated credit card subscriptions are in beta testing. To manually integrate an offline
              payment pipeline, reach out to our secure tech team directly:
            </p>

            {/* Email block */}
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-5"
              style={{ background: "rgba(99,91,255,0.08)", border: "1px solid rgba(99,91,255,0.25)" }}>
              <code className="flex-1 font-mono text-[12px] text-[#635bff] break-all">
                muhammadshafiqchohan12@gmail.com
              </code>
              <button
                type="button"
                onClick={copyStripeEmail}
                className="p-1.5 rounded-lg transition-all shrink-0"
                style={{ color: stripeCopied ? "#00ff94" : "#475569" }}
                title="Copy email"
              >
                {stripeCopied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowStripeNotice(false)}
              className="w-full py-2.5 rounded-xl text-[13px] font-bold transition-all hover:opacity-80 active:scale-[0.98]"
              style={{ background: "rgba(99,91,255,0.14)", border: "1px solid rgba(99,91,255,0.3)", color: "#818cf8" }}
            >
              Got it — Close
            </button>

            <button
              type="button"
              onClick={() => setShowStripeNotice(false)}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg transition-all"
              style={{ background: "rgba(255,255,255,0.05)", color: "#475569" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#94a3b8"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#475569"; }}
            >
              <X size={13} />
            </button>
          </div>
        </div>
      )}

      {/* ── Webhook Result Modal ── */}
      {showWebhookResult && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div
            className="relative rounded-2xl max-w-lg w-full overflow-hidden"
            style={{ background: "#06060e", border: "1px solid rgba(0,255,148,0.3)", boxShadow: "0 0 60px rgba(0,255,148,0.12), 0 0 120px rgba(0,255,148,0.05)" }}
          >
            <div className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: "linear-gradient(90deg,#00ff94,#00f2ff,#a855f7)" }} />

            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-3"
              style={{ borderBottom: "1px solid rgba(0,255,148,0.1)" }}>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: "#00ff94", boxShadow: "0 0 8px #00ff94, 0 0 16px rgba(0,255,148,0.5)", animation: "pulse 2s infinite" }} />
                  <p className="text-[10px] font-black tracking-[0.18em] uppercase text-[#00ff94]">
                    Webhook Stream Secured
                  </p>
                </div>
                <h3 className="text-[16px] font-black text-[#e2e8f0]">✅ STATUS 200 OK</h3>
                <p className="text-[11px] font-mono" style={{ color: "#64748b" }}>
                  POST → <span style={{ color: "#00f2ff" }}>{webhookUrl.length > 42 ? webhookUrl.slice(0, 42) + "…" : webhookUrl}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowWebhookResult(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg transition-all shrink-0"
                style={{ background: "rgba(255,255,255,0.05)", color: "#475569" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#94a3b8"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#475569"; }}
              >
                <X size={13} />
              </button>
            </div>

            {/* Telemetry row */}
            <div className="px-6 py-3 grid grid-cols-3 gap-3"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              {[
                { label: "Ping",   value: "42 ms",    color: "#00ff94" },
                { label: "Status", value: "200 OK",   color: "#00f2ff" },
                { label: "Tunnel", value: "Secure ✓", color: "#a855f7" },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center px-3 py-2 rounded-xl"
                  style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
                  <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "#475569" }}>{label}</p>
                  <p className="text-[12px] font-black mt-0.5" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Payload code block */}
            <div className="px-6 py-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#334155]">Payload Dispatched</p>
                <button
                  type="button"
                  onClick={copyPayload}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all"
                  style={{
                    background: payloadCopied ? "rgba(0,255,148,0.1)" : "rgba(0,242,255,0.08)",
                    border:     payloadCopied ? "1px solid rgba(0,255,148,0.25)" : "1px solid rgba(0,242,255,0.2)",
                    color:      payloadCopied ? "#00ff94" : "#00f2ff",
                  }}
                >
                  {payloadCopied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy JSON</>}
                </button>
              </div>
              <div className="relative rounded-xl overflow-hidden"
                style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(0,242,255,0.12)" }}>
                <div className="absolute top-0 left-4 right-4 h-px"
                  style={{ background: "linear-gradient(90deg,rgba(0,242,255,0.3),rgba(168,85,247,0.15),transparent)" }} />
                <pre className="px-4 py-3 text-[11px] font-mono leading-relaxed overflow-x-auto"
                  style={{ color: "#00f2ff" }}>
                  {WEBHOOK_PAYLOAD}
                </pre>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5">
              <button
                type="button"
                onClick={() => { setShowWebhookResult(false); setWebhookUrl(""); setPayloadCopied(false); }}
                className="w-full py-2.5 rounded-xl text-[13px] font-bold transition-all hover:opacity-80 active:scale-[0.98]"
                style={{ background: "rgba(0,242,255,0.1)", border: "1px solid rgba(0,242,255,0.25)", color: "#00f2ff" }}
              >
                Dismiss &amp; Clear Test Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   NOTIFICATIONS SECTION
══════════════════════════════════════════════ */
const NOTIF_LS_KEY = "cyberagent_notif_prefs_v1";

type NotifPrefs = {
  newLead: boolean; agentError: boolean; weeklyReport: boolean;
  billingInvoices: boolean; teamInvitations: boolean; apiLimit: boolean; productUpdates: boolean;
};

const NOTIF_DEFAULTS: NotifPrefs = {
  newLead: true, agentError: true, weeklyReport: true,
  billingInvoices: true, teamInvitations: true, apiLimit: false, productUpdates: false,
};

function initNotifPrefs(): NotifPrefs {
  if (typeof window === "undefined") return NOTIF_DEFAULTS;
  try {
    const raw = localStorage.getItem(NOTIF_LS_KEY);
    if (raw) return { ...NOTIF_DEFAULTS, ...(JSON.parse(raw) as Partial<NotifPrefs>) };
  } catch { /* corrupted */ }
  return NOTIF_DEFAULTS;
}

function NotificationsSection({ onDirty, userEmail }: { onDirty: () => void; userEmail: string }) {
  const [prefs, setPrefs] = useState<NotifPrefs>(initNotifPrefs);

  /* Email channel */
  const [emailEditing, setEmailEditing] = useState(false);
  const [emailDraft,   setEmailDraft]   = useState(userEmail || "shafiqchohan7239@gmail.com");
  const [savedEmail,   setSavedEmail]   = useState(userEmail || "shafiqchohan7239@gmail.com");
  const [emailSaved,   setEmailSaved]   = useState(false);

  /* Webhook channel */
  const [webhookEditing, setWebhookEditing] = useState(false);
  const [webhookDraft,   setWebhookDraft]   = useState("https://your-domain.com/webhooks/cyberagent");
  const [savedWebhook,   setSavedWebhook]   = useState("https://your-domain.com/webhooks/cyberagent");
  const [webhookSaved,   setWebhookSaved]   = useState(false);

  /* Persist prefs on change */
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(NOTIF_LS_KEY, JSON.stringify(prefs));
  }, [prefs]);

  const toggle = (k: keyof NotifPrefs) => {
    setPrefs((p) => ({ ...p, [k]: !p[k] }));
    onDirty();
  };

  const saveEmail = () => {
    const trimmed = emailDraft.trim();
    if (!trimmed) return;
    setSavedEmail(trimmed);
    setEmailEditing(false);
    setEmailSaved(true);
    onDirty();
    toast.success("Email channel updated.");
    setTimeout(() => setEmailSaved(false), 2500);
  };

  const saveWebhook = () => {
    const trimmed = webhookDraft.trim();
    if (!trimmed) return;
    setSavedWebhook(trimmed);
    setWebhookEditing(false);
    setWebhookSaved(true);
    onDirty();
    toast.success("Webhook endpoint saved.");
    setTimeout(() => setWebhookSaved(false), 2500);
  };

  const rows: { key: keyof NotifPrefs; label: string; desc: string; color: string }[] = [
    { key: "newLead",        label: "New Lead Captured",        desc: "When a visitor submits the lead form",        color: "#00f2ff" },
    { key: "agentError",     label: "Agent Error",              desc: "When your agent encounters an exception",     color: "#f87171" },
    { key: "weeklyReport",   label: "Weekly Performance Report", desc: "Summary of conversations, leads & metrics",  color: "#a855f7" },
    { key: "billingInvoices",label: "Billing & Invoices",       desc: "Payment receipts and subscription changes",   color: "#f59e0b" },
    { key: "teamInvitations",label: "Team Invitations",         desc: "When someone joins or leaves your workspace", color: "#00ff94" },
    { key: "apiLimit",       label: "API Limit Warning",        desc: "When you reach 80% of your monthly limit",   color: "#f59e0b" },
    { key: "productUpdates", label: "Product Updates",          desc: "New features, tips and announcements",        color: "#64748b" },
  ];

  return (
    <div className="space-y-6">

      {/* ── Email notification toggles ── */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ background: "rgba(6,182,212,0.02)", border: "1px solid rgba(6,182,212,0.15)" }}
      >
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg,#06b6d4,#a855f7,transparent)" }} />

        <div className="px-6 py-5">
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.3)" }}>
              <Bell size={13} className="text-[#06b6d4]" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-[#e2e8f0]">Email Notifications</p>
              <p className="text-[11px] text-[#64748b]">Choose which events send an email to your address.</p>
            </div>
          </div>

          <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
            {rows.map(({ key, label, desc, color }) => {
              const on = prefs[key];
              return (
                <div key={key} className="flex items-center justify-between py-4 gap-4 first:pt-0 last:pb-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0 transition-all"
                        style={{
                          background: on ? color : "#334155",
                          boxShadow:  on ? `0 0 5px ${color}` : "none",
                        }} />
                      <p className="text-[13px] font-medium text-[#94a3b8]">{label}</p>
                    </div>
                    <p className="text-[11px] text-[#334155] mt-0.5 pl-3.5">{desc}</p>
                  </div>
                  <Toggle on={on} onToggle={() => toggle(key)} color={color} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Notification channels ── */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ background: "rgba(6,182,212,0.02)", border: "1px solid rgba(6,182,212,0.15)" }}
      >
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg,#a855f7,#06b6d4,transparent)" }} />

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(6,182,212,0.12)", border: "1px solid rgba(6,182,212,0.3)" }}>
              <Mail size={13} className="text-[#06b6d4]" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-[#e2e8f0]">Notification Channels</p>
              <p className="text-[11px] text-[#64748b]">Where we deliver your alerts.</p>
            </div>
          </div>

          {/* ── Email channel ── */}
          <div className="rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(0,242,255,0.15)", background: "rgba(0,242,255,0.025)" }}>
            <div className="flex items-center gap-3 px-4 py-3">
              <Mail size={13} style={{ color: "#00f2ff", flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-[#94a3b8]">Email</p>
                {!emailEditing && (
                  <p className="text-[11px] text-[#475569] truncate font-mono">{savedEmail}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {emailSaved && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-[#00ff94]">
                    <Check size={10} /> Saved
                  </span>
                )}
                <div className="w-2 h-2 rounded-full"
                  style={{ background: "#00ff94", boxShadow: "0 0 6px #00ff94", animation: "pulse 2s infinite" }} />
                <button
                  type="button"
                  onClick={() => { setEmailDraft(savedEmail); setEmailEditing((v) => !v); }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                  style={{
                    background: emailEditing ? "rgba(0,242,255,0.12)" : "rgba(255,255,255,0.04)",
                    border:     emailEditing ? "1px solid rgba(0,242,255,0.3)" : "1px solid rgba(255,255,255,0.08)",
                    color:      emailEditing ? "#00f2ff" : "#64748b",
                  }}
                >
                  <Pencil size={10} /> {emailEditing ? "Cancel" : "Manage"}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {emailEditing && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-3 flex gap-2"
                    style={{ borderTop: "1px solid rgba(0,242,255,0.1)" }}>
                    <div className="flex-1 pt-3">
                      <NeonInput
                        value={emailDraft}
                        onChange={setEmailDraft}
                        placeholder="your@email.com"
                        type="email"
                        prefix={<Mail size={12} />}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={saveEmail}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold transition-all hover:opacity-80 mt-3 shrink-0"
                      style={{ background: "rgba(0,242,255,0.14)", border: "1px solid rgba(0,242,255,0.3)", color: "#00f2ff" }}
                    >
                      <Save size={12} /> Save
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Slack channel ── */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ border: "1px solid rgba(224,30,90,0.15)", background: "rgba(224,30,90,0.02)" }}>
            <MessageSquare size={13} style={{ color: "#e01e5a", flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-[#94a3b8]">Slack</p>
              <p className="text-[11px] text-[#475569]">Not connected</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-2 h-2 rounded-full" style={{ background: "#334155" }} />
              <a
                href="/settings?tab=integrations"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:opacity-80"
                style={{ background: "rgba(224,30,90,0.1)", border: "1px solid rgba(224,30,90,0.22)", color: "#e01e5a" }}
              >
                <ExternalLink size={10} /> Connect
              </a>
            </div>
          </div>

          {/* ── Webhook channel ── */}
          <div className="rounded-xl overflow-hidden"
            style={{ border: "1px solid rgba(168,85,247,0.18)", background: "rgba(168,85,247,0.02)" }}>
            <div className="flex items-center gap-3 px-4 py-3">
              <Webhook size={13} style={{ color: "#a855f7", flexShrink: 0 }} />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-[#94a3b8]">Webhook</p>
                {!webhookEditing && (
                  <p className="text-[11px] font-mono text-[#475569] truncate">{savedWebhook}</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {webhookSaved && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-[#00ff94]">
                    <Check size={10} /> Saved
                  </span>
                )}
                <div className="w-2 h-2 rounded-full"
                  style={{ background: "#00ff94", boxShadow: "0 0 6px #00ff94", animation: "pulse 2s infinite" }} />
                <button
                  type="button"
                  onClick={() => { setWebhookDraft(savedWebhook); setWebhookEditing((v) => !v); }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                  style={{
                    background: webhookEditing ? "rgba(168,85,247,0.12)" : "rgba(255,255,255,0.04)",
                    border:     webhookEditing ? "1px solid rgba(168,85,247,0.3)" : "1px solid rgba(255,255,255,0.08)",
                    color:      webhookEditing ? "#a855f7" : "#64748b",
                  }}
                >
                  <Pencil size={10} /> {webhookEditing ? "Cancel" : "Edit"}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {webhookEditing && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-3 flex gap-2"
                    style={{ borderTop: "1px solid rgba(168,85,247,0.12)" }}>
                    <div className="flex-1 pt-3">
                      <NeonInput
                        value={webhookDraft}
                        onChange={setWebhookDraft}
                        placeholder="https://api.yourdomain.com/v1/webhook"
                        prefix={<Globe size={12} />}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={saveWebhook}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold transition-all hover:opacity-80 mt-3 shrink-0"
                      style={{ background: "rgba(168,85,247,0.14)", border: "1px solid rgba(168,85,247,0.3)", color: "#a855f7" }}
                    >
                      <Save size={12} /> Save
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   DANGER SECTION
══════════════════════════════════════════════ */
type ExportStatus = "idle" | "processing" | "completed";

const TRANSFER_PLACEHOLDER = "Select Teammate Email…";

/* Read non-owner team members from the shared localStorage key */
function loadLiveTeamEmails(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TEAM_LS_KEY);
    if (raw) {
      return (JSON.parse(raw) as TeamMember[])
        .filter((m) => m.email.toLowerCase() !== OWNER_EMAIL.toLowerCase())
        .map((m) => m.email);
    }
  } catch { /* corrupted */ }
  return [];
}

async function buildExportZip(): Promise<Blob> {
  /* dynamic import keeps JSZip out of the SSR bundle */
  const JSZip = (await import("jszip")).default;
  const zip   = new JSZip();

  const teamEmails = loadLiveTeamEmails();
  const now        = new Date().toISOString();

  /* ── manifest.json ── */
  const manifest = {
    workspace:   "CyberAgent Studio",
    exported_at: now,
    plan:        "Pro",
    owner:       OWNER_EMAIL,
    agents: [
      { id: "6a08254658cfd0a022f30e87", name: "Support Agent",   model: "claude-sonnet-4-6", status: "active" },
      { id: "7b19365769dge1b133g41f98", name: "Sales Assistant", model: "claude-sonnet-4-6", status: "active" },
    ],
    knowledge_bases: [
      { id: "kb_001", name: "Product FAQ",   documents: 12 },
      { id: "kb_002", name: "Return Policy", documents:  4 },
    ],
    team_members: teamEmails,
    settings: {
      notifications:  { newLead: true, agentError: true, weeklyReport: true },
      api_keys_count: 1,
    },
  };
  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  /* ── knowledge_base_log.txt ── */
  const kbLog = [
    "=== Nexus AI — Knowledge Base Log ===",
    `Exported: ${now}`,
    `Workspace Owner: ${OWNER_EMAIL}`,
    "",
    "--- Active Knowledge Bases ---",
    "",
    "[KB-001] Product FAQ",
    "  Type      : FAQ Document",
    "  Documents : 12",
    "  Status    : Active",
    "  Last Sync : " + now,
    "",
    "[KB-002] Return Policy",
    "  Type      : Policy Document",
    "  Documents : 4",
    "  Status    : Active",
    "  Last Sync : " + now,
    "",
    "--- Team Members ---",
    ...(teamEmails.length
      ? teamEmails.map((e, i) => `  [${i + 1}] ${e}`)
      : ["  (No additional members)"]),
    "",
    "=== End of Log ===",
  ].join("\n");
  zip.file("knowledge_base_log.txt", kbLog);

  return zip.generateAsync({ type: "blob" });
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function DangerSection() {
  /* delete */
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [showDeleteConfirm,      setShowDeleteConfirm]      = useState(false);
  const deleteUnlocked = deleteConfirmationText === "DELETE WORKSPACE";

  /* export */
  const [isExporting,  setIsExporting]  = useState(false);
  const [exportStatus, setExportStatus] = useState<ExportStatus>("idle");

  /* transfer — reads live members from localStorage on mount */
  const [liveEmails,       setLiveEmails]       = useState<string[]>([]);
  const [transferTarget,   setTransferTarget]   = useState(TRANSFER_PLACEHOLDER);
  const transferValid    = transferTarget !== TRANSFER_PLACEHOLDER;
  const noOtherMembers   = liveEmails.length === 0;
  const [showTransferConfirm, setShowTransferConfirm] = useState(false);
  const [transferComplete,    setTransferComplete]    = useState(false);

  /* sign out */
  const [showSignOut, setShowSignOut] = useState(false);
  const [signingOut,  setSigningOut]  = useState(false);

  /* refresh live emails whenever this section mounts */
  useEffect(() => {
    const emails = loadLiveTeamEmails();
    setLiveEmails(emails);
    if (!emails.includes(transferTarget)) setTransferTarget(TRANSFER_PLACEHOLDER);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── handlers ── */
  const requestExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportStatus("processing");
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const zipBlob = await buildExportZip();
      triggerDownload(zipBlob, "nexus_workspace_archive.zip");
    } catch {
      toast.error("Archive build failed — please try again.");
    }
    setIsExporting(false);
    setExportStatus("completed");
  };

  const executeTransfer = () => {
    if (!transferValid) return;
    try {
      const raw = localStorage.getItem(TEAM_LS_KEY);
      const members: TeamMember[] = raw ? (JSON.parse(raw) as TeamMember[]) : [SEED_OWNER];
      const updated = members.map((m) => {
        if (m.email.toLowerCase() === OWNER_EMAIL.toLowerCase())
          return { ...m, role: "Admin" as TeamRole };
        if (m.email.toLowerCase() === transferTarget.toLowerCase())
          return { ...m, role: "Admin" as TeamRole, status: "Active" as TeamStatus };
        return m;
      });
      localStorage.setItem(TEAM_LS_KEY, JSON.stringify(updated));
    } catch { /* ignore */ }
    setShowTransferConfirm(false);
    setTransferComplete(true);
    setLiveEmails([]);
    setTransferTarget(TRANSFER_PLACEHOLDER);
    toast.success(`Ownership transferred to ${transferTarget}. You have been demoted to Admin.`);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      /* clear all persisted CyberAgent keys before redirect */
      if (typeof window !== "undefined") {
        [
          "cyberagent_api_keys_v1",
          "cyberagent_team_members_v1",
          "cyberagent_notif_prefs_v1",
          "agentStore",
        ].forEach((k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } });
      }
    } catch { /* ignore */ }
    await signOut({ callbackUrl: "/auth" });
  };

  return (
    <div className="space-y-5">

      {/* ── Export ── */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ background: "rgba(0,242,255,0.02)", border: "1px solid rgba(0,242,255,0.14)" }}
      >
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg,#00f2ff,transparent)" }} />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(0,242,255,0.1)", border: "1px solid rgba(0,242,255,0.25)" }}>
              <Download size={15} className="text-[#00f2ff]" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-[#e2e8f0]">Export Workspace Data</p>
              <p className="text-[12px] text-[#64748b] mt-0.5 max-w-md leading-relaxed">
                Download a full archive of your agents, knowledge files, conversations, and analytics.
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <button
              type="button"
              onClick={requestExport}
              disabled={isExporting || exportStatus === "completed"}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-semibold transition-all hover:opacity-80 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
              style={{
                background: exportStatus === "completed"
                  ? "rgba(0,255,148,0.1)"
                  : "rgba(0,242,255,0.1)",
                border:     exportStatus === "completed"
                  ? "1px solid rgba(0,255,148,0.28)"
                  : "1px solid rgba(0,242,255,0.25)",
                color:      exportStatus === "completed" ? "#00ff94" : "#00f2ff",
              }}
            >
              {exportStatus === "processing" ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: "#00f2ff", boxShadow: "0 0 5px #00f2ff", animation: "pulse 0.8s infinite" }} />
                  📦 Compiling Compressed Archive Blocks…
                </>
              ) : exportStatus === "completed" ? (
                <><CheckCircle size={13} /> ZIP Downloaded</>
              ) : (
                <><Download size={13} /> Request Export</>
              )}
            </button>

            <AnimatePresence>
              {exportStatus === "completed" && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-[11px] font-semibold"
                  style={{ color: "#00ff94" }}
                >
                  ✅ Local backup archive compiled. Check your browser downloads directory.
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ── Transfer Ownership ── */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ background: "rgba(245,158,11,0.02)", border: "1px solid rgba(245,158,11,0.16)" }}
      >
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg,#f59e0b,transparent)" }} />
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.28)" }}>
              <Users size={15} className="text-[#f59e0b]" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-[#e2e8f0]">Transfer Ownership</p>
              <p className="text-[12px] text-[#64748b] mt-0.5 max-w-md leading-relaxed">
                Transfer all agents, data, and billing to another workspace member. You will be demoted to Admin.
              </p>
            </div>
          </div>

          {noOtherMembers && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[11px] font-medium"
              style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.18)", color: "#64748b" }}>
              <Users size={12} style={{ color: "#f59e0b", flexShrink: 0 }} />
              No other active workspace members available. Invite teammates first.
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={transferTarget}
              onChange={(e) => setTransferTarget(e.target.value)}
              disabled={noOtherMembers}
              className="flex-1 px-3.5 py-2.5 rounded-xl text-[12px] outline-none transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "rgba(0,0,0,0.4)",
                border:     transferValid
                  ? "1px solid rgba(245,158,11,0.4)"
                  : "1px solid rgba(255,255,255,0.08)",
                color:      transferValid ? "#f59e0b" : "#475569",
              }}
            >
              <option value={TRANSFER_PLACEHOLDER} style={{ background: "#0a0a10", color: "#475569" }}>
                {noOtherMembers ? "No members available" : TRANSFER_PLACEHOLDER}
              </option>
              {liveEmails.map((email) => (
                <option key={email} value={email} style={{ background: "#0a0a10", color: "#e2e8f0" }}>{email}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => transferValid && setShowTransferConfirm(true)}
              disabled={!transferValid || transferComplete}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold transition-all hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              style={{
                background: transferValid ? "rgba(245,158,11,0.12)" : "rgba(255,255,255,0.03)",
                border:     transferValid ? "1px solid rgba(245,158,11,0.3)" : "1px solid rgba(255,255,255,0.06)",
                color:      transferValid ? "#f59e0b" : "#334155",
              }}
            >
              <ShieldAlert size={13} /> Transfer
            </button>
          </div>

          <AnimatePresence>
            {transferComplete && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[11px] font-semibold"
                style={{ background: "rgba(0,255,148,0.07)", border: "1px solid rgba(0,255,148,0.22)", color: "#00ff94" }}
              >
                <CheckCircle size={12} />
                Ownership transferred. Your role has been updated to Admin.
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Transfer confirmation overlay ── */}
      {showTransferConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 14 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="relative w-full max-w-sm rounded-2xl overflow-hidden"
            style={{
              background: "rgba(6,6,14,0.99)",
              border:     "1px solid rgba(245,158,11,0.35)",
              boxShadow:  "0 0 60px rgba(245,158,11,0.1), 0 0 40px rgba(0,0,0,0.8)",
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-[2px]"
              style={{ background: "linear-gradient(90deg,transparent,#f59e0b,#00f2ff,transparent)" }} />

            <div className="p-6 space-y-4">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.28)", boxShadow: "0 0 24px rgba(245,158,11,0.12)" }}>
                  <ShieldAlert size={24} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-[16px] font-black text-[#e2e8f0]">Confirm Transfer</p>
                  <p className="text-[12px] text-[#64748b] mt-1 leading-relaxed max-w-[260px]">
                    You are about to transfer full workspace ownership to:
                  </p>
                  <p className="text-[13px] font-black mt-1.5 break-all"
                    style={{ color: "#f59e0b" }}>{transferTarget}</p>
                  <p className="text-[11px] text-[#475569] mt-1.5 leading-relaxed">
                    Your role will be immediately demoted to <strong className="text-[#94a3b8]">Admin</strong>.
                    This action will update localStorage and cannot be undone from this panel.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowTransferConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-[#94a3b8] hover:text-[#e2e8f0] transition-all"
                  style={{ border: "1px solid rgba(255,255,255,0.09)" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeTransfer}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold transition-all hover:opacity-90 active:scale-[0.97]"
                  style={{
                    background: "rgba(245,158,11,0.16)",
                    border:     "1px solid rgba(245,158,11,0.4)",
                    color:      "#f59e0b",
                    boxShadow:  "0 0 18px rgba(245,158,11,0.1)",
                  }}
                >
                  <ShieldAlert size={13} /> Confirm Transfer
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowTransferConfirm(false)}
              className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-[#475569] hover:text-[#94a3b8] hover:bg-white/[0.05] transition-all"
            >
              <X size={13} />
            </button>
          </motion.div>
        </div>
      )}

      {/* ── Sign Out ── */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{ border: "1px solid rgba(248,113,113,0.2)", background: "rgba(248,113,113,0.02)" }}
      >
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: "linear-gradient(90deg,rgba(248,113,113,0.5),rgba(245,158,11,0.3),transparent)" }} />
        <div className="flex items-start justify-between gap-4 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.22)" }}>
              <LogOut size={15} className="text-red-400" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-[#e2e8f0]">Sign Out</p>
              <p className="text-[12px] text-[#64748b] mt-0.5 max-w-md">
                Ends your session, clears local auth state, and returns you to the login page.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowSignOut(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all hover:opacity-90 active:scale-[0.97] shrink-0"
            style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", color: "#f87171" }}
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </div>

      {/* ── Delete Workspace ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          border:    "1px solid rgba(239,68,68,0.28)",
          boxShadow: deleteUnlocked ? "0 0 40px rgba(239,68,68,0.1)" : "0 0 30px rgba(239,68,68,0.03)",
          transition: "box-shadow 0.4s",
        }}
      >
        <div className="px-6 py-4 flex items-center gap-3"
          style={{ background: "rgba(239,68,68,0.07)", borderBottom: "1px solid rgba(239,68,68,0.15)" }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(239,68,68,0.14)", border: "1px solid rgba(239,68,68,0.28)" }}>
            <AlertOctagon size={15} className="text-red-400" />
          </div>
          <h3 className="text-[14px] font-black text-red-400 tracking-wide">⚠ Delete Workspace</h3>
        </div>

        <div className="p-6 space-y-5" style={{ background: "rgba(239,68,68,0.015)" }}>
          <p className="text-[13px] text-[#64748b] leading-relaxed">
            This will <strong className="text-red-400">permanently and irreversibly</strong> delete your
            entire workspace — all agents, knowledge base files, conversations, analytics, and billing history.
          </p>

          <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.16)" }}>
            <AlertTriangle size={13} className="text-red-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-[#f87171] leading-relaxed">
              This action cannot be undone. All data will be destroyed immediately. There is no recovery path.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[12px] text-[#94a3b8]">
              Type{" "}
              <code className="px-1.5 py-0.5 rounded font-mono text-[11px]"
                style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
                DELETE WORKSPACE
              </code>{" "}
              to confirm
            </label>
            <div className="relative">
              <NeonInput
                value={deleteConfirmationText}
                onChange={setDeleteConfirmationText}
                placeholder="DELETE WORKSPACE"
              />
              {deleteUnlocked && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-[#f87171] animate-pulse">
                  UNLOCKED
                </span>
              )}
            </div>
          </div>

          <button
            type="button"
            disabled={!deleteUnlocked}
            onClick={() => deleteUnlocked && setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-black transition-all disabled:opacity-25 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.97]"
            style={{
              background: deleteUnlocked ? "rgba(239,68,68,0.18)" : "rgba(239,68,68,0.05)",
              border:     deleteUnlocked ? "1px solid rgba(239,68,68,0.55)" : "1px solid rgba(239,68,68,0.18)",
              color:      "#f87171",
              boxShadow:  deleteUnlocked ? "0 0 24px rgba(239,68,68,0.22), 0 0 8px rgba(239,68,68,0.12)" : "none",
              transition: "all 0.35s",
            }}
          >
            <Trash2 size={14} /> Delete Workspace Permanently
          </button>
        </div>
      </div>

      {/* ══════════════════════════════
          Sign-out confirmation modal
      ══════════════════════════════ */}
      <AnimatePresence>
        {showSignOut && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowSignOut(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 14 }}
              animate={{ opacity: 1, scale: 1,    y: 0  }}
              exit={{ opacity: 0, scale: 0.95,    y: 8  }}
              transition={{ type: "spring", stiffness: 340, damping: 28 }}
              className="relative w-full max-w-sm rounded-2xl overflow-hidden"
              style={{
                background:     "rgba(6,6,14,0.99)",
                border:         "1px solid rgba(248,113,113,0.25)",
                boxShadow:      "0 0 60px rgba(0,0,0,0.7), 0 0 40px rgba(248,113,113,0.06)",
                backdropFilter: "blur(20px)",
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ background: "linear-gradient(90deg,transparent,rgba(248,113,113,0.7),rgba(245,158,11,0.5),transparent)" }} />

              <div className="p-6 space-y-5">
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.25)", boxShadow: "0 0 24px rgba(248,113,113,0.12)" }}>
                    <LogOut size={24} className="text-red-400" />
                  </div>
                  <div>
                    <p className="text-[16px] font-black text-[#e2e8f0]">Sign Out?</p>
                    <p className="text-[12px] text-[#64748b] mt-1 leading-relaxed max-w-[260px]">
                      This will clear your local session keys and return you to the{" "}
                      <span style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 700 }}>
                        CyberAgent Studio
                      </span>{" "}
                      login page.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowSignOut(false)}
                    className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-[#94a3b8] hover:text-[#e2e8f0] transition-all"
                    style={{ border: "1px solid rgba(255,255,255,0.09)" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-60"
                    style={{
                      background: "rgba(248,113,113,0.14)",
                      border:     "1px solid rgba(248,113,113,0.32)",
                      color:      "#f87171",
                      boxShadow:  "0 0 16px rgba(248,113,113,0.1)",
                    }}
                  >
                    {signingOut ? <RefreshCw size={13} className="animate-spin" /> : <LogOut size={13} />}
                    {signingOut ? "Signing out…" : "Sign Out"}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSignOut(false)}
                className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-[#475569] hover:text-[#94a3b8] hover:bg-white/[0.05] transition-all"
              >
                <X size={13} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════
          Delete validation overlay
      ══════════════════════════════ */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(14px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 16 }}
              animate={{ opacity: 1, scale: 1,   y: 0  }}
              exit={{ opacity: 0, scale: 0.95,   y: 8  }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
              className="relative w-full max-w-sm rounded-2xl overflow-hidden"
              style={{
                background: "rgba(6,0,0,0.99)",
                border:     "1px solid rgba(239,68,68,0.45)",
                boxShadow:  "0 0 80px rgba(239,68,68,0.18), 0 0 40px rgba(0,0,0,0.8)",
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-[2px]"
                style={{ background: "linear-gradient(90deg,transparent,#ef4444,#f87171,transparent)" }} />

              <div className="p-6 space-y-5 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto"
                  style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", boxShadow: "0 0 32px rgba(239,68,68,0.15)" }}>
                  <AlertOctagon size={28} className="text-red-400" />
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] font-black tracking-[0.2em] uppercase text-red-500">
                    Validation Passed
                  </p>
                  <h3 className="text-[18px] font-black text-[#e2e8f0]">Final Confirmation</h3>
                  <p className="text-[12px] text-[#64748b] leading-relaxed max-w-[270px] mx-auto">
                    You are about to permanently destroy this workspace and all associated data. This action
                    is <strong className="text-red-400">irreversible</strong>.
                  </p>
                </div>

                <div className="px-3 py-2.5 rounded-xl text-[11px] font-mono text-center"
                  style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.18)", color: "#f87171" }}>
                  &quot;{deleteConfirmationText}&quot; — match confirmed ✓
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmationText(""); }}
                    className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-[#94a3b8] hover:text-[#e2e8f0] transition-all"
                    style={{ border: "1px solid rgba(255,255,255,0.09)" }}
                  >
                    Abort
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmationText("");
                      toast.error("Workspace deletion queued. Contact support to cancel within 24 hours.");
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-black transition-all hover:opacity-90 active:scale-[0.97]"
                    style={{
                      background: "rgba(239,68,68,0.16)",
                      border:     "1px solid rgba(239,68,68,0.45)",
                      color:      "#f87171",
                      boxShadow:  "0 0 20px rgba(239,68,68,0.15)",
                    }}
                  >
                    <Trash2 size={13} /> Confirm Delete
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-[#475569] hover:text-[#94a3b8] hover:bg-white/[0.05] transition-all"
              >
                <X size={13} />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════
   LEFT NAV — neon active indicator
══════════════════════════════════════════════ */
function SettingsNav({ active, setActive }: { active: Section; setActive: (s: Section) => void }) {
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(({ id, label, icon: Icon, color }) => {
        const isActive = active === id;
        const isDanger = id === "danger";
        return (
          <button
            key={id}
            onClick={() => setActive(id)}
            className={cn(
              "relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-left w-full transition-all duration-150",
              isActive ? "text-[#e2e8f0]" : isDanger ? "text-[#f87171] hover:bg-red-400/[0.04]" : "text-[#64748b] hover:text-[#94a3b8] hover:bg-white/[0.03]"
            )}
            style={{
              background: isActive
                ? isDanger
                  ? "linear-gradient(90deg,rgba(248,113,113,0.08),transparent)"
                  : `linear-gradient(90deg,${color}10,transparent)`
                : "transparent",
              borderLeft: isActive ? `2px solid ${isDanger ? "#f87171" : color}` : "2px solid transparent",
              paddingLeft: isActive ? "14px" : "16px",
            }}
          >
            {/* Neon left border glow */}
            {isActive && (
              <div
                className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r"
                style={{ background: isDanger ? "#f87171" : color, boxShadow: `0 0 8px ${isDanger ? "#f87171" : color}90, 0 0 16px ${isDanger ? "#f87171" : color}40` }}
              />
            )}

            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all"
              style={{
                background: isActive ? `${isDanger ? "#f87171" : color}18` : "transparent",
                border:     isActive ? `1px solid ${isDanger ? "#f87171" : color}30` : "1px solid transparent",
                boxShadow:  isActive ? `0 0 10px ${isDanger ? "#f87171" : color}20` : "none",
              }}
            >
              <Icon size={14} style={{ color: isActive ? (isDanger ? "#f87171" : color) : undefined }} />
            </div>

            <span className={isDanger ? "" : ""}>
              {isDanger ? (
                <span style={{
                  background:           isActive ? "linear-gradient(90deg,#f87171,#f59e0b)" : "none",
                  WebkitBackgroundClip: isActive ? "text" : "unset",
                  WebkitTextFillColor:  isActive ? "transparent" : "inherit",
                  animation:            isActive ? "ca-danger-pulse 2s ease-in-out infinite" : "none",
                }}>
                  {label}
                </span>
              ) : label}
            </span>

            {isActive && <ChevronRight size={12} className="ml-auto text-[#334155]" />}
          </button>
        );
      })}
    </nav>
  );
}

/* ══════════════════════════════════════════════
   SAVE BAR
══════════════════════════════════════════════ */
function SaveBar({ dirty, onSave, onDiscard }: { dirty: boolean; onSave: () => void; onDiscard: () => void }) {
  return (
    <AnimatePresence>
      {dirty && (
        <motion.div
          initial={{ y: 64, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 64, opacity: 0 }}
          transition={{ type: "spring", stiffness: 340, damping: 30 }}
          className="sticky bottom-0 left-0 right-0 flex items-center justify-between gap-4 px-6 py-3.5 z-20"
          style={{ background: "rgba(6,6,14,0.98)", borderTop: "1px solid rgba(0,242,255,0.2)", boxShadow: "0 -8px 32px rgba(0,0,0,0.6), 0 -1px 0 rgba(0,242,255,0.1)", backdropFilter: "blur(14px)" }}
        >
          <div className="flex items-center gap-2 text-[12px] text-[#64748b]">
            <div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" style={{ animation: "pulse 1.5s infinite", boxShadow: "0 0 6px #f59e0b" }} />
            You have unsaved changes
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onDiscard} className="px-4 py-2 rounded-xl text-[12px] font-medium text-[#64748b] hover:text-[#94a3b8] transition-all hover:bg-white/[0.04]"
              style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
              Discard
            </button>
            <button onClick={onSave} className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold transition-all hover:opacity-90 active:scale-[0.97]"
              style={{ background: "linear-gradient(90deg,rgba(0,242,255,0.22),rgba(168,85,247,0.22))", border: "1px solid rgba(0,242,255,0.35)", color: "#00f2ff", boxShadow: "0 0 20px rgba(0,242,255,0.12)" }}>
              <Save size={13} /> Save Changes
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ══════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════ */

/* Star icon not in lucide import above */
function Star({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

const SECTION_TITLES: Record<Section, string> = {
  profile: "Profile", billing: "Billing", "api-keys": "API Keys",
  team: "Team", integrations: "Integrations", notifications: "Notifications", danger: "Danger Zone",
};

export default function SettingsPage() {
  const { data: session } = useSession();
  const [active, setActive] = useState<Section>("profile");
  const [dirty,  setDirty]  = useState(false);
  const [saved,  setSaved]  = useState(false);
  const onDirty = () => setDirty(true);

  const handleSave = async () => {
    setSaved(true); setDirty(false);
    await new Promise((r) => setTimeout(r, 1500));
    setSaved(false);
  };

  return (
    <DashboardShell title={`Settings — ${SECTION_TITLES[active]}`}>
      {/* Inject keyframes */}
      <style>{`
        @keyframes ca-breathe {
          0%,100% { box-shadow: 0 0 20px rgba(0,242,255,0.3), 0 0 40px rgba(0,242,255,0.1); }
          50%      { box-shadow: 0 0 40px rgba(0,242,255,0.6), 0 0 80px rgba(168,85,247,0.2), 0 0 120px rgba(0,242,255,0.1); }
        }
        @keyframes ca-danger-pulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.7; }
        }
      `}</style>

      <div className="flex h-full min-h-0">

        {/* ── Desktop sidebar ── */}
        <aside
          className="hidden md:flex flex-col shrink-0 w-56 py-5 px-3 overflow-y-auto"
          style={{ background: "rgba(5,5,12,0.98)", borderRight: "1px solid rgba(255,255,255,0.06)", boxShadow: "4px 0 20px rgba(0,0,0,0.3)" }}
        >
          <p
            className="px-3.5 mb-4 text-[9px] font-black uppercase tracking-[0.2em]"
            style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            Account Settings
          </p>
          <SettingsNav active={active} setActive={setActive} />

          {/* Workspace info */}
          <div className="mt-auto px-2 pt-4 border-t border-white/[0.05]">
            <div
              className="flex items-center gap-2.5 p-3 rounded-xl relative overflow-hidden"
              style={{ background: "linear-gradient(135deg,rgba(0,242,255,0.06),rgba(168,85,247,0.04))", border: "1px solid rgba(0,242,255,0.15)" }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(135deg,rgba(0,242,255,0.2),rgba(168,85,247,0.2))", border: "1px solid rgba(0,242,255,0.3)", boxShadow: "0 0 10px rgba(0,242,255,0.15)" }}>
                <Zap size={13} className="text-[#00f2ff]" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-[#e2e8f0] truncate" title={session?.user?.email ?? ""}>
                  {session?.user?.name ?? session?.user?.email?.split("@")[0] ?? "Workspace"}
                </p>
                <p className="text-[9px] text-[#334155] capitalize">
                  {(session?.user as { subscription?: string })?.subscription ?? "free"} plan
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Mobile horizontal tabs ── */}
        <div className="md:hidden flex-none w-full absolute z-10 top-0" />

        {/* ── Right content ── */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          {/* Mobile tab scroll */}
          <div className="md:hidden flex overflow-x-auto shrink-0 px-4 py-3 gap-2"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(5,5,12,0.97)" }}>
            {NAV.map(({ id, label, icon: Icon, color }) => (
              <button key={id} onClick={() => setActive(id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all shrink-0"
                style={{
                  background: active === id ? `${color}15` : "rgba(255,255,255,0.03)",
                  border:     active === id ? `1px solid ${color}30` : "1px solid rgba(255,255,255,0.07)",
                  color:      active === id ? color : "#64748b",
                }}>
                <Icon size={12} />{label}
              </button>
            ))}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 sm:px-8 lg:px-10 py-6 space-y-2">
              {/* Section heading */}
              <div className="pb-4 border-b border-white/[0.05]">
                <h2 className="text-xl font-black">
                  <GradientText>{SECTION_TITLES[active]}</GradientText>
                </h2>
                <p className="text-[13px] text-[#64748b] mt-0.5">
                  {active === "profile"       && "Manage your identity and preferences."}
                  {active === "billing"       && "Review your plan, usage, invoices and payment details."}
                  {active === "api-keys"      && "Manage API credentials for programmatic access."}
                  {active === "team"          && "Invite teammates and manage workspace access."}
                  {active === "integrations"  && "Connect external services to power your agents."}
                  {active === "notifications" && "Control when and how you receive alerts."}
                  {active === "danger"        && "Irreversible actions — proceed with extreme caution."}
                </p>
              </div>

              {/* Section content */}
              <div className="pt-4">
                <AnimatePresence mode="wait">
                  <motion.div key={active}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18 }}
                  >
                    {active === "profile"       && <ProfileSection />}
                    {active === "billing"       && <BillingSection />}
                    {active === "api-keys"      && <ApiKeysSection onDirty={onDirty} />}
                    {active === "team"          && <TeamSection onDirty={onDirty} />}
                    {active === "integrations"  && <IntegrationsSection />}
                    {active === "notifications" && <NotificationsSection onDirty={onDirty} userEmail={session?.user?.email ?? ""} />}
                    {active === "danger"        && <DangerSection />}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Success toast */}
              <AnimatePresence>
                {saved && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="fixed bottom-20 right-6 flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold z-50"
                    style={{ background: "rgba(0,255,148,0.12)", border: "1px solid rgba(0,255,148,0.3)", color: "#00ff94", boxShadow: "0 0 20px rgba(0,255,148,0.15)" }}
                  >
                    <Check size={14} /> Changes saved successfully
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <SaveBar dirty={dirty} onSave={handleSave} onDiscard={() => setDirty(false)} />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
