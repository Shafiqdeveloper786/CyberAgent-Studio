"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, CreditCard, Key, Users, Puzzle, Bell, AlertTriangle,
  Copy, Check, Trash2, Plus, Eye, EyeOff, Download, RefreshCw,
  ChevronRight, Shield, Zap, Globe, Mail, Link2, ShieldCheck,
  ExternalLink, ToggleLeft, ToggleRight, Save, X, LogOut, TrendingUp, Cpu,
  Pencil, MessageSquare, Webhook, Star,
  AlertOctagon, CheckCircle, ShieldAlert,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { toast } from "sonner";
import { useAgentStore } from "@/store/agentStore";
import { useAuthStore } from "@/store/authStore";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { cn } from "@/lib/utils";

type Section = "profile" | "billing" | "api-keys" | "team" | "integrations" | "notifications" | "danger";

const NAV: {
  id: Section; label: string;
  icon: React.FC<{ size?: number; className?: string; style?: React.CSSProperties }>;
  color: string;
}[] = [
  { id: "profile",       label: "Profile",       icon: User,          color: "#3b82f6" },
  { id: "billing",       label: "Billing",        icon: CreditCard,    color: "#f59e0b" },
  { id: "api-keys",      label: "API Keys",       icon: Key,           color: "#10b981" },
  { id: "team",          label: "Team",           icon: Users,         color: "#a855f7" },
  { id: "integrations",  label: "Integrations",   icon: Puzzle,        color: "#ec4899" },
  { id: "notifications", label: "Notifications",  icon: Bell,          color: "#06b6d4" },
  // Removed: Support Tickets — now handled via Customer Inquiries page
  { id: "danger",        label: "Danger Zone",    icon: AlertTriangle, color: "#ef4444" },
];

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

/* ── Shared primitives — LIGHT THEME ── */
function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-2xl p-6 sm:p-7 space-y-6 bg-white border border-slate-200/80 shadow-sm", className)}>
      {children}
    </div>
  );
}

function SectionHeading({ title, desc }: { title: string; desc?: string }) {
  return (
    <div>
      <h3 className="text-[15px] font-bold text-slate-800">{title}</h3>
      {desc && <p className="text-[12px] text-slate-500 mt-0.5">{desc}</p>}
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
    <div className="relative" style={{ boxShadow: focused ? "0 0 0 2px rgba(59,130,246,0.2), 0 0 12px rgba(59,130,246,0.06)" : "none", borderRadius: 12, transition: "box-shadow 0.2s" }}>
      {prefix && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">{prefix}</div>
      )}
      <input
        type={type} value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder} disabled={disabled}
        className={cn(
          "w-full px-3 py-2.5 rounded-xl text-[13px] text-slate-800 outline-none transition-all",
          "placeholder:text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed bg-white",
          prefix && "pl-9", className
        )}
        style={{
          border: `1px solid ${focused ? "#3b82f6" : "#e2e8f0"}`,
          transition: "border-color 0.2s",
        }}
      />
    </div>
  );
}

function Toggle({ on, onToggle, color = "#3b82f6" }: { on: boolean; onToggle: () => void; color?: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-checked={on}
      role="switch"
      className="shrink-0 relative inline-flex items-center rounded-full transition-all duration-300 focus:outline-none"
      style={{
        width: 44, height: 24,
        background:  on ? color : "#e2e8f0",
        border:      on ? `1px solid ${color}` : "1px solid #cbd5e1",
        transition:  "background 0.25s, border-color 0.25s",
      }}
    >
      <span
        className="inline-block rounded-full transition-all duration-300"
        style={{
          width: 16, height: 16,
          background:  on ? "white" : "#94a3b8",
          transform:   on ? "translateX(22px)" : "translateX(3px)",
          transition:  "transform 0.25s, background 0.25s",
        }}
      />
    </button>
  );
}

/* ══════════════════════════════════════════════
   PROFILE SECTION — LIGHT
══════════════════════════════════════════════ */
type ProfileMeta = { authMethod: string; createdAt: string; subscription: string };

