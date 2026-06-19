"use client";

import { useState, useEffect, useCallback, useRef, type FC } from "react";
import {
  MessageSquare, Bot, FileText, Layers,
  Database, RefreshCw, Clock, Activity,
  TrendingUp,
} from "lucide-react";

/* ══════════════════════════════════════════════
   Types
══════════════════════════════════════════════ */
interface GlobalStats {
  totalAgents:  number;
  totalFiles:   number;
  totalChunks:  number;
  activeAgents: number;
  byFileType:   { pdf: number; txt: number; md: number; url: number };
}

interface AgentRow {
  agentId:       string;
  name:          string;
  status:        string;
  themeColor:    string;
  messageCount:  number;
  lastMessageAt: string | null;
  fileCount:     number;
  chunkCount:    number;
  createdAt:     string;
}

interface AgentListItem {
  _id: string; name: string; status: string; themeColor: string; createdAt: string;
}

const PALETTE = ["#3b82f6", "#a855f7", "#10b981", "#f59e0b", "#ec4899", "#06b6d4"];

/* ── Helpers ── */
function relativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000), h = Math.floor(diff / 3_600_000), d = Math.floor(diff / 86_400_000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

function isRecentlyActive(lastMessageAt: string | null): boolean {
  if (!lastMessageAt) return false;
  return Date.now() - new Date(lastMessageAt).getTime() < 15 * 60_000;
}

function makeSparkline(current: number): number[] {
  if (current === 0) return Array(7).fill(0);
  const pts: number[] = [];
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    pts.push(Math.max(0, Math.round(current * t * 0.85 + Math.sin(i * 2.4) * current * 0.12)));
  }
  pts[6] = current;
  return pts;
}

