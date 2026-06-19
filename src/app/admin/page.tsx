"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { Zap, Users, Bot, Shield, AlertCircle, CheckCircle, XCircle } from "lucide-react";

interface AdminMetrics {
  totalUsers:    number;
  verifiedUsers: number;
  totalAgents:   number;
  activeAgents:  number;
}

interface AdminUser {
  _id:        string;
  name:       string;
  email:      string;
  isVerified: boolean;
  role:       string;
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

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [users,   setUsers]   = useState<AdminUser[]>([]);
  const [agents,  setAgents]  = useState<AdminAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/dashboard");
      return;
    }
    if (status !== "authenticated") return;

    fetch("/api/admin")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return; }
        setMetrics(data.metrics);
        setUsers(data.recentUsers ?? []);
        setAgents(data.agents ?? []);
      })
      .catch(() => setError("Failed to load admin data"))
      .finally(() => setLoading(false));
  }, [status, router]);

  return (
    <DashboardShell title="Admin Panel">
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/20">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Admin Panel</h1>
            <p className="text-xs text-slate-500">System overview & management</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
            Loading admin data...
          </div>
        ) : metrics ? (
          <>
            {/* ── Metrics Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                icon={<Users size={18} className="text-blue-600" />}
                label="Total Users"
                value={metrics.totalUsers}
                bg="bg-blue-50 border-blue-100"
              />
              <MetricCard
                icon={<CheckCircle size={18} className="text-emerald-600" />}
                label="Verified Users"
                value={metrics.verifiedUsers}
                bg="bg-emerald-50 border-emerald-100"
              />
              <MetricCard
                icon={<Bot size={18} className="text-violet-600" />}
                label="Total Agents"
                value={metrics.totalAgents}
                bg="bg-violet-50 border-violet-100"
              />
              <MetricCard
                icon={<Zap size={18} className="text-amber-600" />}
                label="Active Agents"
                value={metrics.activeAgents}
                bg="bg-amber-50 border-amber-100"
              />
            </div>

            {/* ── Users Table ── */}
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-slate-800">Recent Users</h2>
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Name</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Email</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600">Verified</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600">Method</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u._id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                        <td className="px-4 py-3 text-slate-500">{u.email}</td>
                        <td className="px-4 py-3 text-center">
                          {u.isVerified
                            ? <CheckCircle size={14} className="inline text-emerald-500" />
                            : <XCircle size={14} className="inline text-slate-300" />
                          }
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            u.authMethod === "google" ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-600"
                          }`}>
                            {u.authMethod}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── Agents Table ── */}
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-slate-800">All Agents</h2>
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
                    </tr>
                  </thead>
                  <tbody>
                    {agents.map((a) => (
                      <tr key={a._id} className="border-b border-slate-100 hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-medium text-slate-800">{a.name}</td>
                        <td className="px-4 py-3 text-slate-500">{a.userId?.email ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-500 max-w-[160px] truncate">{a.persona}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            a.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-400"
                          }`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500">{a.messageCount}</td>
                        <td className="px-4 py-3 text-right text-slate-400">
                          {new Date(a.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </DashboardShell>
  );
}

/* ── Metric Card ── */
function MetricCard({
  icon, label, value, bg,
}: {
  icon: React.ReactNode; label: string; value: number; bg: string;
}) {
  return (
    <div className={`flex items-center gap-3 p-4 rounded-xl border ${bg}`}>
      <div className="shrink-0">{icon}</div>
      <div>
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-slate-900 mt-0.5">{value.toLocaleString()}</p>
      </div>
    </div>
  );
}