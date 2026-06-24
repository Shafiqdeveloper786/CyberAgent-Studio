"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useAdminMetrics } from "@/lib/swr";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Users, Bot, Shield, AlertCircle, AlertTriangle, CheckCircle, XCircle,
  MoreHorizontal, Play, Pause, Ban, RefreshCw, MessageSquare,
  TrendingUp, BarChart3, PieChart as LucidePieChart, Trash2,
  Crown, Activity, Mail, Inbox, CreditCard, Copy, Check, Send,
  ChevronRight, Globe, Lock, Clock, ArrowLeft
} from "lucide-react";

import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

/* ── Types ── */
interface AdminMetrics {
  totalUsers:    number;
  verifiedUsers: number;
  totalAgents:   number;
  activeAgents:  number;
  inactiveAgents: number;
  totalMessages: number;
}

interface AdminAnalytics {
  userGrowth:        { month: string; signups: number }[];
  agentDistribution: { active: number; inactive: number };
}

interface AdminUser {
  _id:        string;
  name:       string;
  email:      string;
  isVerified: boolean;
  isBlocked:  boolean;
  role:       string;
  subscription: string;
  createdAt:  string;
  authMethod: string;
}

interface AdminAgent {
  _id:          string;
  name:         string;
  persona:      string;
  status:       string;
  messageCount: number;
  createdAt:    string;
  userId:       { email: string; name: string } | null;
}

const PIE_COLORS = ["#10b981", "#64748b"];

type AdminTab = "users" | "agents" | "inbox" | "transactions";

interface SupportTicket {
  _id:          string;
  type:         "internal" | "external";
  tenantId?:    string;
  contactEmail: string;
  contactName:  string;
  subject:      string;
  chatContext:  { role: string; content: string; timestamp: string }[];
  status:       "pending" | "in-progress" | "resolved";
  replies:      { sender: "admin" | "user" | "visitor"; message: string; timestamp: string }[];
  createdAt:    string;
  updatedAt:    string;
}

/* ═══════════════════════════════════════════
   Kebab Menu
═══════════════════════════════════════════ */
function KebabMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 min-w-[160px] bg-white rounded-xl border border-slate-200 shadow-lg py-1">
            {children}
          </div>
        </>
      )}
    </div>
  );
}