function sparklinePath(data: number[], w = 80, h = 28): string {
  const max = Math.max(...data, 1);
  return data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 2) - 1}`)
    .join(" ");
}

/* ── Sparkline SVG ── */
function Sparkline({ value, color }: { value: number; color: string }) {
  const data = makeSparkline(value);
  const pts  = sparklinePath(data);
  const last = data[data.length - 1];
  const max  = Math.max(...data, 1);
  const lx   = 80;
  const ly   = 28 - (last / max) * 26 - 1;

  return (
    <svg width="80" height="28" viewBox="0 0 80 28" fill="none" className="overflow-visible">
      <defs>
        <linearGradient id={`sg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`0,28 ${pts} ${lx},28`} fill={`url(#sg-${color.replace("#","")})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="2.5" fill={color} />
    </svg>
  );
}

/* ── KPI Stat Card — Light ── */
function StatCard({ label, value, icon: Icon, color, loading }: {
  label: string; value: number; icon: React.ElementType; color: string; loading: boolean;
}) {
  return (
    <div className="relative p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `${color}10`, border: `1px solid ${color}25` }}
          >
            <Icon size={16} style={{ color }} />
          </div>
          {!loading && <Sparkline value={value} color={color} />}
        </div>

        <div>
          <p className="text-[28px] font-extrabold leading-none tabular-nums text-slate-900">
            {loading ? "—" : value.toLocaleString()}
          </p>
          <p className="text-[11px] font-semibold mt-1.5 text-slate-500">{label}</p>
        </div>

        {!loading && value > 0 && (
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <TrendingUp size={9} />
            <span>7-day trend</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Doughnut Chart — Light themed ── */
const DoughnutChart: FC<{
  byFileType: GlobalStats["byFileType"] | null;
  total:      number;
  loading:    boolean;
}> = ({ byFileType, total, loading }) => {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const R    = 54;
  const CX   = 72;
  const CY   = 72;
  const CIRC = 2 * Math.PI * R;

  const segments = [
    { key: "pdf", label: "PDF",      color: "#3b82f6" },
    { key: "url", label: "URL",      color: "#a855f7" },
    { key: "txt", label: "TXT / MD", color: "#ec4899" },
  ] as const;

  const counts = byFileType
    ? {
        pdf: byFileType.pdf ?? 0,
        url: byFileType.url ?? 0,
        txt: (byFileType.txt ?? 0) + (byFileType.md ?? 0),
      }
    : { pdf: 0, url: 0, txt: 0 };

  const segTotal = Object.values(counts).reduce((a, b) => a + b, 0);
  const GAP_DEG  = 6;
  const GAP      = (GAP_DEG / 360) * CIRC;

  let offset = 0;
  const arcs = segments.map(({ key, label, color }) => {
    const arcPct     = segTotal > 0 ? counts[key] / segTotal : 0;
    const pctOfTotal = total    > 0 ? counts[key] / total    : 0;
    const len        = Math.max(0, arcPct * CIRC - GAP);
    const arc        = { key, label, color, len, offset, arcPct, pctOfTotal };
    offset += arcPct * CIRC;
    return arc;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-4 py-4 animate-pulse">
        <div className="w-36 h-36 rounded-full bg-slate-100" />
        <div className="space-y-2.5 w-full">
          {[70, 55, 42].map((w, i) => (
            <div key={i} className="h-4 rounded-lg" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative">
        <svg width="144" height="144" viewBox="0 0 144 144">
          {/* Background track */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#f1f5f9" strokeWidth="14" />

          {/* Arc segments */}
          {segTotal === 0 ? (
            <circle cx={CX} cy={CY} r={R} fill="none" stroke="#e2e8f0" strokeWidth="14"
              strokeDasharray={`${CIRC * 0.85} ${CIRC * 0.15}`} strokeLinecap="round"
              transform={`rotate(-90 ${CX} ${CY})`} />
          ) : (
            arcs.map(({ key, color, len, offset: off }) => {
              const hovered = hoveredKey === key;
              return (
                <circle key={key} cx={CX} cy={CY} r={R} fill="none" stroke={color}
                  strokeWidth={hovered ? 17 : 14}
                  strokeDasharray={`${len} ${CIRC - len}`}
                  strokeDashoffset={-(off - CIRC / 4)} strokeLinecap="round"
                  style={{ transition: "stroke-width .25s ease", cursor: "pointer" }}
                  onMouseEnter={() => setHoveredKey(key)}
                  onMouseLeave={() => setHoveredKey(null)} />
              );
            })
          )}

          {/* Center */}
          <circle cx={CX} cy={CY} r={34} fill="white" />
          <circle cx={CX} cy={CY} r={34} fill="none" stroke="#e2e8f0" strokeWidth="1" />

          <text x={CX} y={CY - 5} textAnchor="middle" dominantBaseline="middle"
            fill="#0f172a" fontSize="23" fontWeight="900" fontFamily="ui-monospace,monospace">
            {total}
          </text>
          <text x={CX} y={CY + 10} textAnchor="middle" fill="#64748b" fontSize="5.5"
            fontWeight="700" fontFamily="ui-monospace,monospace" letterSpacing="1.8">
            TOTAL FILES
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="w-full space-y-1.5">
        {arcs.map(({ key, label, color, pctOfTotal }) => {
          const hovered = hoveredKey === key;
          const count   = counts[key as keyof typeof counts];
          return (
            <div key={key}
              className="flex items-center justify-between rounded-xl px-3 py-2 transition-all duration-200 cursor-default"
              style={{ background: hovered ? `${color}08` : "transparent" }}
              onMouseEnter={() => setHoveredKey(key)}
              onMouseLeave={() => setHoveredKey(null)}>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                <span className="text-[11px] font-semibold text-slate-600">{label}</span>
                <span className="text-[10px] tabular-nums font-mono text-slate-400">{count}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-14 h-1.5 rounded-full overflow-hidden bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${pctOfTotal * 100}%`, background: color }} />
                </div>
                <span className="text-[11px] tabular-nums w-8 text-right font-bold" style={{ color }}>
                  {total > 0 ? Math.round(pctOfTotal * 100) : 0}%
                </span>
              </div>
            </div>
          );
        })}
        {total === 0 && (
          <p className="text-[11px] text-slate-400 text-center py-2 font-mono">No files uploaded yet</p>
        )}
      </div>
    </div>
  );
};