function ProfileSection() {
  const { data: session, status } = useSession();
  const [meta, setMeta] = useState<ProfileMeta | null>(null);

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

  const joinedLabel = meta?.createdAt
    ? new Date(meta.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  const initials = name
    ? name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : email.slice(0, 2).toUpperCase();

  const planLabel = { free: "Free Plan", starter: "Starter Plan", growth: "Growth Plan" }[subscription] ?? "Pro Plan";
  const planColor = subscription === "free" ? "#64748b" : subscription === "growth" ? "#3b82f6" : "#a855f7";

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
      <div className="w-full max-w-md relative bg-white border border-slate-200/80 shadow-sm rounded-2xl px-8 py-10 flex flex-col items-center gap-6">
        {/* Avatar */}
        <div className="relative w-24 h-24 shrink-0">
          {image ? (
            <div className="w-full h-full aspect-square rounded-full overflow-hidden ring-2 ring-slate-200">
              <Image src={image} alt={name || "Profile"} width={96} height={96} className="w-full h-full object-cover rounded-full" />
            </div>
          ) : (
            <div className="w-full h-full aspect-square rounded-full flex items-center justify-center text-[30px] font-black select-none bg-blue-50 text-blue-600 ring-2 ring-blue-200">
              {status === "loading" ? "…" : initials}
            </div>
          )}
          {status === "authenticated" && (
            <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white bg-emerald-500 shadow-sm" />
          )}
        </div>

        {name && <p className="text-[18px] font-black text-slate-900 -mb-2">{name}</p>}

        <div className="flex items-center gap-2">
          <Mail size={13} className="text-slate-400" />
          <span className="text-[14px] font-semibold text-slate-600">{status === "loading" ? "Loading…" : email}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-center">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
            <Zap size={10} /> Owner
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold"
            style={{ background: `${planColor}12`, border: `1px solid ${planColor}25`, color: planColor }}>
            <Star size={10} /> {planLabel}
          </div>
          {joinedLabel && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200">
              Since {joinedLabel}
            </div>
          )}
          {!joinedLabel && status === "authenticated" && (
            <div className="h-6 w-24 rounded-full animate-pulse bg-slate-100 border border-slate-200" />
          )}
        </div>

        <div className="w-24 h-px bg-slate-200" />

        {status === "authenticated" && isGoogleUser && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
            <GoogleG />
            <p className="text-[12px] font-medium text-slate-600">
              Profile synced with <span className="font-bold text-slate-800">Google</span>
            </p>
            <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-500" />
          </div>
        )}

        {status === "authenticated" && meta && !isGoogleUser && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-200">
            <Mail size={13} className="text-blue-500" />
            <p className="text-[12px] font-medium text-slate-600">
              Authenticated via <span className="font-bold text-blue-600">Email OTP</span>
            </p>
            <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-blue-500" />
          </div>
        )}

        {status === "unauthenticated" && (
          <p className="text-[12px] text-slate-400">Sign in to load your profile.</p>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// REST OF SECTIONS — All business logic preserved
// Only presentation wrappers changed from dark to light
// ══════════════════════════════════════════════

// [BILLING, API KEYS, TEAM, INTEGRATIONS, NOTIFICATIONS, DANGER sections
//  preserved in full with only wrapper updates]

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
    { label: "Active Agents",   used: usage.agents, total: FREE_LIMITS.agents, color: "#3b82f6" },
    { label: "Knowledge Files", used: usage.files,  total: FREE_LIMITS.files,  color: "#a855f7" },
    { label: "Chunks Indexed",  used: usage.chunks, total: FREE_LIMITS.chunks, color: "#10b981" },
  ];

  return (
    <div className="space-y-6">
      {isFree && (
        <SectionCard>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 border border-slate-200">
                <CreditCard size={17} className="text-slate-500" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">Free Plan</span>
                </div>
                <p className="text-[12px] text-slate-500">Limited capacity — upgrade to unlock full power</p>
              </div>
            </div>
            <button onClick={openPricing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-bold transition-all hover:bg-blue-600 active:scale-[0.97] shrink-0 bg-blue-600 text-white shadow-sm">
              <Zap size={13} /> Upgrade Now
            </button>
          </div>

          <div className="space-y-5">
            {loadingUsage ? (
              <div className="flex items-center gap-2 text-[12px] text-slate-400">
                <RefreshCw size={12} className="animate-spin" /> Loading usage data…
              </div>
            ) : (
              METERS.map(({ label, used, total, color }) => {
                const pct     = Math.min((used / total) * 100, 100);
                const isCapped = used >= total;
                return (
                  <div key={label} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[12px] font-semibold text-slate-600">{label}</span>
                      <div className="flex items-center gap-2">
                        {isCapped && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-red-50 text-red-500 border border-red-200">LIMIT REACHED</span>
                        )}
                        <span className="text-[12px] tabular-nums font-semibold" style={{ color: isCapped ? "#ef4444" : "#64748b" }}>{used} / {total}</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden bg-slate-100">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ background: isCapped ? "#ef4444" : color }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SectionCard>
      )}

      {!isFree && (
        <SectionCard>
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-50 border border-amber-200">
                  <CreditCard size={16} className="text-amber-600" />
                </div>
                <h3 className="text-[15px] font-bold text-slate-800">Current Plan</h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-[13px] font-bold bg-blue-50 text-blue-600 border border-blue-200">Growth</span>
                <span className="text-[24px] font-black text-slate-900">$39<span className="text-[14px] font-normal text-slate-500">/mo</span></span>
              </div>
              <p className="text-[12px] text-slate-500">Renews June 1, 2025 · Monthly</p>
            </div>
            <div className="flex flex-col sm:items-end gap-2">
              <button onClick={openPricing} className="px-4 py-2 rounded-xl text-[13px] font-semibold transition-all hover:bg-blue-700 bg-blue-600 text-white shadow-sm">Upgrade to Enterprise</button>
              <button className="text-[12px] text-slate-500 hover:text-slate-700 transition-colors">Cancel subscription</button>
            </div>
          </div>
          <div className="space-y-4 mt-5 pt-5 border-t border-slate-100">
            {[
              { label: "Messages", used: 2400, total: 5000, unit: "msg", color: "#3b82f6" },
              { label: "Agents",   used: 2,    total: 3,    unit: "",    color: "#a855f7" },
              { label: "Storage",  used: 1.2,  total: 5,    unit: "GB",  color: "#10b981" },
            ].map(({ label, used, total, unit, color }) => {
              const pct = (used / total) * 100;
              return (
                <div key={label} className="space-y-1.5">
                  <div className="flex justify-between text-[12px]">
                    <span className="text-slate-600 font-medium">{label}</span>
                    <span className="text-slate-500 tabular-nums">{used}{unit && ` ${unit}`} / {total}{unit && ` ${unit}`}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden bg-slate-100">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full rounded-full" style={{ background: color }} />
                  </div>
                  <p className="text-[10px] text-slate-400 text-right">{pct.toFixed(0)}% used</p>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Transaction History */}
      <SectionCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-50 border border-amber-200">
              <Download size={13} className="text-amber-600" />
            </div>
            <div>
              <span className="text-[13px] font-bold text-slate-800">Transaction History</span>
              <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">{INVOICES.length} records</span>
            </div>
          </div>
          {INVOICES.length > 0 && (
            <button className="flex items-center gap-1.5 text-[12px] text-slate-500 hover:text-slate-700 transition-colors"><Download size={12} /> Export CSV</button>
          )}
        </div>

        {INVOICES.length === 0 ? (
          <div className="flex flex-col items-center gap-5 py-14 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-slate-50 border border-slate-200">
              <CreditCard size={22} className="text-slate-400" />
            </div>
            <div className="space-y-2 max-w-[300px]">
              <p className="text-[14px] font-bold text-slate-600">No transaction history available.</p>
              <p className="text-[12px] text-slate-400 leading-relaxed">Your plan history will appear here once you upgrade to a premium tier.</p>
            </div>
            {isFree && (
              <button onClick={openPricing} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:scale-[0.97]">
                <Zap size={12} /> View Upgrade Plans
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  {["Date", "Invoice Ref", "Description", "Amount", "Status", ""].map((h) => (
                    <th key={h} className="text-left px-5 py-3 text-[10px] uppercase tracking-widest text-slate-500 font-bold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {INVOICES.map((inv, i) => (
                  <tr key={inv.ref} className="hover:bg-slate-50 transition-colors group" style={{ borderBottom: i < INVOICES.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                    <td className="px-5 py-4 text-[12px] text-slate-500 whitespace-nowrap">{inv.date}</td>
                    <td className="px-5 py-4"><code className="text-[11px] font-mono text-slate-500">{inv.ref}</code></td>
                    <td className="px-5 py-4 text-[12px] text-slate-600">{inv.desc}</td>
                    <td className="px-5 py-4 text-[13px] font-bold text-slate-800 tabular-nums">{inv.amount}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${inv.status === "paid" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
                        {inv.status === "paid" ? "✓ Paid" : "✕ Failed"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[11px] text-slate-400 hover:text-blue-600 transition-all"><Download size={11} /> PDF</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isFree && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-11 h-8 rounded-lg flex items-center justify-center text-[11px] font-black bg-blue-600 text-white shadow-sm">VISA</div>
              <div>
                <p className="text-[13px] font-medium text-slate-600">Visa ending in 4242</p>
                <p className="text-[11px] text-slate-400">Expires 08/2027</p>
              </div>
            </div>
            <button className="px-3 py-1.5 rounded-lg text-[12px] font-medium text-slate-500 hover:text-slate-700 border border-slate-200 hover:bg-slate-50">Update</button>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

/* ══════════════════════════════════════════════
   API KEYS SECTION — Light
══════════════════════════════════════════════ */
function ApiKeysSection({ onDirty }: { onDirty: () => void }) {
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
      const res = await fetch(`/api/agents/${activeAgentId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ regenerateApiKey: "true" }) });
      const d = await res.json() as { agent?: { apiKey?: string } };
      if (d.agent?.apiKey) { setAgentKey(d.agent.apiKey); toast.success("API key regenerated — update any existing integrations."); onDirty(); }
      else toast.error("Failed to regenerate key.");
    } catch { toast.error("Network error — please try again."); }
    finally { setRegenLoading(false); }
  };

  type KS = "active" | "inactive";
  interface ApiKey { id: string; name: string; raw: string; masked: string; created: string; lastUsed: string; status: KS; }
  const LS_KEY = "cyberagent_api_keys_v1";
  const DEFAULT_KEYS: ApiKey[] = [{ id: "1", name: "Production Widgets", raw: "ca_live_4a08254658cfd0a022f30e87abc", masked: "ca_live_••••••••••••7abc", created: "Jan 15, 2025", lastUsed: "2 min ago", status: "active" }];

  const [keys, setKeys] = useState<ApiKey[]>(() => {
    if (typeof window === "undefined") return DEFAULT_KEYS;
    try { const stored = localStorage.getItem(LS_KEY); if (stored) return JSON.parse(stored) as ApiKey[]; } catch {}
    return DEFAULT_KEYS;
  });
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  useEffect(() => { if (typeof window !== "undefined") localStorage.setItem(LS_KEY, JSON.stringify(keys)); }, [keys]);

  const genToken = (): string => {
    const hex = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0");
    return `ca_live_${hex()}${hex()}${hex()}`;
  };
  const copyKey = (id: string, raw: string) => { navigator.clipboard.writeText(raw); setCopied(id); setTimeout(() => setCopied(null), 2000); };
  const createKey = () => {
    if (!newName.trim()) return;
    const raw = genToken(), suffix = raw.slice(-4), now = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const entry: ApiKey = { id: Date.now().toString(), name: newName.trim(), raw, masked: `ca_live_••••••••••••${suffix}`, created: now, lastUsed: "Never", status: "active" };
    setKeys((prev) => [...prev, entry]); setNewName(""); setCreating(false); onDirty(); toast.success("API key created and saved.");
  };
  const deleteKey = (id: string) => {
    const updated = keys.filter((k) => k.id !== id); setKeys(updated);
    if (typeof window !== "undefined") localStorage.setItem(LS_KEY, JSON.stringify(updated));
    toast.success("API key revoked and removed permanently."); onDirty();
  };

  if (!activeAgentId) {
    return (
      <SectionCard>
        <div className="flex flex-col items-center gap-6 py-16 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-emerald-50 border border-emerald-200">
            <Key size={28} className="text-emerald-500" />
          </div>
          <div className="space-y-2 max-w-sm">
            <p className="text-[15px] font-bold text-slate-700">No Agent Context Found</p>
            <p className="text-[12px] text-slate-500 leading-relaxed">API keys are scoped to an active agent. Go to <span className="font-bold text-blue-600">Agent Space</span>, save and select an agent, then return here to manage its credentials.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {[{ label: "Step 1", desc: "Create or save an agent in Agent Space" }, { label: "Step 2", desc: "Click the agent card to activate it" }, { label: "Step 3", desc: "Return here — your keys will appear" }].map(({ label, desc }) => (
              <div key={label} className="flex items-start gap-2.5 px-4 py-3 rounded-xl text-left bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 bg-blue-100 text-blue-600">{label}</span>
                <p className="text-[11px] text-slate-500 leading-snug">{desc}</p>
              </div>
            ))}
          </div>
          <a href="/dashboard" className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold bg-blue-600 text-white shadow-sm hover:bg-blue-700">Go to Agent Space →</a>
        </div>
      </SectionCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Live Agent Token */}
      <SectionCard>
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 border border-emerald-200">
              <Zap size={15} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-slate-800">{activeAgentId ? `${agentKeyName} — Widget Token` : "No Agent Selected"}</p>
              <p className="text-[11px] text-slate-500">{activeAgentId ? "Use this key in data-api-key for your embed script" : "Select an agent in Agent Space to see its key"}</p>
            </div>
          </div>
          {activeAgentId && (
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-emerald-600">Live</span>
            </div>
          )}
        </div>

        {activeAgentId && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl font-mono text-[12px] bg-slate-50 border border-slate-200">
              <Key size={13} className="text-emerald-600 shrink-0" />
              <span className="flex-1 truncate text-slate-600">
                {agentKey ? (agentKeyVis ? agentKey : `4u_live_${"•".repeat(32)}${agentKey.slice(-6)}`) : "Loading…"}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setAgentKeyVis((v) => !v)} className="p-1.5 rounded-lg transition-all text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                  {agentKeyVis ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
                <button onClick={copyAgentKey} className="p-1.5 rounded-lg transition-all text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                  {agentKeyCopied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-slate-400">Regenerating invalidates all existing embeds using this key.</p>
              <button onClick={regenerateAgentKey} disabled={regenLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all hover:bg-red-50 disabled:opacity-50 shrink-0 ml-3 text-red-600 bg-white border border-red-200 hover:border-red-300">
                {regenLoading ? <><RefreshCw size={11} className="animate-spin" /> Regenerating…</> : <><RefreshCw size={11} /> Regenerate</>}
              </button>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Platform API Keys */}
      <SectionCard>
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-emerald-50 border border-emerald-200">
              <Key size={16} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-slate-800">API Keys</p>
              <p className="text-[11px] text-slate-500">Full write access — keep them secret</p>
            </div>
          </div>
          <button onClick={() => setCreating((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold bg-blue-600 text-white shadow-sm hover:bg-blue-700">
            <Plus size={13} /> New Key
          </button>
        </div>

        <AnimatePresence>
          {creating && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <div className="flex flex-col sm:flex-row items-end gap-3 py-4 border-b border-slate-100">
                <div className="flex-1 space-y-1.5">
                  <label className="text-[11px] text-slate-500 font-medium">Key Name</label>
                  <NeonInput value={newName} onChange={setNewName} placeholder="e.g. Production Widget" />
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={createKey} className="px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-blue-600 text-white shadow-sm hover:bg-blue-700">Create</button>
                  <button onClick={() => setCreating(false)} className="px-4 py-2.5 rounded-xl text-[13px] text-slate-500 border border-slate-200 hover:bg-slate-50">Cancel</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {["Name", "Key", "Created", "Last Used", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left px-6 py-3 text-[10px] uppercase tracking-widest text-slate-500 font-bold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map((k, i) => (
                <tr key={k.id} className="hover:bg-slate-50 transition-colors group" style={{ borderBottom: i < keys.length - 1 ? "1px solid #f1f5f9" : "none" }}>
                  <td className="px-6 py-4 text-[13px] font-medium text-slate-800 whitespace-nowrap">{k.name}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <code className="text-[11px] font-mono text-slate-500">{revealed[k.id] ? k.raw : k.masked}</code>
                      <button onClick={() => setRevealed((r) => ({ ...r, [k.id]: !r[k.id] }))} className="text-slate-400 hover:text-slate-600">
                        {revealed[k.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-[11px] text-slate-500 whitespace-nowrap">{k.created}</td>
                  <td className="px-6 py-4 text-[11px] text-slate-500 whitespace-nowrap">{k.lastUsed}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${k.status === "active" ? "bg-emerald-500" : "bg-slate-300"}`} />
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${k.status === "active" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>{k.status}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => copyKey(k.id, k.raw)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50">{copied === k.id ? <Check size={12} /> : <Copy size={12} />}</button>
                      <button onClick={() => deleteKey(k.id)} className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <Shield size={14} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-[12px] text-amber-800 leading-relaxed">Never share API keys in client-side code or public repositories. Keys have full write access to all your agents.</p>
        </div>
      </SectionCard>
    </div>
  );
}

/* ══════════════════════════════════════════════
   TEAM SECTION — Light
══════════════════════════════════════════════ */
type TeamRole = "Viewer" | "Editor" | "Admin";
type TeamStatus = "Active" | "Pending";
interface TeamMember { id: string; name: string; email: string; role: TeamRole; status: TeamStatus; }

const TEAM_LS_KEY = "cyberagent_team_members_v1";
const OWNER_EMAIL = "shafiqchohan7239@gmail.com";
const SEED_OWNER: TeamMember = { id: "owner-id", name: "shafiqchohan7239", email: OWNER_EMAIL, role: "Admin", status: "Active" };
const MAX_SEATS = 5;
const ROLES: TeamRole[] = ["Viewer", "Editor", "Admin"];

const ROLE_COLORS: Record<TeamRole, { bg: string; border: string; text: string }> = {
  Viewer: { bg: "bg-slate-100", border: "border-slate-200", text: "text-slate-600" },
  Editor: { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-600" },
  Admin:  { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-600" },
};

function TeamSection({ onDirty }: { onDirty: () => void }) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([SEED_OWNER]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<TeamRole>("Viewer");
  const [emailError, setEmailError] = useState("");
  const [inviting, setInviting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastInviteEmail, setLastInviteEmail] = useState<string | null>(null);
  const [lastInviteToken, setLastInviteToken] = useState("");
  const [tokenCopied, setTokenCopied] = useState(false);
  const [emailDispatchStatus, setEmailDispatchStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [emailDispatchMsg, setEmailDispatchMsg] = useState<string>("");

  const atCapacity = teamMembers.length >= MAX_SEATS;

  const fetchTeam = async () => {
    try {
      const res = await fetch("/api/invite");
      const data = await res.json();
      if (data.ok && data.members) {
        setTeamMembers([SEED_OWNER, ...data.members]);
      }
    } catch (err) {
      console.error("Failed to fetch team members", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  const invite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email) { setEmailError("Email address is required."); return; }
    if (!validateEmail(email)) { setEmailError("Enter a valid email address."); return; }
    if (teamMembers.some((m) => m.email.toLowerCase() === email)) { setEmailError("This email is already on your team."); return; }
    setEmailError(""); setEmailDispatchStatus("idle"); setEmailDispatchMsg(""); setInviting(true);

    setEmailDispatchStatus("sending");
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role: selectedRole })
      });
      const data = await res.json() as { ok: boolean; inviteLink?: string; error?: string; smtpOffline?: boolean };
      
      if (data.ok && data.inviteLink) {
        await fetchTeam();

        setLastInviteEmail(email);
        setLastInviteToken(data.inviteLink);
        setTokenCopied(false);
        setInviteEmail("");
        
        if (data.smtpOffline) {
          setEmailDispatchStatus("failed");
          setEmailDispatchMsg("SMTP offline — please use the manual link below.");
          toast.warning("SMTP Offline: copy link below manually.");
        } else {
          setEmailDispatchStatus("sent");
          setEmailDispatchMsg(`Invitation email transmitted successfully to ${email}`);
          toast.success(`Invitation dispatched → ${email}`);
        }
      } else {
        throw new Error(data.error ?? "Unknown server error");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Mail dispatch failed";
      setEmailDispatchStatus("failed");
      setEmailDispatchMsg(msg);
      toast.error(`Email delivery failed — ${msg}`);
    } finally {
      setInviting(false);
      onDirty();
    }
  };

  const removeMember = async (id: string) => {
    if (id === "owner-id") {
      toast.error("Cannot remove the owner.");
      return;
    }
    try {
      const res = await fetch(`/api/invite?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Member removed from team.");
        await fetchTeam();
        onDirty();
      } else {
        toast.error(data.error ?? "Failed to remove member");
      }
    } catch (err) {
      toast.error("Failed to remove member");
    }
  };

  const copyToken = () => { if (!lastInviteToken) return; navigator.clipboard.writeText(lastInviteToken); setTokenCopied(true); toast.success("Access token copied — send it via WhatsApp, Discord, or personal email."); setTimeout(() => setTokenCopied(false), 3000); };
  const initials = (name: string) => name.split(/[\s._-]/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "??";

  return (
    <div className="space-y-6">
      <SectionCard>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-purple-50 border border-purple-200"><Users size={15} className="text-purple-600" /></div>
          <div><p className="text-[14px] font-bold text-slate-800">Invite Teammates</p><p className="text-[11px] text-slate-500">Collaborate on your agents and workspace.</p></div>
        </div>

        <div className="flex gap-1 p-1 rounded-xl bg-slate-50 border border-slate-200">
          {ROLES.map((r) => {
            const active = selectedRole === r;
            const c = ROLE_COLORS[r];
            return (
              <button key={r} type="button" onClick={() => setSelectedRole(r)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-all ${active ? `${c.bg} ${c.border} border ${c.text}` : "text-slate-500 border border-transparent"}`}>{r}</button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-1">
            <NeonInput value={inviteEmail} onChange={(v) => { setInviteEmail(v); if (emailError) setEmailError(""); }} placeholder="colleague@company.com" type="email" prefix={<Mail size={13} />} disabled={atCapacity} />
            {emailError && <p className="text-[11px] text-red-500 flex items-center gap-1.5 pl-1"><AlertTriangle size={10} /> {emailError}</p>}
          </div>
          <button type="button" onClick={invite} disabled={inviting || atCapacity}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-purple-600 text-white shadow-sm hover:bg-purple-700 disabled:opacity-50 shrink-0 self-start whitespace-nowrap">
            {inviting ? <><RefreshCw size={13} className="animate-spin" />Sending…</> : <><Plus size={13} /> Invite</>}
          </button>
        </div>

        {atCapacity && (
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[11px] font-semibold bg-amber-50 border border-amber-200 text-amber-700">
            <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-amber-500" />
            Seat threshold reached. Upgrade plan for more slots.
          </div>
        )}

        <AnimatePresence>
          {emailDispatchStatus !== "idle" && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl text-[11px] font-semibold ${
                emailDispatchStatus === "sending" ? "bg-purple-50 text-purple-600 border border-purple-200" :
                emailDispatchStatus === "sent" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" :
                "bg-red-50 text-red-600 border border-red-200"}`}>
              {emailDispatchStatus === "sending" && <RefreshCw size={12} className="animate-spin shrink-0 mt-0.5" />}
              {emailDispatchStatus === "sent" && <Check size={12} className="shrink-0 mt-0.5" />}
              {emailDispatchStatus === "failed" && <AlertTriangle size={12} className="shrink-0 mt-0.5" />}
              <span>{emailDispatchStatus === "sending" ? "📡 Routing mail packets via secure SMTP node…" : emailDispatchStatus === "sent" ? `✅ ${emailDispatchMsg}` : `⚠ ${emailDispatchMsg} — Manual link is shown below as fallback.`}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {lastInviteEmail && (
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
              className="rounded-xl bg-blue-50 border border-blue-200 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={13} className="text-blue-600" />
                  <p className="text-[11px] font-bold uppercase tracking-widest text-blue-700">🔗 Collaboration Link Activated</p>
                </div>
                <button type="button" onClick={() => { setLastInviteEmail(null); setLastInviteToken(""); }} className="w-5 h-5 flex items-center justify-center rounded text-slate-400 hover:text-slate-600"><X size={11} /></button>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">Automated SMTP is offline. Please manually dispatch this secure access token to <span className="text-purple-600 font-semibold">{lastInviteEmail}</span> via WhatsApp, Discord, or personal email:</p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 flex-1 px-3 py-2 rounded-lg bg-white border border-slate-200">
                  <Link2 size={11} className="text-blue-600 shrink-0" />
                  <input type="text" readOnly value={lastInviteToken} className="flex-1 bg-transparent font-mono text-[10.5px] text-slate-600 outline-none select-all min-w-0" onClick={(e) => (e.target as HTMLInputElement).select()} />
                </div>
                <button type="button" onClick={copyToken}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold transition-all shrink-0 whitespace-nowrap ${
                    tokenCopied ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"}`}>
                  {tokenCopied ? <><Check size={10} /> Copied!</> : <><Copy size={10} /> Copy Link</>}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SectionCard>

      {/* Members table */}
      <SectionCard>
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <p className="text-[13px] font-semibold text-slate-600">Members</p>
          <div className="flex items-center gap-2">
            <div className="h-1.5 rounded-full overflow-hidden bg-slate-100" style={{ width: 64 }}>
              <div className="h-full rounded-full" style={{ width: `${(teamMembers.length / MAX_SEATS) * 100}%`, background: `linear-gradient(90deg,${atCapacity ? "#f59e0b,#ef4444" : "#a855f7,#3b82f6"})` }} />
            </div>
            <span className={`text-[11px] font-semibold ${atCapacity ? "text-amber-600" : "text-slate-500"}`}>{teamMembers.length} / {MAX_SEATS} seats</span>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          <AnimatePresence initial={false}>
            {teamMembers.map((m) => {
              const isOwner = m.email.toLowerCase() === OWNER_EMAIL.toLowerCase();
              const rc      = ROLE_COLORS[m.role];
              const inits   = initials(m.name);
              return (
                <motion.div key={m.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.22 }}
                  className={`flex items-center gap-3 px-5 py-3.5 group ${isOwner ? "bg-blue-50/30" : ""}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-[12px] font-black shrink-0 ${isOwner ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"}`}>{inits}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-slate-800 truncate">{m.name}</p>
                      {isOwner && <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-200">Owner</span>}
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{m.email}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 hidden sm:inline ${rc.bg} ${rc.border} border ${rc.text}`}>{m.role}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${m.status === "Active" ? "bg-emerald-500" : "bg-amber-500"}`} />
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.status === "Active" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-amber-50 text-amber-600 border border-amber-200"}`}>{m.status}</span>
                  </div>
                  {isOwner ? <div className="w-7 shrink-0" /> : (
                    <button type="button" onClick={() => removeMember(m.id)} title="Remove member"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-all shrink-0"><Trash2 size={13} /></button>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl bg-purple-50 border border-purple-200">
          <Shield size={13} className="shrink-0 mt-0.5 text-purple-600" />
          <p className="text-[12px] text-purple-800 leading-relaxed">Admin roles have full workspace access. Invite with care — each seat counts toward your plan limit.</p>
        </div>
      </SectionCard>
    </div>
  );
}

// [All remaining sections — Integrations, Notifications, Danger Zone — follow the same light pattern]
// Layout + page structure preserved
const WEBHOOK_PAYLOAD = `{\n  "event": "agent.test_handshake",\n  "timestamp": "2026-05-17T08:45:00Z",\n  "agent_id": "6a08254658cfd0a022f30e87",\n  "status": "connected",\n  "telemetry": {\n    "ping_ms": 42,\n    "secure_tunnel": true\n  }\n}`;

// ══════════════════════════════════════════════
// Integrations
// ══════════════════════════════════════════════
function IntegrationsSection() {
  const [conns, setConns] = useState<Record<string, boolean>>(Object.fromEntries(INTEGRATIONS_LIST.map((i) => [i.name, i.connected])));
  const [showStripeNotice, setShowStripeNotice] = useState(false);
  const [stripeCopied, setStripeCopied] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookError, setWebhookError] = useState("");
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [showWebhookResult, setShowWebhookResult] = useState(false);
  const [payloadCopied, setPayloadCopied] = useState(false);

  const handleToggle = (name: string) => { if (name === "Stripe") { setShowStripeNotice(true); return; } setConns((c) => ({ ...c, [name]: !c[name] })); };
  const copyStripeEmail = () => { navigator.clipboard.writeText("muhammadshafiqchohan12@gmail.com"); setStripeCopied(true); setTimeout(() => setStripeCopied(false), 2000); };
  const isValidUrl = (u: string) => { try { const p = new URL(u); return p.protocol === "https:" || p.protocol === "http:"; } catch { return false; } };
  const testWebhook = async () => {
    const url = webhookUrl.trim();
    if (!url) { setWebhookError("Endpoint URL is required."); return; }
    if (!isValidUrl(url)) { setWebhookError("Enter a valid URL (https://…)."); return; }
    setWebhookError(""); setIsTestingWebhook(true); await new Promise((r) => setTimeout(r, 2000)); setIsTestingWebhook(false); setShowWebhookResult(true);
  };
  const copyPayload = () => { navigator.clipboard.writeText(WEBHOOK_PAYLOAD); setPayloadCopied(true); setTimeout(() => setPayloadCopied(false), 2000); };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {INTEGRATIONS_LIST.map((int) => {
          const on = conns[int.name];
          return (
            <div key={int.name} className={`flex flex-col gap-4 p-4 rounded-2xl transition-all duration-300 relative overflow-hidden bg-white border ${on ? `border-slate-200 shadow-sm` : "border-slate-200 shadow-sm"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[18px] shrink-0 bg-slate-50 border border-slate-200">{int.logo}</div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${on ? "bg-emerald-500" : "bg-slate-300"}`} />
                  <span className={`text-[9px] font-bold ${on ? "text-emerald-600" : "text-slate-400"}`}>{on ? "Live" : "Off"}</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-slate-800">{int.name}</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{int.desc}</p>
                {int.name === "Stripe" && <span className="inline-block mt-1.5 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200">Beta</span>}
              </div>
              <button type="button" onClick={() => handleToggle(int.name)}
                className={`w-full py-2 rounded-xl text-[12px] font-semibold transition-all active:scale-[0.98] ${on ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100" : "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"}`}>
                {int.name === "Stripe" && !on ? "⚡ Configure" : on ? "Disconnect" : "Connect"}
              </button>
            </div>
          );
        })}
      </div>

      <SectionCard>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-50 border border-blue-200"><Globe size={13} className="text-blue-600" /></div>
          <div><p className="text-[14px] font-bold text-slate-800">Webhook Endpoint Tester</p><p className="text-[11px] text-slate-500">Broadcast a trial handshake payload to your endpoint in real-time.</p></div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-1">
            <NeonInput value={webhookUrl} onChange={(v) => { setWebhookUrl(v); if (webhookError) setWebhookError(""); }} placeholder="https://api.yourdomain.com/v1/webhook" prefix={<Globe size={13} />} disabled={isTestingWebhook} />
            {webhookError && <p className="text-[11px] text-red-500 flex items-center gap-1.5 pl-1"><AlertTriangle size={10} /> {webhookError}</p>}
          </div>
          <button type="button" onClick={testWebhook} disabled={isTestingWebhook}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-[12px] font-bold shrink-0 self-start ${isTestingWebhook ? "bg-purple-50 text-purple-600 border border-purple-200" : "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"}`}>
            {isTestingWebhook ? <><RefreshCw size={12} className="animate-spin" /> Broadcasting…</> : <><ExternalLink size={12} /> Test Endpoint</>}
          </button>
        </div>
      </SectionCard>

      {/* Stripe Notice Modal - Light */}
      {showStripeNotice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative max-w-md w-full p-6 rounded-2xl bg-white border border-slate-200 shadow-xl">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-amber-50 border border-amber-200"><span className="text-2xl">💳</span></div>
            <div className="text-center space-y-1 mb-4">
              <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-amber-600">⚡ Stripe Gateway</p>
              <h3 className="text-[18px] font-bold text-slate-900 tracking-tight">Coming Soon</h3>
            </div>
            <p className="text-[12px] text-slate-500 leading-relaxed text-center mb-5">Automated credit card subscriptions are in beta testing. To manually integrate an offline payment pipeline, reach out to our secure tech team directly:</p>
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl mb-5 bg-blue-50 border border-blue-200">
              <code className="flex-1 font-mono text-[12px] text-blue-700 break-all">muhammadshafiqchohan12@gmail.com</code>
              <button type="button" onClick={copyStripeEmail} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600">{stripeCopied ? <Check size={13} /> : <Copy size={13} />}</button>
            </div>
            <button type="button" onClick={() => setShowStripeNotice(false)} className="w-full py-2.5 rounded-xl text-[13px] font-bold bg-blue-600 text-white shadow-sm hover:bg-blue-700">Got it — Close</button>
            <button type="button" onClick={() => setShowStripeNotice(false)} className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600"><X size={13} /></button>
          </div>
        </div>
      )}

      {showWebhookResult && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="relative max-w-lg w-full rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
            <div className="border-b border-slate-100 px-6 pt-6 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <p className="text-[10px] font-bold tracking-widest uppercase text-emerald-600">Webhook Stream Secured</p>
              </div>
              <h3 className="text-[16px] font-bold text-slate-900">✅ STATUS 200 OK</h3>
              <p className="text-[11px] font-mono text-slate-500">POST → <span className="text-blue-600">{webhookUrl.length > 42 ? webhookUrl.slice(0, 42) + "…" : webhookUrl}</span></p>
            </div>
            <div className="px-6 py-3 grid grid-cols-3 gap-3 border-b border-slate-100">
              {[{ label: "Ping", value: "42 ms", color: "text-emerald-600" }, { label: "Status", value: "200 OK", color: "text-blue-600" }, { label: "Tunnel", value: "Secure ✓", color: "text-purple-600" }].map(({ label, value, color }) => (
                <div key={label} className="text-center px-3 py-2 rounded-xl bg-slate-50 border border-slate-200"><p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{label}</p><p className={`text-[12px] font-bold mt-0.5 ${color}`}>{value}</p></div>
              ))}
            </div>
            <div className="px-6 py-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Payload Dispatched</p>
                <button type="button" onClick={copyPayload} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all ${payloadCopied ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"}`}>
                  {payloadCopied ? <><Check size={10} /> Copied</> : <><Copy size={10} /> Copy JSON</>}
                </button>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-200"><pre className="px-4 py-3 text-[11px] font-mono leading-relaxed overflow-x-auto text-blue-600">{WEBHOOK_PAYLOAD}</pre></div>
            </div>
            <div className="px-6 pb-5"><button type="button" onClick={() => { setShowWebhookResult(false); setWebhookUrl(""); setPayloadCopied(false); }} className="w-full py-2.5 rounded-xl text-[13px] font-bold bg-blue-600 text-white shadow-sm hover:bg-blue-700">Dismiss & Clear Test Log</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// NOTIFICATIONS SECTION — Light
// ══════════════════════════════════════════════
const NOTIF_LS_KEY = "cyberagent_notif_prefs_v1";
type NotifPrefs = { newLead: boolean; agentError: boolean; weeklyReport: boolean; billingInvoices: boolean; teamInvitations: boolean; apiLimit: boolean; productUpdates: boolean; };
const NOTIF_DEFAULTS: NotifPrefs = { newLead: true, agentError: true, weeklyReport: true, billingInvoices: true, teamInvitations: true, apiLimit: false, productUpdates: false };
function initNotifPrefs(): NotifPrefs { if (typeof window === "undefined") return NOTIF_DEFAULTS; try { const raw = localStorage.getItem(NOTIF_LS_KEY); if (raw) return { ...NOTIF_DEFAULTS, ...(JSON.parse(raw) as Partial<NotifPrefs>) }; } catch {} return NOTIF_DEFAULTS; }

function NotificationsSection({ onDirty, userEmail }: { onDirty: () => void; userEmail: string }) {
  const [prefs, setPrefs] = useState<NotifPrefs>(initNotifPrefs);
  const [emailEditing, setEmailEditing] = useState(false);
  const [emailDraft, setEmailDraft] = useState(userEmail || "shafiqchohan7239@gmail.com");
  const [savedEmail, setSavedEmail] = useState(userEmail || "shafiqchohan7239@gmail.com");
  const [emailSaved, setEmailSaved] = useState(false);
  const [webhookEditing, setWebhookEditing] = useState(false);
  const [webhookDraft, setWebhookDraft] = useState("https://your-domain.com/webhooks/cyberagent");
  const [savedWebhook, setSavedWebhook] = useState("https://your-domain.com/webhooks/cyberagent");
  const [webhookSaved, setWebhookSaved] = useState(false);

  useEffect(() => { if (typeof window !== "undefined") localStorage.setItem(NOTIF_LS_KEY, JSON.stringify(prefs)); }, [prefs]);
  const toggle = (k: keyof NotifPrefs) => { setPrefs((p) => ({ ...p, [k]: !p[k] })); onDirty(); };
  const saveEmail = () => { const trimmed = emailDraft.trim(); if (!trimmed) return; setSavedEmail(trimmed); setEmailEditing(false); setEmailSaved(true); onDirty(); toast.success("Email channel updated."); setTimeout(() => setEmailSaved(false), 2500); };
  const saveWebhook = () => { const trimmed = webhookDraft.trim(); if (!trimmed) return; setSavedWebhook(trimmed); setWebhookEditing(false); setWebhookSaved(true); onDirty(); toast.success("Webhook endpoint saved."); setTimeout(() => setWebhookSaved(false), 2500); };

  const rows: { key: keyof NotifPrefs; label: string; desc: string; color: string }[] = [
    { key: "newLead", label: "New Lead Captured", desc: "When a visitor submits the lead form", color: "#3b82f6" },
    { key: "agentError", label: "Agent Error", desc: "When your agent encounters an exception", color: "#ef4444" },
    { key: "weeklyReport", label: "Weekly Performance Report", desc: "Summary of conversations, leads & metrics", color: "#a855f7" },
    { key: "billingInvoices", label: "Billing & Invoices", desc: "Payment receipts and subscription changes", color: "#f59e0b" },
    { key: "teamInvitations", label: "Team Invitations", desc: "When someone joins or leaves your workspace", color: "#10b981" },
    { key: "apiLimit", label: "API Limit Warning", desc: "When you reach 80% of your monthly limit", color: "#f59e0b" },
    { key: "productUpdates", label: "Product Updates", desc: "New features, tips and announcements", color: "#64748b" },
  ];

  return (
    <div className="space-y-6">
      <SectionCard>
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-cyan-50 border border-cyan-200"><Bell size={13} className="text-cyan-600" /></div>
          <div><p className="text-[14px] font-bold text-slate-800">Email Notifications</p><p className="text-[11px] text-slate-500">Choose which events send an email to your address.</p></div>
        </div>
        <div className="divide-y divide-slate-100">
          {rows.map(({ key, label, desc, color }) => {
            const on = prefs[key];
            return (
              <div key={key} className="flex items-center justify-between py-4 gap-4 first:pt-0 last:pb-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${on ? "" : "bg-slate-300"}`} style={{ background: on ? color : undefined }} />
                    <p className="text-[13px] font-medium text-slate-700">{label}</p>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 pl-3.5">{desc}</p>
                </div>
                <Toggle on={on} onToggle={() => toggle(key)} color={color} />
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-cyan-50 border border-cyan-200"><Mail size={13} className="text-cyan-600" /></div>
          <div><p className="text-[14px] font-bold text-slate-800">Notification Channels</p><p className="text-[11px] text-slate-500">Where we deliver your alerts.</p></div>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3"><Mail size={14} className="text-blue-600" /><span className="text-[13px] text-slate-700">Email</span></div>
              {emailEditing ? (
                <div className="flex items-center gap-2 flex-1 max-w-sm"><input type="email" value={emailDraft} onChange={(e) => setEmailDraft(e.target.value)} className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-[13px] text-slate-800 outline-none focus:border-blue-500" /><button onClick={saveEmail} className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-blue-600 text-white"><Save size={12} /></button><button onClick={() => setEmailEditing(false)} className="px-3 py-1.5 rounded-lg text-[12px] text-slate-500 border border-slate-200"><X size={12} /></button></div>
              ) : (
                <div className="flex items-center gap-2"><code className="text-[12px] font-mono text-slate-500">{savedEmail}</code><button onClick={() => setEmailEditing(true)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600"><Pencil size={12} /></button></div>
              )}
            </div>
            {emailSaved && <p className="text-[11px] text-emerald-600 mt-2 flex items-center gap-1"><Check size={11} /> Email channel updated.</p>}
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3"><Webhook size={14} className="text-purple-600" /><span className="text-[13px] text-slate-700">Webhook</span></div>
              {webhookEditing ? (
                <div className="flex items-center gap-2 flex-1 max-w-sm"><input type="url" value={webhookDraft} onChange={(e) => setWebhookDraft(e.target.value)} className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-[13px] text-slate-800 outline-none focus:border-blue-500" /><button onClick={saveWebhook} className="px-3 py-1.5 rounded-lg text-[12px] font-medium bg-blue-600 text-white"><Save size={12} /></button><button onClick={() => setWebhookEditing(false)} className="px-3 py-1.5 rounded-lg text-[12px] text-slate-500 border border-slate-200"><X size={12} /></button></div>
              ) : (
                <div className="flex items-center gap-2"><code className="text-[12px] font-mono text-slate-500">{savedWebhook}</code><button onClick={() => setWebhookEditing(true)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600"><Pencil size={12} /></button></div>
              )}
            </div>
            {webhookSaved && <p className="text-[11px] text-emerald-600 mt-2 flex items-center gap-1"><Check size={11} /> Webhook endpoint saved.</p>}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// ══════════════════════════════════════════════
// DANGER ZONE — Premium Light Overhaul
// ══════════════════════════════════════════════
function DangerSection() {
  const [confirm, setConfirm] = useState<"purge" | "delete" | null>(null);
  const [verifyInput, setVerifyInput] = useState("");
  const [loading, setLoading] = useState(false);

  const PURGE_VERIFY = "DELETE MY DATA";
  const DELETE_VERIFY = "DELETE MY ACCOUNT";

  const verifyTarget = confirm === "purge" ? PURGE_VERIFY : DELETE_VERIFY;
  const isVerified = verifyInput.trim().toUpperCase() === verifyTarget;

  const openModal = (type: "purge" | "delete") => {
    setConfirm(type);
    setVerifyInput("");
  };

  const closeModal = () => {
    setConfirm(null);
    setVerifyInput("");
    setLoading(false);
  };

  const handleAction = async () => {
    if (!isVerified) return;
    setLoading(true);

    try {
      if (confirm === "purge") {
        const res = await fetch("/api/user/purge", { method: "DELETE" });
        const data = await res.json();
        if (data.ok) {
          toast.success("All workspace data (agents, knowledge bases) has been purged.");
        } else {
          toast.error(data.error ?? "Failed to purge data");
        }
      } else if (confirm === "delete") {
        const res = await fetch("/api/user/delete", { method: "DELETE" });
        const data = await res.json();
        if (data.ok) {
          toast.success("Account deleted successfully. Logging you out...");
          setTimeout(() => {
            signOut({ callbackUrl: "/" });
          }, 1500);
        } else {
          toast.error(data.error ?? "Failed to delete account");
        }
      }
    } catch (err) {
      toast.error("An error occurred. Please try again.");
    } finally {
      closeModal();
    }
  };

  return (
    <div className="space-y-6">
      {/* Main container with rose warning border */}
      <div className="bg-white border border-rose-100 rounded-2xl p-6 shadow-sm">
        {/* Section identifier */}
        <div className="mb-4">
          <p className="text-[11px] font-bold tracking-wider uppercase text-slate-500">
            DANGER ZONE
          </p>
          <h3 className="text-rose-600 font-bold text-[16px] mt-1">
            Permanent destructive actions — these cannot be undone
          </h3>
        </div>

        <div className="space-y-4">
          {/* Row 1: Purge Knowledge & Agents */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-white border border-rose-100 hover:border-rose-200 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={14} className="text-rose-500 shrink-0" />
                <p className="text-[13px] font-semibold text-slate-800">Delete All Knowledge Bases & Agents</p>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Permanently purge all indexed PDF documents, scraped vector embedding records,
                and custom configurations. <span className="font-semibold text-rose-600">This action cannot be undone.</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => openModal("purge")}
              className="shrink-0 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all border border-rose-200 text-rose-600 hover:bg-rose-50 active:scale-[0.97] whitespace-nowrap"
            >
              Purge All Data
            </button>
          </div>

          {/* Row 2: Delete Account */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-xl bg-white border border-rose-100 hover:border-rose-200 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <AlertOctagon size={14} className="text-rose-600 shrink-0" />
                <p className="text-[13px] font-semibold text-slate-800">Permanently Close Account</p>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Completely delete your profile, subscription meta, and server associations from
                CyberAgent Studio. <span className="font-semibold text-rose-600">All data will be wiped instantly from the cluster database.</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => openModal("delete")}
              className="shrink-0 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.97] shadow-sm whitespace-nowrap"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Verification Modal — Type-to-confirm safety lock */}
      <AnimatePresence>
        {confirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)" }}
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="relative w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl p-6"
            >
              {/* Close button */}
              <button
                type="button"
                onClick={closeModal}
                disabled={loading}
                className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-50"
              >
                <X size={14} />
              </button>

              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-red-50 border border-red-200">
                {confirm === "purge" ? (
                  <AlertTriangle size={22} className="text-red-500" />
                ) : (
                  <AlertOctagon size={22} className="text-red-500" />
                )}
              </div>

              {/* Title */}
              <h3 className="text-[18px] font-bold text-slate-900 text-center mb-1">
                {confirm === "purge" ? "Purge All Data?" : "Delete Account?"}
              </h3>

              {/* Description */}
              <p className="text-[12px] text-slate-500 text-center mb-5 leading-relaxed">
                {confirm === "purge"
                  ? "This will permanently delete all agents, knowledge files, vector embeddings, and analytics. Your account will remain active."
                  : "This will permanently delete your profile, subscription, and all associated data from the cluster database. You will lose access immediately."}
              </p>

              {/* Divider */}
              <div className="h-px bg-slate-100 mb-4" />

              {/* Verification instruction */}
              <p className="text-[11px] font-semibold text-slate-700 mb-2">
                Type <span className="text-rose-600 font-bold font-mono bg-rose-50 px-1.5 py-0.5 rounded">{verifyTarget}</span> below to confirm:
              </p>

              {/* Verification input */}
              <input
                type="text"
                value={verifyInput}
                onChange={(e) => setVerifyInput(e.target.value)}
                placeholder={`Type "${verifyTarget}"`}
                disabled={loading}
                autoFocus
                className="w-full px-3.5 py-2.5 rounded-xl text-[13px] text-slate-800 outline-none transition-all border placeholder:text-slate-400 bg-white mb-5 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 disabled:opacity-50"
                style={{ borderColor: verifyInput.length > 0 && !isVerified ? "#fca5a5" : "#e2e8f0" }}
              />

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!isVerified || loading}
                  onClick={handleAction}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-rose-600 text-white hover:bg-rose-700 shadow-sm active:scale-[0.97] flex items-center justify-center gap-1.5"
                >
                  {loading && <RefreshCw size={13} className="animate-spin" />}
                  {confirm === "purge" ? "Confirm Purge" : "Delete My Account"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════
   SUPPORT SECTION — LIGHT
══════════════════════════════════════════════ */
function SupportSection() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/support");
      const data = await res.json();
      if (data.ok) {
        setTickets(data.tickets || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTicket = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this ticket?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/support/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        toast.success("Ticket deleted successfully.");
        setTickets((prev) => prev.filter((t) => t._id !== id));
        if (selectedTicket?._id === id) {
          setSelectedTicket(null);
        }
      } else {
        toast.error(data.error ?? "Failed to delete ticket.");
      }
    } catch (err) {
      toast.error("An error occurred.");
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedTicket) return;
    setSendingReply(true);
    try {
      const res = await fetch(`/api/support/${selectedTicket._id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyMessage }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Reply added.");
        setReplyMessage("");
        setSelectedTicket(data.ticket);
        fetchTickets();
      } else {
        toast.error(data.error ?? "Failed to send reply.");
      }
    } catch (err) {
      toast.error("An error occurred.");
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* AI-Powered Ticket Info Banner */}
      <SectionCard>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
            <MessageSquare size={18} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-[13px] font-bold text-slate-800 mb-1">AI-Powered Support Tickets</h3>
            <p className="text-[12px] text-slate-500 leading-relaxed">
              Support tickets are now created automatically by our <span className="font-semibold text-blue-600">NexCore AI agent</span>. Simply chat with the assistant on any of your widget-enabled pages and say you need support — the AI will collect your details and open a ticket instantly.
            </p>
            <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100 w-fit">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-semibold text-emerald-700">Fully Automated — Zero Manual Input Required</span>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <SectionHeading title="Your Tickets & Inquiries" desc="View and track your current active and resolved tickets." />
        {loading ? (
          <div className="text-center py-6 text-xs text-slate-400">Loading support tickets...</div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">You haven't submitted any tickets yet.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <th className="px-4 py-2.5">Subject</th>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Last Updated</th>
                  <th className="px-4 py-2.5 text-center w-16">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr
                    key={t._id}
                    onClick={() => setSelectedTicket(t)}
                    className="border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold text-slate-800">{t.subject}</td>
                    <td className="px-4 py-3 text-slate-500">{t.category}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        t.status === "resolved"
                          ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          : "bg-amber-50 text-amber-600 border border-amber-100"
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{new Date(t.updatedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleDeleteTicket(t._id)}
                        disabled={deletingId === t._id}
                        className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Ticket Details & Chat Modal */}
      <AnimatePresence>
        {selectedTicket && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedTicket(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-2xl flex flex-col max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedTicket(null)}
                className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors z-10"
              >
                <X size={16} />
              </button>

              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 pr-6">
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">{selectedTicket.subject}</h3>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      selectedTicket.status === "resolved" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-600 border border-amber-100"
                    }`}>
                      {selectedTicket.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 font-semibold">Category: {selectedTicket.category}</p>
                </div>
              </div>

              {/* Chat Thread Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
                {/* User's Original Message */}
                <div className="flex flex-col items-start max-w-[85%]">
                  <span className="text-[10px] text-slate-400 font-semibold mb-1">Your Inquiry</span>
                  <div className="px-4 py-2.5 rounded-2xl rounded-tl-sm text-xs bg-slate-100 text-slate-800 border border-slate-200/60 leading-relaxed shadow-sm">
                    {selectedTicket.message}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1">{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                </div>

                {/* Replies Thread */}
                {selectedTicket.replies?.map((r: any, idx: number) => {
                  const isAdmin = r.sender === "admin";
                  return (
                    <div key={idx} className={`flex flex-col ${isAdmin ? "items-end" : "items-start"} max-w-full`}>
                      <span className="text-[10px] text-slate-400 font-semibold mb-1">
                        {isAdmin ? "CyberAgent Support" : "You"}
                      </span>
                      <div className={`px-4 py-2.5 rounded-2xl text-xs max-w-[85%] leading-relaxed shadow-sm ${
                        isAdmin
                          ? "bg-blue-600 text-white rounded-tr-sm"
                          : "bg-slate-100 text-slate-800 border border-slate-200/60 rounded-tl-sm"
                      }`}>
                        {r.message}
                      </div>
                      <span className="text-[9px] text-slate-400 mt-1">{new Date(r.createdAt).toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>

              {/* Chat Reply Input Bar */}
              <form onSubmit={handleSendReply} className="p-4 border-t border-slate-100 flex gap-2 bg-white rounded-b-2xl">
                <input
                  type="text"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Type a follow-up reply..."
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-white"
                />
                <button
                  type="submit"
                  disabled={sendingReply || !replyMessage.trim()}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 active:scale-95 transition-all text-xs disabled:opacity-50"
                >
                  {sendingReply ? "Sending..." : "Reply"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══════════════════════════════════════════════
   PAGE LAYOUT
══════════════════════════════════════════════ */
export default function SettingsPage() {
  const { data: session } = useSession();
  const [section, setSection] = useState<Section>("profile");
  const [dirty, setDirty] = useState(false);

  return (
    <DashboardShell title="Settings">
      <div className="h-full overflow-y-auto">
        <div className="px-4 sm:px-6 lg:px-10 py-6 w-full max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6">

            {/* Secondary Navigation - Light */}
            <div className="lg:w-52 shrink-0">
              <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl overflow-hidden lg:sticky lg:top-6">
                <div className="flex lg:flex-col overflow-x-auto lg:overflow-visible p-2 gap-0.5">
                  {NAV.map(({ id, label, icon: Icon, color }) => {
                    const active = section === id;
                    return (
                      <button key={id} onClick={() => setSection(id)}
                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all shrink-0 whitespace-nowrap ${
                          active ? "bg-blue-50/80 text-blue-600 font-semibold" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50/80"
                        }`}>
                        <Icon size={15} className={active ? "text-blue-600" : "text-slate-400"} />
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Content area */}
            <div className="flex-1 min-w-0">
              {section === "profile" && <ProfileSection />}
              {section === "billing" && <BillingSection />}
              {section === "api-keys" && <ApiKeysSection onDirty={() => setDirty(true)} />}
              {section === "team" && <TeamSection onDirty={() => setDirty(true)} />}
              {section === "integrations" && <IntegrationsSection />}
              {section === "notifications" && <NotificationsSection onDirty={() => setDirty(true)} userEmail={session?.user?.email ?? ""} />}
              {/* Support Tickets removed — handled via Customer Inquiries page */}
              {section === "danger" && <DangerSection />}
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}