function KebabItem({ onClick, icon, label, danger }: {
  onClick: () => void; icon: React.ReactNode; label: string; danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-medium transition-colors ${
        danger ? "text-rose-600 hover:bg-rose-50" : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      {icon}{label}
    </button>
  );
}

/* ═══════════════════════════════════════════
   Main Admin Page
═══════════════════════════════════════════ */
export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [metrics,   setMetrics]   = useState<AdminMetrics | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [users,     setUsers]     = useState<AdminUser[]>([]);
  const [agents,    setAgents]    = useState<AdminAgent[]>([]);
  const [error,     setError]     = useState("");
  const [tab,       setTab]       = useState<AdminTab>("users");
  const [toast,     setToast]     = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [txSearch, setTxSearch] = useState("");
  const [txStatusFilter, setTxStatusFilter] = useState("all");

  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [supportSearch, setSupportSearch] = useState("");
  const [supportStatusFilter, setSupportStatusFilter] = useState("all");
  const [supportIsInternal, setSupportIsInternal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    setConfirmState({
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmState(null);
      }
    });
  };

  const fetchTransactions = async () => {
    setLoadingTransactions(true);
    try {
      const res = await fetch(`/api/admin/transactions?search=${encodeURIComponent(txSearch)}&status=${txStatusFilter}`);
      const data = await res.json();
      if (data.ok) {
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error("Failed to fetch transactions", err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleTransactionAction = async (id: string, action: "approve" | "reject" | "refund") => {
    confirmAction(
      action === "approve" ? "Approve Transaction?" : action === "reject" ? "Reject Transaction?" : "Refund Transaction?",
      `Are you sure you want to ${action} this transaction? This will update the status to ${
        action === "approve" ? "succeeded" : action === "reject" ? "rejected" : "refunded"
      } and update the user's plan.`,
      async () => {
        try {
          const res = await fetch(`/api/admin/transactions/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action }),
          });
          const data = await res.json();
          if (data.ok) {
            showToast(`Transaction ${action}ed`);
            fetchTransactions();
          } else {
            showToast(data.error ?? "Failed to update transaction");
          }
        } catch (err) {
          showToast("An error occurred");
        }
      }
    );
  };

  const fetchSupportTickets = async (isInternal: boolean) => {
    setLoadingTickets(true);
    try {
      const res = await fetch(
        `/api/admin/support?search=${encodeURIComponent(supportSearch)}&status=${supportStatusFilter}&isInternal=${isInternal}`
      );
      const data = await res.json();
      if (data.ok) {
        setSupportTickets(data.tickets || []);
      }
    } catch (err) {
      console.error("Failed to fetch support tickets", err);
    } finally {
      setLoadingTickets(false);
    }
  };

  /* ── Polling: check for new external tickets every 15s ── */
  useEffect(() => {
    if (tab !== "inbox") return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/admin/support?isInternal=false&status=all`);
        const data = await res.json();
        if (!data.ok) return;
        const newTickets: SupportTicket[] = data.tickets || [];
        setSupportTickets((prev) => {
          const existingIds = new Set(prev.map((t) => t._id));
          const freshOnes = newTickets.filter((t) => !existingIds.has(t._id));
          if (freshOnes.length > 0) {
            freshOnes.forEach((t) => {
              showToast(`🔔 New ${t.type} ticket: "${t.subject}" from ${t.contactName}`);
            });
            return newTickets;
          }
          return prev;
        });
      } catch {
        /* silent */
      }
    };

    poll();
    pollingRef.current = setInterval(poll, 15000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [tab]);

  const handleCycleTicketStatus = async (id: string, currentStatus: string) => {
    const cycle: Record<string, string> = {
      "pending":     "in-progress",
      "in-progress": "resolved",
      "resolved":    "pending",
    };
    const nextStatus = cycle[currentStatus] ?? "pending";
    try {
      const res = await fetch(`/api/admin/support/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(`Ticket → ${nextStatus}`);
        if (selectedTicket && selectedTicket._id === id) {
          setSelectedTicket(data.ticket);
        }
        fetchSupportTickets(supportIsInternal);
      } else {
        showToast(data.error ?? "Failed to update ticket");
      }
    } catch {
      showToast("An error occurred");
    }
  };

  const handleAdminReply = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSendingReply(true);
    try {
      const res = await fetch(`/api/admin/support/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast("Reply sent");
        setReplyText("");
        setSelectedTicket(data.ticket);
        fetchSupportTickets(supportIsInternal);
      } else {
        showToast(data.error ?? "Failed to send reply");
      }
    } catch {
      showToast("An error occurred");
    } finally {
      setSendingReply(false);
    }
  };

  const handleDeleteTicket = (id: string) => {
    confirmAction(
      "Delete Support Ticket?",
      "Are you sure you want to permanently delete this ticket? This action cannot be undone.",
      async () => {
        try {
          const res = await fetch(`/api/admin/support/${id}`, { method: "DELETE" });
          const data = await res.json();
          if (data.ok) {
            showToast("Ticket deleted");
            /* Optimistic removal from state */
            setSupportTickets((prev) => prev.filter((t) => t._id !== id));
            if (selectedTicket?._id === id) setSelectedTicket(null);
          } else {
            showToast(data.error ?? "Failed to delete ticket");
          }
        } catch {
          showToast("An error occurred");
        }
      }
    );
  };

  useEffect(() => {
    if (tab === "transactions") {
      fetchTransactions();
    }
  }, [tab, txSearch, txStatusFilter]);

  useEffect(() => {
    if (tab === "inbox") {
      fetchSupportTickets(supportIsInternal);
    }
  }, [tab, supportSearch, supportStatusFilter, supportIsInternal]);

  const { data: adminData, isLoading: loading, mutate: fetchData } = useAdminMetrics(status === "authenticated");

  useEffect(() => {
    if (status === "unauthenticated") { router.replace("/dashboard"); }
  }, [status, router]);

  useEffect(() => {
    if (adminData) {
      if (adminData.error) {
        setError(adminData.error);
      } else {
        setError("");
        setMetrics(adminData.metrics);
        setAnalytics(adminData.analytics);
        setUsers(adminData.recentUsers ?? []);
        setAgents(adminData.agents ?? []);
      }
    }
  }, [adminData]);

  /* ── Actions ── */
  const blockUser = async (id: string, block: boolean) => {
    await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: block ? "block" : "unblock" }) });
    setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, isBlocked: block } : u)));
    if (selectedUser && selectedUser._id === id) {
      setSelectedUser((prev) => prev ? { ...prev, isBlocked: block } : null);
    }
    showToast(block ? "User blocked" : "User unblocked");
  };

  const promoteUser = async (id: string) => {
    await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "promote" }) });
    setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, role: "admin" } : u)));
    if (selectedUser && selectedUser._id === id) {
      setSelectedUser((prev) => prev ? { ...prev, role: "admin" } : null);
    }
    showToast("User promoted to admin");
  };

  const updatePlan = async (id: string, plan: string) => {
    await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update_plan", plan }) });
    setUsers((prev) => prev.map((u) => (u._id === id ? { ...u, subscription: plan } : u)));
    if (selectedUser && selectedUser._id === id) {
      setSelectedUser((prev) => prev ? { ...prev, subscription: plan } : null);
    }
    showToast(`Plan updated to ${plan.toUpperCase()}`);
  };

  const toggleAgent = async (id: string) => {
    const res = await fetch(`/api/admin/agents/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggle" }) });
    const data = await res.json();
    if (data.status) {
      setAgents((prev) => prev.map((a) => (a._id === id ? { ...a, status: data.status } : a)));
      showToast(`Agent ${data.status === "active" ? "started" : "stopped"}`);
    }
  };

  const purgeKnowledge = async (id: string) => {
    const res = await fetch(`/api/admin/agents/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "purge" }) });
    const data = await res.json();
    showToast(`Knowledge base purged (${data.deletedCount ?? 0} files removed)`);
  };

  const resetMessageCount = async (id: string) => {
    await fetch(`/api/admin/agents/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "quota", messageCount: 0 }) });
    setAgents((prev) => prev.map((a) => (a._id === id ? { ...a, messageCount: 0 } : a)));
    showToast("Message count reset");
  };

  const handleBlockConfirm = (id: string, block: boolean) => {
    confirmAction(
      block ? "Block User Account?" : "Restore User Access?",
      block
        ? "Are you sure you want to temporarily suspend this user? They will be immediately blocked from signing in or using the workspace."
        : "Are you sure you want to restore access for this user? They will be able to log in again.",
      () => blockUser(id, block)
    );
  };

  const handlePromoteConfirm = (id: string) => {
    confirmAction(
      "Promote User to Admin?",
      "Are you sure you want to promote this user to Administrator? This grants full control over the admin dashboard and cannot be reversed easily from the UI.",
      () => promoteUser(id)
    );
  };

  const handlePurgeConfirm = (id: string) => {
    confirmAction(
      "Purge Agent Knowledge?",
      "Are you sure you want to delete all scraped knowledge sources and index files for this agent? This cannot be undone.",
      () => purgeKnowledge(id)
    );
  };

  const handleResetConfirm = (id: string) => {
    confirmAction(
      "Reset Agent Message Count?",
      "Are you sure you want to reset the message count back to 0 for this agent? This resets their monthly quota metrics.",
      () => resetMessageCount(id)
    );
  };

  return (
    <DashboardShell title="Admin Panel">
      <div className="p-6 space-y-6 max-w-7xl mx-auto pb-12 relative">
        {/* Toast */}
        {toast && (
          <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-medium shadow-lg animate-in">
            {toast}
          </div>
        )}

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20">
              <Shield size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Admin Panel</h1>
              <p className="text-xs text-slate-500">System overview & command center</p>
            </div>
          </div>
          <button onClick={() => { fetchData(); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Loading admin data...</div>
        ) : metrics && analytics ? (
          <>
            {/* ════════════════════════════════════
                METRICS CARDS
            ════════════════════════════════════ */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
              <MetricCard icon={<Users size={16} className="text-blue-600" />} label="Total Users" value={metrics.totalUsers} bg="bg-blue-50 border-blue-100" />
              <MetricCard icon={<CheckCircle size={16} className="text-emerald-600" />} label="Verified" value={metrics.verifiedUsers} bg="bg-emerald-50 border-emerald-100" />
              <MetricCard icon={<Bot size={16} className="text-violet-600" />} label="All Agents" value={metrics.totalAgents} bg="bg-violet-50 border-violet-100" />
              <MetricCard icon={<Play size={16} className="text-emerald-600" />} label="Active" value={metrics.activeAgents} bg="bg-emerald-50 border-emerald-100" />
              <MetricCard icon={<Pause size={16} className="text-amber-600" />} label="Inactive" value={metrics.inactiveAgents} bg="bg-amber-50 border-amber-100" />
              <MetricCard icon={<MessageSquare size={16} className="text-blue-600" />} label="Total Messages" value={metrics.totalMessages} bg="bg-blue-50 border-blue-100" />
            </div>

            {/* ════════════════════════════════════
                SYSTEM HEALTH TICKER
            ════════════════════════════════════ */}
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
              <Activity size={14} className="text-emerald-600 shrink-0" />
              <span className="text-emerald-700 font-medium">System Healthy</span>
              <span className="text-emerald-500">·</span>
              <span className="text-emerald-600">{metrics.totalUsers} users · {metrics.totalAgents} agents · {metrics.totalMessages} messages processed</span>
              <span className="text-emerald-500">·</span>
              <span className="text-emerald-600 font-mono">API: Online</span>
            </div>

            {/* ════════════════════════════════════
                CHARTS ROW
            ════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={14} className="text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">User Growth</h3>
                </div>
                {analytics.userGrowth.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={analytics.userGrowth}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => v.slice(5)} />
                      <YAxis tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} />
                      <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }} labelFormatter={(v) => `Month: ${v}`} />
                      <Line type="monotone" dataKey="signups" stroke="#2563eb" strokeWidth={2} dot={{ fill: "#2563eb", r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[180px] text-xs text-slate-400">No data yet</div>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 size={14} className="text-violet-600" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Msg Throughput</h3>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={[{ name: "Total", messages: metrics.totalMessages }]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#64748b" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#64748b" }} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="messages" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <LucidePieChart size={14} className="text-emerald-600" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Agent Status</h3>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={[{ name: "Active", value: analytics.agentDistribution.active }, { name: "Inactive", value: analytics.agentDistribution.inactive }]} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4} dataKey="value">
                      {[0, 1].map((i) => (<Cell key={i} fill={PIE_COLORS[i]} />))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 text-[10px] text-slate-500 mt-1">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Active</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400" /> Inactive</span>
                </div>
              </div>
            </div>

            {/* ════════════════════════════════════
                TAB BAR
            ════════════════════════════════════ */}
            <div className="flex gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200/60 w-fit">
              {(["users", "agents", "inbox", "transactions"] as AdminTab[]).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    tab === t ? "bg-white border border-slate-200/50 text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {t === "users" ? <Users size={12} /> : t === "agents" ? <Bot size={12} /> : t === "inbox" ? <Inbox size={12} /> : <CreditCard size={12} />}
                  {t === "users" ? "Users" : t === "agents" ? "Agents" : t === "inbox" ? "Support Inbox" : "Transactions"}
                </button>
              ))}
            </div>

            {/* ════════════════════════════════════
                SUPPORT INBOX
            ════════════════════════════════════ */}
            {tab === "inbox" && (
              <section className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">Support Inbox</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{supportTickets.length} ticket{supportTickets.length !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <select value={supportStatusFilter} onChange={(e) => setSupportStatusFilter(e.target.value)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none bg-white text-slate-700">
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="in-progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                    </select>
                    <input type="text" placeholder="Search tickets…" value={supportSearch}
                      onChange={(e) => setSupportSearch(e.target.value)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 w-40 bg-white" />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                  <div className="lg:col-span-2 space-y-2">
                    {loadingTickets ? (
                      <div className="p-8 text-center text-xs text-slate-400">Loading tickets…</div>
                    ) : supportTickets.length === 0 ? (
                      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
                        <Inbox size={24} className="text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-400">No tickets match the current filters.</p>
                      </div>
                    ) : (
                      supportTickets.map((tk) => (
                        <div key={tk._id} role="button" tabIndex={0}
                          onClick={() => { setSelectedTicket(tk); setReplyText(""); }}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedTicket(tk); setReplyText(""); } }}
                          className={`w-full text-left rounded-xl border p-3 transition-all cursor-pointer ${selectedTicket?._id === tk._id ? "border-blue-300 bg-blue-50/60 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"}`}>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <span className="text-[11px] font-bold text-slate-800 leading-tight line-clamp-1 flex-1">{tk.subject}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${tk.type === "internal" ? "bg-blue-50 text-blue-600 border border-blue-200" : "bg-violet-50 text-violet-600 border border-violet-200"}`}>
                                {tk.type === "internal" ? <Lock size={7} className="inline mr-0.5" /> : <Globe size={7} className="inline mr-0.5" />}{tk.type}
                              </span>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteTicket(tk._id); }}
                                title="Delete ticket" className="p-1 rounded hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-colors">
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate">{tk.contactEmail}</p>
                          <div className="flex items-center justify-between mt-1.5">
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${tk.status === "resolved" ? "bg-emerald-50 text-emerald-600" : tk.status === "in-progress" ? "bg-amber-50 text-amber-600" : "bg-rose-50 text-rose-600"}`}>{tk.status}</span>
                            <span className="text-[9px] text-slate-400">{new Date(tk.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="lg:col-span-3">
                    {!selectedTicket ? (
                      <div className="rounded-xl border border-slate-200 bg-white h-full min-h-[300px] flex items-center justify-center">
                        <div className="text-center">
                          <MessageSquare size={24} className="text-slate-200 mx-auto mb-2" />
                          <p className="text-xs text-slate-400">Select a ticket to view details</p>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col" style={{ maxHeight: 560 }}>
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${selectedTicket.type === "internal" ? "bg-blue-50 text-blue-600 border border-blue-200" : "bg-violet-50 text-violet-600 border border-violet-200"}`}>{selectedTicket.type}</span>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${selectedTicket.status === "resolved" ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : selectedTicket.status === "in-progress" ? "bg-amber-50 text-amber-600 border border-amber-200" : "bg-rose-50 text-rose-600 border border-rose-200"}`}>{selectedTicket.status}</span>
                              </div>
                              <h3 className="text-sm font-bold text-slate-800 line-clamp-1">{selectedTicket.subject}</h3>
                              <p className="text-[11px] text-slate-500 mt-0.5">{selectedTicket.contactName} · {selectedTicket.contactEmail}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button onClick={() => handleCycleTicketStatus(selectedTicket._id, selectedTicket.status)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                                <Clock size={11} /> {selectedTicket.status === "pending" ? "Mark In Progress" : selectedTicket.status === "in-progress" ? "Mark Resolved" : "Reopen"}
                              </button>
                              <button onClick={() => setSelectedTicket(null)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><XCircle size={15} /></button>
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                          {selectedTicket.chatContext && selectedTicket.chatContext.length > 0 && (
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Original Conversation</p>
                              <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 space-y-2 max-h-48 overflow-y-auto">
                                {selectedTicket.chatContext.map((msg, i) => (
                                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                    <div className={`px-3 py-1.5 rounded-xl text-[11px] leading-relaxed max-w-[85%] ${msg.role === "user" ? "bg-blue-600 text-white" : "bg-white border border-slate-200 text-slate-700"}`}>{msg.content}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {(selectedTicket.replies?.length ?? 0) > 0 && (
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Reply Thread</p>
                              <div className="space-y-2">
                                {selectedTicket.replies.map((r, i) => (
                                  <div key={i} className={`flex ${r.sender === "visitor" ? "justify-start" : "justify-end"}`}>
                                    <div className={`px-3 py-2 rounded-xl text-[11px] leading-relaxed max-w-[80%] ${r.sender === "admin" ? "bg-blue-600 text-white" : r.sender === "user" ? "bg-violet-600 text-white" : "bg-slate-100 border border-slate-200 text-slate-700"}`}>
                                      <p className="font-bold text-[9px] mb-1 opacity-70 uppercase tracking-wider">{r.sender === "admin" ? "Admin" : r.sender === "user" ? "Tenant" : "Visitor"}</p>
                                      <p className="whitespace-pre-wrap">{r.message}</p>
                                      <p className="text-[9px] opacity-60 mt-1">{new Date(r.timestamp).toLocaleString()}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {(selectedTicket.chatContext?.length ?? 0) === 0 && (selectedTicket.replies?.length ?? 0) === 0 && (
                            <div className="text-center py-6 text-xs text-slate-400">No conversation history yet.</div>
                          )}
                        </div>

                        <div className="border-t border-slate-100 p-3">
                          <form onSubmit={(e) => handleAdminReply(e, selectedTicket._id)} className="flex items-end gap-2">
                            <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)}
                              placeholder={selectedTicket.type === "external" ? "Reply to visitor (email will be sent)…" : "Reply to ticket…"}
                              rows={2} className="flex-1 resize-none px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-slate-50" />
                            <button type="submit" disabled={!replyText.trim() || sendingReply}
                              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors shrink-0">
                              <Send size={12} />{sendingReply ? "Sending…" : "Send"}
                            </button>
                          </form>
                          {selectedTicket.type === "external" && (
                            <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1"><Mail size={9} /> Visitor will receive an email notification</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* ════════════════════════════════════
                USERS TABLE
            ════════════════════════════════════ */}
            {tab === "users" && (
              <section className="space-y-3">
                <h2 className="text-sm font-bold text-slate-800">Users</h2>
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-3 font-semibold text-slate-600">Name</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600">Email</th>
                        <th className="text-center px-4 py-3 font-semibold text-slate-600">Role</th>
                        <th className="text-center px-4 py-3 font-semibold text-slate-600">Plan</th>
                        <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
                        <th className="text-center px-4 py-3 font-semibold text-slate-600">Method</th>
                        <th className="text-right px-4 py-3 font-semibold text-slate-600">Joined</th>
                        <th className="text-center px-4 py-3 font-semibold text-slate-600 w-16">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u._id} onClick={() => setSelectedUser(u)} className="border-b border-slate-100 hover:bg-slate-50/50 cursor-pointer">
                          <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                          <td className="px-4 py-3 text-slate-500">{u.email}</td>
                          <td className="px-4 py-3 text-center">
                            {u.role === "admin" ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-600">Admin</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">User</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                              u.subscription === "enterprise" ? "bg-purple-50 text-purple-600 border border-purple-200" :
                              u.subscription === "pro" ? "bg-blue-50 text-blue-600 border border-blue-200" :
                              "bg-slate-100 text-slate-500"
                            }`}>
                              {u.subscription || "free"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {u.isBlocked ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-600">Blocked</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-600">Active</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${u.authMethod === "google" ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-600"}`}>{u.authMethod}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <KebabMenu>
                              <KebabItem onClick={() => setSelectedUser(u)} icon={<Users size={12} />} label="View Details" />
                              <KebabItem onClick={() => handleBlockConfirm(u._id, !u.isBlocked)} icon={u.isBlocked ? <CheckCircle size={12} /> : <Ban size={12} />} label={u.isBlocked ? "Unblock" : "Block"} danger={!u.isBlocked} />
                              {u.role !== "admin" && <KebabItem onClick={() => handlePromoteConfirm(u._id)} icon={<Crown size={12} />} label="Promote to Admin" />}
                            </KebabMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ════════════════════════════════════
                AGENTS TABLE
            ════════════════════════════════════ */}
            {tab === "agents" && (
              <section className="space-y-3">
                <h2 className="text-sm font-bold text-slate-800">Agents</h2>
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="text-left px-4 py-3 font-semibold text-slate-600">Name</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600">Owner</th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600">Persona</th>
                        <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
                        <th className="text-right px-4 py-3 font-semibold text-slate-600">Messages</th>
                        <th className="text-right px-4 py-3 font-semibold text-slate-600">Created</th>
                        <th className="text-center px-4 py-3 font-semibold text-slate-600 w-16">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agents.map((a) => (
                        <tr key={a._id} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-800">{a.name}</td>
                          <td className="px-4 py-3 text-slate-500">{a.userId?.email ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-500 max-w-[140px] truncate">{a.persona}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${a.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>{a.status}</span>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500">{a.messageCount}</td>
                          <td className="px-4 py-3 text-right text-slate-400">{new Date(a.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-center">
                            <KebabMenu>
                              <KebabItem onClick={() => toggleAgent(a._id)} icon={a.status === "active" ? <Pause size={12} /> : <Play size={12} />} label={a.status === "active" ? "Stop Agent" : "Start Agent"} />
                              <KebabItem onClick={() => handlePurgeConfirm(a._id)} icon={<Trash2 size={12} />} label="Purge Knowledge" danger />
                              <KebabItem onClick={() => handleResetConfirm(a._id)} icon={<RefreshCw size={12} />} label="Reset Msg Count" />
                            </KebabMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ════════════════════════════════════
                TRANSACTIONS TABLE
            ════════════════════════════════════ */}
            {tab === "transactions" && (
              <section className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h2 className="text-sm font-bold text-slate-800">Transactions</h2>
                  
                  {/* Search and filters */}
                  <div className="flex gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      placeholder="Search email/txid..."
                      value={txSearch}
                      onChange={(e) => setTxSearch(e.target.value)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 w-full sm:w-48 bg-white"
                    />
                    <select
                      value={txStatusFilter}
                      onChange={(e) => setTxStatusFilter(e.target.value)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none bg-white text-slate-700"
                    >
                      <option value="all">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="succeeded">Succeeded</option>
                      <option value="rejected">Rejected</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                  {loadingTransactions ? (
                    <div className="p-8 text-center text-xs text-slate-400">Loading transactions...</div>
                  ) : transactions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">No transactions found.</div>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">User</th>
                          <th className="text-left px-4 py-3 font-semibold text-slate-600">Transaction ID</th>
                          <th className="text-center px-4 py-3 font-semibold text-slate-600">Plan</th>
                          <th className="text-right px-4 py-3 font-semibold text-slate-600">Amount</th>
                          <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
                          <th className="text-right px-4 py-3 font-semibold text-slate-600">Date</th>
                          <th className="text-center px-4 py-3 font-semibold text-slate-600 w-24">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((tx) => (
                          <tr key={tx._id} className="border-b border-slate-100 hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-medium text-slate-800">
                              <div>{tx.userId?.name || "Deleted User"}</div>
                              <div className="text-[10px] text-slate-400">{tx.userId?.email || ""}</div>
                            </td>
                            <td className="px-4 py-3 text-slate-500 font-mono text-[10px]">{tx.transactionId}</td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 uppercase">
                                {tx.plan}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-800">
                              ${tx.amount.toFixed(2)} <span className="text-[10px] text-slate-400 uppercase">{tx.currency}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                tx.status === "succeeded" ? "bg-emerald-50 text-emerald-600" :
                                tx.status === "pending" ? "bg-amber-50 text-amber-600" :
                                tx.status === "rejected" ? "bg-rose-50 text-rose-600" :
                                "bg-slate-100 text-slate-400"
                              }`}>
                                {tx.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-slate-400">{new Date(tx.createdAt).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-center">
                              {tx.status === "pending" ? (
                                <div className="flex justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => handleTransactionAction(tx._id, "approve")}
                                    className="px-2 py-1 rounded bg-blue-600 text-white font-bold hover:bg-blue-700 active:scale-95 text-[10px]"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    onClick={() => handleTransactionAction(tx._id, "reject")}
                                    className="px-2 py-1 rounded border border-rose-200 text-rose-600 hover:bg-rose-50 active:scale-95 text-[10px]"
                                  >
                                    Reject
                                  </button>
                                </div>
                              ) : tx.status === "succeeded" ? (
                                <div onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => handleTransactionAction(tx._id, "refund")}
                                    className="px-2 py-1 rounded border border-slate-200 text-slate-500 hover:bg-slate-50 active:scale-95 text-[10px]"
                                  >
                                    Refund
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>
            )}

            {/* ════════════════════════════════════
                RECENT ACTIVITY
            ════════════════════════════════════ */}
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-slate-800">Recent Activity</h2>
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 space-y-2 max-h-[200px] overflow-y-auto">
                {users.slice(0, 6).map((u) => (
                  <div key={`signup-${u._id}`} className="flex items-center gap-3 text-xs">
                    <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center shrink-0"><Users size={10} className="text-blue-500" /></div>
                    <div className="flex-1 min-w-0"><span className="font-medium text-slate-800">{u.name}</span><span className="text-slate-400 ml-1">signed up</span></div>
                    <span className="text-slate-400 shrink-0">{new Date(u.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
                {agents.slice(0, 4).map((a) => (
                  <div key={`agent-${a._id}`} className="flex items-center gap-3 text-xs">
                    <div className="w-6 h-6 rounded-full bg-violet-50 flex items-center justify-center shrink-0"><Bot size={10} className="text-violet-500" /></div>
                    <div className="flex-1 min-w-0"><span className="font-medium text-slate-800">{a.name}</span><span className="text-slate-400 ml-1">agent created</span></div>
                    <span className="text-slate-400 shrink-0">{new Date(a.createdAt).toLocaleDateString()}</span>
                  </div>
                ))}
                {users.length === 0 && agents.length === 0 && <div className="text-center py-6 text-xs text-slate-400">No recent activity</div>}
              </div>
            </section>
            {/* User Detail Modal */}
            {selectedUser && (
              <UserDetailModal
                user={selectedUser}
                onClose={() => setSelectedUser(null)}
                onBlock={handleBlockConfirm}
                onPromote={handlePromoteConfirm}
                onUpdatePlan={updatePlan}
              />
            )}
          </>
        ) : null}
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmState && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(15,23,42,0.4)", backdropFilter: "blur(4px)" }}
            onClick={() => setConfirmState(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 shadow-xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 bg-amber-50 border border-amber-200">
                <AlertTriangle size={20} className="text-amber-500" />
              </div>
              <h3 className="text-[16px] font-bold text-slate-900 text-center mb-1">
                {confirmState.title}
              </h3>
              <p className="text-[12px] text-slate-500 text-center mb-5 leading-relaxed">
                {confirmState.message}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmState(null)}
                  className="flex-1 py-2 rounded-xl text-[12px] font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmState.onConfirm}
                  className="flex-1 py-2 rounded-xl text-[12px] font-semibold bg-rose-600 text-white hover:bg-rose-700 shadow-sm active:scale-[0.97] transition-all"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}

interface UserDetailModalProps {
  user: AdminUser;
  onClose: () => void;
  onBlock: (id: string, block: boolean) => void;
  onPromote: (id: string) => void;
  onUpdatePlan: (id: string, plan: string) => Promise<void>;
}

function UserDetailModal({ user, onClose, onBlock, onPromote, onUpdatePlan }: UserDetailModalProps) {
  const [modalTab, setModalTab] = useState<"overview" | "payments">("overview");
  const [payments, setPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [errorPayments, setErrorPayments] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (modalTab === "payments") {
      setLoadingPayments(true);
      setErrorPayments("");
      fetch(`/api/admin/users/${user._id}/payments`)
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch payment history");
          return res.json();
        })
        .then((data) => {
          setPayments(data.transactions ?? []);
        })
        .catch((err) => {
          console.error(err);
          setErrorPayments(err.message || "Failed to load transactions");
        })
        .finally(() => {
          setLoadingPayments(false);
        });
    }
  }, [modalTab, user._id]);

  const copyToClipboard = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const initials = user.name
    ? user.name.split(" ").filter(Boolean).map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-200 shadow-sm">
              {initials}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{user.name}</h3>
              <p className="text-[11px] text-slate-500">{user.email}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <XCircle size={18} />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50/50 px-6 py-2 gap-4">
          <button
            onClick={() => setModalTab("overview")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              modalTab === "overview" ? "bg-white text-slate-800 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setModalTab("payments")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              modalTab === "payments" ? "bg-white text-slate-800 shadow-sm border border-slate-200/50" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Payment History
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {modalTab === "overview" ? (
            <div className="space-y-6">
              
              {/* Account Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Account Role</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${user.role === "admin" ? "bg-amber-50 text-amber-600 border border-amber-200" : "bg-slate-100 text-slate-600"}`}>
                      {user.role.toUpperCase()}
                    </span>
                    {user.role !== "admin" && (
                      <button
                        onClick={() => onPromote(user._id)}
                        className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        <Crown size={12} /> Promote
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Subscription Tier</p>
                  <div className="mt-1">
                    <select
                      value={user.subscription || "free"}
                      onChange={(e) => onUpdatePlan(user._id, e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-semibold focus:outline-none focus:border-blue-500"
                    >
                      <option value="free">Free</option>
                      <option value="starter">Starter</option>
                      <option value="growth">Growth</option>
                      <option value="pro">Pro</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Verification Status</p>
                  <p className="text-xs font-semibold text-slate-800 mt-2 flex items-center gap-1.5">
                    {user.isVerified ? (
                      <><CheckCircle size={12} className="text-emerald-500" /> Verified</>
                    ) : (
                      <><AlertCircle size={12} className="text-amber-500" /> Unverified</>
                    )}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Authentication Method</p>
                  <p className="text-xs font-semibold text-slate-800 mt-2 uppercase tracking-wide">
                    {user.authMethod || "email"}
                  </p>
                </div>
              </div>

              {/* Status and Danger Zone */}
              <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/30 space-y-3">
                <h4 className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Danger Zone</h4>
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-slate-800">
                      {user.isBlocked ? "Unblock Account" : "Suspend Account"}
                    </p>
                    <p className="text-slate-500 mt-0.5 text-[11px]">
                      {user.isBlocked ? "Restore user access to the workspace." : "Temporarily revoke this user's workspace login capabilities."}
                    </p>
                  </div>
                  <button
                    onClick={() => onBlock(user._id, !user.isBlocked)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      user.isBlocked
                        ? "bg-white hover:bg-slate-50 border-slate-200 text-slate-700"
                        : "bg-rose-500 hover:bg-rose-600 border-rose-600 text-white shadow-sm"
                    }`}
                  >
                    {user.isBlocked ? "Unblock User" : "Block User"}
                  </button>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 flex items-center justify-between px-1">
                <span>Account Created: {new Date(user.createdAt).toLocaleString()}</span>
                <span>User ID: {user._id}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard size={14} className="text-blue-500" />
                <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Stripe Sync Billing History</h4>
              </div>

              {loadingPayments ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs gap-2">
                  <RefreshCw size={18} className="animate-spin text-blue-500" />
                  <span>Syncing ledger with Stripe API...</span>
                </div>
              ) : errorPayments ? (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-50 border border-rose-100 text-xs text-rose-700">
                  <AlertCircle size={14} /> {errorPayments}
                </div>
              ) : payments.length === 0 ? (
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-8 text-center text-xs text-slate-500">
                  No payment history found on Stripe.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                        <th className="px-4 py-2">Transaction ID</th>
                        <th className="px-4 py-2">Plan</th>
                        <th className="px-4 py-2">Date</th>
                        <th className="px-4 py-2 text-right">Amount</th>
                        <th className="px-4 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p: any) => (
                        <tr key={p.transactionId} className="border-b border-slate-100 hover:bg-slate-50/30">
                          <td className="px-4 py-2.5 font-mono text-[10.5px] text-slate-700">
                            <span className="flex items-center gap-1">
                              {p.transactionId.substring(0, 14)}...
                              <button
                                onClick={() => copyToClipboard(p.transactionId)}
                                className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-all"
                                title="Copy full ID"
                              >
                                {copiedId === p.transactionId ? (
                                  <Check size={10} className="text-emerald-600" />
                                ) : (
                                  <Copy size={10} />
                                )}
                              </button>
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-medium text-slate-800 uppercase tracking-wider text-[10px]">
                            {p.plan}
                          </td>
                          <td className="px-4 py-2.5 text-slate-500">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                            ${p.amount.toFixed(2)} {p.currency}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              p.status === "succeeded" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-100 text-slate-400 border border-slate-200"
                            }`}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, bg }: {
  icon: React.ReactNode; label: string; value: number; bg: string;
}) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${bg}`}>
      <div className="shrink-0">{icon}</div>
      <div>
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-lg font-bold text-slate-900 mt-0.5">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}