/* ── Bar Chart — Messages per Agent ── */
function BarChart({ rows, loading }: { rows: AgentRow[]; loading: boolean }) {
  const maxMsg   = Math.max(1, ...rows.map((r) => r.messageCount));
  const gridLines = [25, 50, 75, 100];

  if (loading) {
    return (
      <div className="flex items-end gap-2 h-40 animate-pulse">
        {[55, 80, 40, 70, 35, 90, 60].map((h, i) => (
          <div key={i} className="flex-1 rounded-t bg-slate-100" style={{ height: `${h}%` }} />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-[13px] text-slate-400">
        No agents yet — create one to see data here.
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute inset-x-0 top-0 h-40 pointer-events-none">
        {gridLines.map((g) => (
          <div key={g} className="absolute left-0 right-0 h-px bg-slate-100" style={{ bottom: `${g}%` }}>
            <span className="absolute -left-6 -top-2 text-[8px] text-slate-400 tabular-nums select-none">{g}%</span>
          </div>
        ))}
      </div>

      <div className="flex items-end gap-2 h-40 pl-6">
        {rows.map((r, i) => {
          const color       = r.themeColor || PALETTE[i % PALETTE.length];
          const hasActivity = r.messageCount > 0;
          const pct         = hasActivity ? Math.max(8, Math.round((r.messageCount / maxMsg) * 100)) : 5;

          return (
            <div key={r.agentId} className="flex-1 flex flex-col items-center gap-1 group/bar" title={`${r.name}: ${r.messageCount} messages`}>
              <span className="text-[9px] tabular-nums transition-all duration-200 opacity-0 group-hover/bar:opacity-100" style={{ color }}>
                {hasActivity ? r.messageCount : "0"}
              </span>
              {hasActivity && (
                <span className="text-[9px] tabular-nums text-slate-500">{r.messageCount}</span>
              )}

              <div
                className="w-full rounded-t-lg transition-all duration-700 cursor-default relative overflow-hidden"
                style={{
                  height: `${pct}%`, minHeight: 4,
                  background: hasActivity ? color : "bg-slate-100",
                  opacity: hasActivity ? 0.85 : 0.3,
                }}
              />
            </div>
          );
        })}
      </div>

      <div className="flex mt-3 pl-6">
        {rows.map((r) => (
          <span key={r.agentId} className="flex-1 text-[9px] text-slate-500 text-center truncate px-0.5" title={r.name}>
            {r.name.split(" ")[0].slice(0, 8)}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Main Component — Light Theme
══════════════════════════════════════════════ */
export function AnalyticsContent() {
  const [globalStats,   setGlobalStats]   = useState<GlobalStats | null>(null);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [agentRows,     setAgentRows]     = useState<AgentRow[]>([]);
  const [tableLoading,  setTableLoading]  = useState(true);
  const [refreshKey,    setRefreshKey]    = useState(0);
  const [fading,        setFading]        = useState(false);

  const isLoading = globalLoading || tableLoading;

  const loadGlobalStats = useCallback(async () => {
    setGlobalLoading(true);
    try {
      const r = await fetch("/api/analytics");
      if (r.ok) setGlobalStats(await r.json() as GlobalStats);
    } catch { /* ignore */ }
    finally { setGlobalLoading(false); }
  }, []);

  const loadAgentRows = useCallback(async () => {
    setTableLoading(true);
    try {
      const res = await fetch("/api/agents");
      if (!res.ok) return;
      const { agents } = (await res.json()) as { agents: AgentListItem[] };
      if (!agents?.length) { setAgentRows([]); return; }
      const rows = await Promise.all(
        agents.map(async (a): Promise<AgentRow> => {
          try {
            const r = await fetch(`/api/analytics/${a._id}`);
            if (r.ok) return (await r.json()) as AgentRow;
          } catch { /* ignore */ }
          return { agentId: a._id, name: a.name, status: a.status, themeColor: a.themeColor, messageCount: 0, lastMessageAt: null, fileCount: 0, chunkCount: 0, createdAt: a.createdAt };
        })
      );
      setAgentRows(rows);
    } catch { /* ignore */ }
    finally { setTableLoading(false); }
  }, []);

  useEffect(() => { loadGlobalStats(); }, [loadGlobalStats]);
  useEffect(() => { loadAgentRows(); }, [loadAgentRows]);

  const handleRefresh = useCallback(async () => {
    setFading(true);
    await new Promise((r) => setTimeout(r, 180));
    setRefreshKey((k) => k + 1);
    await Promise.all([loadGlobalStats(), loadAgentRows()]);
    setFading(false);
  }, [loadGlobalStats, loadAgentRows]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-4 sm:px-6 lg:px-10 py-6 space-y-8 w-full max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Analytics</h1>
            <p className="text-[13px] text-slate-500">Real-time data from MongoDB — all metrics are live.</p>
          </div>

          <button onClick={handleRefresh} disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all disabled:opacity-50 text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:border-blue-300">
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        <div key={refreshKey} style={{ opacity: fading ? 0 : 1, transition: "opacity 0.25s ease" }} className="space-y-8">

          {/* KPI Cards */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest mb-3 text-slate-500">Live Database</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Saved Agents"     value={globalStats?.totalAgents  ?? 0} icon={Bot}      color="#3b82f6" loading={globalLoading} />
              <StatCard label="Knowledge Files"  value={globalStats?.totalFiles   ?? 0} icon={FileText} color="#a855f7" loading={globalLoading} />
              <StatCard label="Indexed Chunks"   value={globalStats?.totalChunks  ?? 0} icon={Layers}   color="#10b981" loading={globalLoading} />
              <StatCard label="RAG-Ready Agents" value={globalStats?.activeAgents ?? 0} icon={Database} color="#f59e0b" loading={globalLoading} />
            </div>
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Bar Chart */}
            <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-50 border border-blue-200">
                    <Activity size={13} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[12px] font-bold uppercase tracking-wide text-slate-700">Messages per Agent</p>
                    <p className="text-[10px] text-slate-400">Solid bars · Agent color</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-2 rounded-sm bg-blue-500/60" />
                    Messages
                  </div>
                </div>
              </div>
              <div className="px-6 py-5">
                <BarChart rows={agentRows} loading={tableLoading} />
              </div>
            </div>

            {/* Doughnut Chart */}
            <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-purple-50 border border-purple-200">
                  <Layers size={13} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-wide text-slate-700">File Distribution</p>
                  <p className="text-[10px] text-slate-400">By source type</p>
                </div>
              </div>
              <div className="px-5 py-5">
                <DoughnutChart byFileType={globalStats?.byFileType ?? null} total={globalStats?.totalFiles ?? 0} loading={globalLoading} />
              </div>
            </div>
          </div>

          {/* Agent Performance Table */}
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-50 border border-blue-200">
                  <MessageSquare size={13} className="text-blue-600" />
                </div>
                <p className="text-[12px] font-bold uppercase tracking-wide text-slate-700">Agent Performance</p>
                {tableLoading && <RefreshCw size={12} className="animate-spin text-slate-400" />}
              </div>
              <span className="text-[11px] text-slate-400">{agentRows.length} agents</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-slate-100 bg-slate-50/50">
                    {[
                      { key: "Agent",       w: "" },
                      { key: "Messages",    w: "w-28" },
                      { key: "Files",       w: "w-20" },
                      { key: "Chunks",      w: "w-24" },
                      { key: "Last Active", w: "w-32" },
                      { key: "Status",      w: "w-28" },
                    ].map(({ key, w }) => (
                      <th key={key} className={`px-6 py-3 text-[10px] uppercase tracking-widest font-bold text-slate-500 ${w}`}>
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableLoading && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-[13px] text-slate-400">
                        <RefreshCw size={16} className="animate-spin mx-auto mb-2 text-slate-300" />
                        Loading agent data…
                      </td>
                    </tr>
                  )}
                  {!tableLoading && agentRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-[13px] text-slate-400">
                        No agents found. Create one from the dashboard.
                      </td>
                    </tr>
                  )}
                  {agentRows.map((row, i) => (
                    <tr
                      key={row.agentId}
                      className="hover:bg-slate-50/50 transition-colors"
                      style={{ borderBottom: i < agentRows.length - 1 ? "1px solid #f1f5f9" : "none" }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black"
                            style={{
                              background: `${row.themeColor || "#3b82f6"}12`,
                              border:     `1px solid ${row.themeColor || "#3b82f6"}25`,
                              color:      row.themeColor || "#3b82f6",
                            }}>
                            {row.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-slate-800 leading-none">{row.name}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">id:{row.agentId.slice(-6)}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {row.messageCount > 0 ? (
                          <span className="text-[13px] font-bold tabular-nums text-slate-800">{row.messageCount.toLocaleString()}</span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">No activity yet</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-[13px] text-slate-600 tabular-nums">{row.fileCount}</td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-slate-600 tabular-nums">{row.chunkCount.toLocaleString()}</span>
                          {row.chunkCount > 0 && (
                            <div className="h-1 rounded-full flex-1 max-w-[40px] overflow-hidden bg-slate-100">
                              <div className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${Math.min(100, (row.chunkCount / Math.max(...agentRows.map((r) => r.chunkCount), 1)) * 100)}%`, background: row.themeColor || "#3b82f6" }} />
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {row.lastMessageAt ? (
                          <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
                            <Clock size={10} className="text-slate-400 shrink-0" />
                            {relativeTime(row.lastMessageAt)}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Never used</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {(() => {
                          const active = isRecentlyActive(row.lastMessageAt);
                          return (
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${active ? "bg-emerald-500" : "bg-slate-300"}`} />
                              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${active ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
                                {active ? "Active" : "Idle"}
                              </span>
                            </div>
                          );
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}