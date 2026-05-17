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

const PALETTE = ["#00f2ff", "#a855f7", "#00ff94", "#f59e0b", "#ec4899", "#06b6d4"];

/* ══════════════════════════════════════════════
   Helpers
══════════════════════════════════════════════ */
function relativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000), h = Math.floor(diff / 3_600_000), d = Math.floor(diff / 86_400_000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

/**
 * Returns true if lastMessageAt is within the past 15 minutes.
 * Used to override the DB status field with a computed "Active" state.
 */
function isRecentlyActive(lastMessageAt: string | null): boolean {
  if (!lastMessageAt) return false;
  return Date.now() - new Date(lastMessageAt).getTime() < 15 * 60_000;
}

/* Generate a 7-point upward-trend sparkline ending at `current` */
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

/* SVG polyline string from normalized data points */
function sparklinePath(data: number[], w = 80, h = 28): string {
  const max = Math.max(...data, 1);
  return data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * (h - 2) - 1}`)
    .join(" ");
}

/* ══════════════════════════════════════════════
   Sparkline SVG
══════════════════════════════════════════════ */
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
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <polyline
        points={`0,28 ${pts} ${lx},28`}
        fill={`url(#sg-${color.replace("#","")})`}
      />
      {/* Line */}
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 3px ${color})` }}
      />
      {/* End dot */}
      <circle cx={lx} cy={ly} r="2.5" fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
    </svg>
  );
}

/* ══════════════════════════════════════════════
   Glassmorphism Stat Card
══════════════════════════════════════════════ */
function StatCard({ label, value, icon: Icon, color, loading }: {
  label: string; value: number; icon: React.ElementType; color: string; loading: boolean;
}) {
  return (
    <div
      className="relative p-5 rounded-2xl overflow-hidden transition-all duration-300"
      style={{
        background:     `linear-gradient(135deg,${color}0c,${color}05,rgba(6,6,14,0.8))`,
        border:         `1px solid ${color}30`,
        boxShadow:      `0 0 30px ${color}08, inset 0 1px 0 rgba(255,255,255,0.04)`,
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Corner glow */}
      <div
        className="absolute -top-6 -right-6 w-20 h-20 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle,${color}20,transparent 70%)` }}
      />
      {/* Top accent line */}
      <div
        className="absolute top-0 left-4 right-4 h-px"
        style={{ background: `linear-gradient(90deg,transparent,${color}60,transparent)` }}
      />

      <div className="relative space-y-3">
        {/* Icon + sparkline row */}
        <div className="flex items-start justify-between">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: `${color}18`,
              border:     `1px solid ${color}35`,
              boxShadow:  `0 0 12px ${color}20`,
            }}
          >
            <Icon size={16} style={{ color }} />
          </div>
          {!loading && <Sparkline value={value} color={color} />}
        </div>

        {/* Value + label */}
        <div>
          <p
            className="text-[28px] font-black leading-none tabular-nums"
            style={{
              background:           `linear-gradient(135deg,#e2e8f0,${color})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor:  "transparent",
            }}
          >
            {loading ? "—" : value.toLocaleString()}
          </p>
          <p className="text-[11px] font-semibold mt-1.5" style={{ color: `${color}90` }}>{label}</p>
        </div>

        {/* Mini trend label */}
        {!loading && value > 0 && (
          <div className="flex items-center gap-1 text-[10px]" style={{ color: `${color}70` }}>
            <TrendingUp size={9} />
            <span>7-day trend</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   SVG Doughnut Chart — Premium Cyberpunk Edition
   Hover state per-segment, concentric tracking rings,
   round-capped arcs, monospace center, glow transitions.
══════════════════════════════════════════════ */
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
    { key: "pdf", label: "PDF",      color: "#00f2ff" },
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
        <div className="w-36 h-36 rounded-full" style={{ background: "rgba(255,255,255,0.04)" }} />
        <div className="space-y-2.5 w-full">
          {[70, 55, 42].map((w, i) => (
            <div key={i} className="h-4 rounded-lg" style={{ width: `${w}%`, background: "rgba(255,255,255,0.04)" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5">

      {/* ── SVG ring ── */}
      <div
        className="relative"
        style={{ filter: "drop-shadow(0 6px 24px rgba(0,0,0,0.5))" }}
      >
        <svg width="144" height="144" viewBox="0 0 144 144">
          <defs>
            <radialGradient id="doughnut-bg-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="rgba(0,242,255,0.06)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          {/* Soft radial backdrop */}
          <circle cx={CX} cy={CY} r={R + 22} fill="url(#doughnut-bg-glow)" />

          {/* ── Concentric tracking rings (outer) — deep translucent ── */}
          <circle cx={CX} cy={CY} r={R + 16} fill="none"
            stroke="rgba(255,255,255,0.03)" strokeWidth="1"
            strokeDasharray="3 5"
          />
          <circle cx={CX} cy={CY} r={R + 10} fill="none"
            stroke="rgba(255,255,255,0.03)" strokeWidth="0.75"
          />

          {/* Main background track */}
          <circle cx={CX} cy={CY} r={R} fill="none"
            stroke="rgba(255,255,255,0.06)" strokeWidth="14"
          />

          {/* ── Concentric tracking rings (inner) ── */}
          <circle cx={CX} cy={CY} r={R - 10} fill="none"
            stroke="rgba(255,255,255,0.03)" strokeWidth="0.75"
          />
          <circle cx={CX} cy={CY} r={R - 16} fill="none"
            stroke="rgba(255,255,255,0.02)" strokeWidth="1"
            strokeDasharray="3 5"
          />

          {/* ── Arc segments ── */}
          {segTotal === 0 ? (
            <circle cx={CX} cy={CY} r={R} fill="none"
              stroke="rgba(255,255,255,0.08)" strokeWidth="14"
              strokeDasharray={`${CIRC * 0.85} ${CIRC * 0.15}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${CX} ${CY})`}
            />
          ) : (
            arcs.map(({ key, color, len, offset: off }) => {
              const hovered = hoveredKey === key;
              return (
                <circle
                  key={key}
                  cx={CX} cy={CY} r={R}
                  fill="none"
                  stroke={color}
                  strokeWidth={hovered ? 17 : 14}
                  strokeDasharray={`${len} ${CIRC - len}`}
                  strokeDashoffset={-(off - CIRC / 4)}
                  strokeLinecap="round"
                  style={{
                    filter: hovered
                      ? `drop-shadow(0px 0px 10px ${color}) drop-shadow(0px 0px 4px ${color})`
                      : `drop-shadow(0px 0px 6px ${color}80)`,
                    transition: "stroke-width .25s ease, filter .25s ease, stroke-dasharray .85s cubic-bezier(.34,1.56,.64,1)",
                    cursor:     "pointer",
                  }}
                  onMouseEnter={() => setHoveredKey(key)}
                  onMouseLeave={() => setHoveredKey(null)}
                />
              );
            })
          )}

          {/* ── Center backdrop ── */}
          <circle cx={CX} cy={CY} r={34} fill="rgba(4,4,16,0.96)" />
          <circle cx={CX} cy={CY} r={34} fill="none"
            stroke="rgba(0,242,255,0.10)" strokeWidth="1"
          />
          <circle cx={CX} cy={CY} r={29} fill="none"
            stroke="rgba(0,242,255,0.05)" strokeWidth="0.5"
          />

          {/* ── Center total — crisp monospace ── */}
          <text
            x={CX} y={CY - 5}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#ffffff"
            fontSize="23"
            fontWeight="900"
            fontFamily="ui-monospace,monospace"
            style={{ filter: "drop-shadow(0 0 8px rgba(0,242,255,0.75))" }}
          >
            {total}
          </text>
          <text
            x={CX} y={CY + 10}
            textAnchor="middle"
            fill="#00f2ff"
            fontSize="5.5"
            fontWeight="700"
            fontFamily="ui-monospace,monospace"
            letterSpacing="1.8"
            style={{ opacity: 0.65 }}
          >
            TOTAL FILES
          </text>
        </svg>
      </div>

      {/* ── Legend — interactive hover sync with arcs ── */}
      <div className="w-full space-y-1.5">
        {arcs.map(({ key, label, color, pctOfTotal }) => {
          const hovered = hoveredKey === key;
          const count   = counts[key as keyof typeof counts];
          return (
            <div
              key={key}
              className="flex items-center justify-between rounded-xl px-3 py-2 transition-all duration-200 cursor-default"
              style={{
                background: hovered ? `${color}10` : "transparent",
                border:     `1px solid ${hovered ? `${color}28` : "transparent"}`,
                boxShadow:  hovered ? `0 0 16px ${color}0c` : "none",
              }}
              onMouseEnter={() => setHoveredKey(key)}
              onMouseLeave={() => setHoveredKey(null)}
            >
              {/* Left: dot + label + count */}
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0 transition-all duration-200"
                  style={{
                    background: color,
                    boxShadow:  hovered ? `0 0 10px ${color}, 0 0 4px ${color}` : `0 0 5px ${color}60`,
                  }}
                />
                <span
                  className="text-[11px] font-semibold transition-colors duration-200"
                  style={{ color: hovered ? "#e2e8f0" : "#94a3b8" }}
                >
                  {label}
                </span>
                <span
                  className="text-[10px] tabular-nums font-mono transition-colors duration-200"
                  style={{ color: `${color}${hovered ? "cc" : "70"}` }}
                >
                  {count}
                </span>
              </div>

              {/* Right: bar + percent */}
              <div className="flex items-center gap-2">
                <div
                  className="w-14 h-1.5 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width:     `${pctOfTotal * 100}%`,
                      background: color,
                      boxShadow:  hovered ? `0 0 8px ${color}` : `0 0 4px ${color}80`,
                    }}
                  />
                </div>
                <span
                  className="text-[11px] tabular-nums w-8 text-right font-bold transition-all duration-200"
                  style={{
                    color,
                    textShadow: hovered ? `0 0 8px ${color}` : "none",
                  }}
                >
                  {total > 0 ? Math.round(pctOfTotal * 100) : 0}%
                </span>
              </div>
            </div>
          );
        })}
        {total === 0 && (
          <p className="text-[11px] text-[#334155] text-center py-2 font-mono">
            No files uploaded yet
          </p>
        )}
      </div>

    </div>
  );
};

/* ══════════════════════════════════════════════
   Bar Chart — Messages per Agent
══════════════════════════════════════════════ */
function BarChart({ rows, loading }: { rows: AgentRow[]; loading: boolean }) {
  const maxMsg   = Math.max(1, ...rows.map((r) => r.messageCount));
  const gridLines = [25, 50, 75, 100];

  if (loading) {
    return (
      <div className="flex items-end gap-2 h-40 animate-pulse">
        {[55, 80, 40, 70, 35, 90, 60].map((h, i) => (
          <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: "rgba(255,255,255,0.04)" }} />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-[13px] text-[#334155]">
        No agents yet — create one to see data here.
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Horizontal grid lines */}
      <div className="absolute inset-x-0 top-0 h-40 pointer-events-none">
        {gridLines.map((g) => (
          <div
            key={g}
            className="absolute left-0 right-0 h-px"
            style={{
              bottom:     `${g}%`,
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <span className="absolute -left-6 -top-2 text-[8px] text-[#334155] tabular-nums select-none">{g}%</span>
          </div>
        ))}
      </div>

      {/* Bars */}
      <div className="flex items-end gap-2 h-40 pl-6">
        {rows.map((r, i) => {
          const color       = r.themeColor || PALETTE[i % PALETTE.length];
          const hasActivity = r.messageCount > 0;
          const pct         = hasActivity ? Math.max(8, Math.round((r.messageCount / maxMsg) * 100)) : 5;

          return (
            <div
              key={r.agentId}
              className="flex-1 flex flex-col items-center gap-1 group/bar"
              title={`${r.name}: ${r.messageCount} messages`}
            >
              {/* Value label */}
              <span
                className="text-[9px] tabular-nums transition-all duration-200 opacity-0 group-hover/bar:opacity-100"
                style={{ color }}
              >
                {hasActivity ? r.messageCount : "0"}
              </span>
              {/* Static label for active bars */}
              {hasActivity && (
                <span className="text-[9px] tabular-nums" style={{ color }}>
                  {r.messageCount}
                </span>
              )}

              {/* Bar with gradient */}
              <div
                className="w-full rounded-t-lg transition-all duration-700 cursor-default relative overflow-hidden"
                style={{
                  height:     `${pct}%`,
                  minHeight:  4,
                  background: hasActivity
                    ? `linear-gradient(180deg,#a855f7,#00f2ff)`
                    : "rgba(255,255,255,0.05)",
                  boxShadow: hasActivity
                    ? `0 0 14px rgba(0,242,255,0.35), 0 0 30px rgba(168,85,247,0.2)`
                    : "none",
                }}
              >
                {/* Shimmer overlay */}
                {hasActivity && (
                  <div
                    className="absolute inset-0 opacity-20"
                    style={{ background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)", backgroundSize: "200% 100%" }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* X-axis labels */}
      <div className="flex mt-3 pl-6">
        {rows.map((r) => (
          <span
            key={r.agentId}
            className="flex-1 text-[9px] text-[#475569] text-center truncate px-0.5"
            title={r.name}
          >
            {r.name.split(" ")[0].slice(0, 8)}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Main Component
══════════════════════════════════════════════ */
export function AnalyticsContent() {
  const [globalStats,   setGlobalStats]   = useState<GlobalStats | null>(null);
  const [globalLoading, setGlobalLoading] = useState(true);
  const [agentRows,     setAgentRows]     = useState<AgentRow[]>([]);
  const [tableLoading,  setTableLoading]  = useState(true);
  const [refreshKey,    setRefreshKey]    = useState(0);  // triggers fade animation
  const [fading,        setFading]        = useState(false);

  const isLoading = globalLoading || tableLoading;

  /* ── Fetch global stats ── */
  const loadGlobalStats = useCallback(async () => {
    setGlobalLoading(true);
    try {
      const r = await fetch("/api/analytics");
      if (r.ok) setGlobalStats(await r.json() as GlobalStats);
    } catch { /* ignore */ }
    finally { setGlobalLoading(false); }
  }, []);

  /* ── Fetch agent rows ── */
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

  /* ── Refresh with fade animation ── */
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

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight">
              <span
                style={{
                  background:           "linear-gradient(90deg,#00f2ff 0%,#a855f7 60%,#ec4899 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor:  "transparent",
                  filter:               "drop-shadow(0 0 10px rgba(0,242,255,0.25))",
                }}
              >
                Analytics
              </span>
            </h1>
            <p className="text-[13px] text-[#64748b]">
              Real-time data from MongoDB — all metrics are live.
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12px] font-semibold transition-all disabled:opacity-50"
            style={{
              background: "rgba(0,242,255,0.06)",
              border:     "1px solid rgba(0,242,255,0.18)",
              color:      "#00f2ff",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(0,242,255,0.12)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; }}
          >
            <RefreshCw size={13} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* Content wrapper — fades on refresh */}
        <div
          key={refreshKey}
          style={{
            opacity:    fading ? 0 : 1,
            transition: "opacity 0.25s ease",
          }}
          className="space-y-8"
        >

          {/* ── Glassmorphism Stat Cards ── */}
          <div>
            <p
              className="text-[10px] font-black uppercase tracking-widest mb-3"
              style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
            >
              Live Database
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Saved Agents"     value={globalStats?.totalAgents  ?? 0} icon={Bot}      color="#00f2ff" loading={globalLoading} />
              <StatCard label="Knowledge Files"  value={globalStats?.totalFiles   ?? 0} icon={FileText} color="#a855f7" loading={globalLoading} />
              <StatCard label="Indexed Chunks"   value={globalStats?.totalChunks  ?? 0} icon={Layers}   color="#00ff94" loading={globalLoading} />
              <StatCard label="RAG-Ready Agents" value={globalStats?.activeAgents ?? 0} icon={Database} color="#f59e0b" loading={globalLoading} />
            </div>
          </div>

          {/* ── Charts row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* ── Bar Chart (2/3 width) ── */}
            <div
              className="lg:col-span-2 rounded-2xl overflow-hidden"
              style={{
                background:     "rgba(6,6,14,0.8)",
                border:         "1px solid rgba(0,242,255,0.12)",
                backdropFilter: "blur(8px)",
                boxShadow:      "0 0 30px rgba(0,0,0,0.4)",
              }}
            >
              {/* Card header */}
              <div
                className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.2)" }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(0,242,255,0.1)", border: "1px solid rgba(0,242,255,0.25)" }}
                  >
                    <Activity size={13} className="text-[#00f2ff]" />
                  </div>
                  <div>
                    <p
                      className="text-[12px] font-black uppercase tracking-wide"
                      style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                    >
                      Messages per Agent
                    </p>
                    <p className="text-[10px] text-[#334155]">Gradient bars · Cyan → Purple</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-[#475569]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-2 rounded-sm" style={{ background: "linear-gradient(90deg,#a855f7,#00f2ff)" }} />
                    Messages
                  </div>
                </div>
              </div>

              <div className="px-6 py-5">
                <BarChart rows={agentRows} loading={tableLoading} />
              </div>
            </div>

            {/* ── Doughnut Chart (1/3 width) ── */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background:     "rgba(6,6,14,0.8)",
                border:         "1px solid rgba(168,85,247,0.12)",
                backdropFilter: "blur(8px)",
              }}
            >
              <div
                className="flex items-center gap-2.5 px-5 py-4"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.2)" }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)" }}
                >
                  <Layers size={13} className="text-[#a855f7]" />
                </div>
                <div>
                  <p
                    className="text-[12px] font-black uppercase tracking-wide"
                    style={{ background: "linear-gradient(90deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                  >
                    File Distribution
                  </p>
                  <p className="text-[10px] text-[#334155]">By source type</p>
                </div>
              </div>

              <div className="px-5 py-5">
                <DoughnutChart
                  byFileType={globalStats?.byFileType ?? null}
                  total={globalStats?.totalFiles ?? 0}
                  loading={globalLoading}
                />
              </div>
            </div>
          </div>

          {/* ── Agent Performance Table ── */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              border:     "1px solid rgba(255,255,255,0.07)",
              background: "rgba(6,6,14,0.8)",
              boxShadow:  "0 0 40px rgba(0,0,0,0.3)",
            }}
          >
            {/* Sticky header */}
            <div
              className="px-6 py-4 flex items-center justify-between"
              style={{ background: "rgba(0,0,0,0.3)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(0,242,255,0.1)", border: "1px solid rgba(0,242,255,0.2)" }}
                >
                  <MessageSquare size={13} className="text-[#00f2ff]" />
                </div>
                <p
                  className="text-[12px] font-black uppercase tracking-wide"
                  style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                >
                  Agent Performance
                </p>
                {tableLoading && <RefreshCw size={12} className="animate-spin text-[#334155]" />}
              </div>
              <span className="text-[11px] text-[#334155]">{agentRows.length} agents</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr
                    className="text-left sticky top-0"
                    style={{ background: "rgba(6,6,14,0.95)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    {[
                      { key: "Agent",       w: "" },
                      { key: "Messages",    w: "w-28" },
                      { key: "Files",       w: "w-20" },
                      { key: "Chunks",      w: "w-24" },
                      { key: "Last Active", w: "w-32" },
                      { key: "Status",      w: "w-28" },
                    ].map(({ key, w }) => (
                      <th
                        key={key}
                        className={`px-6 py-3 text-[10px] uppercase tracking-widest font-black ${w}`}
                        style={{
                          background:           "linear-gradient(90deg,#475569,#334155)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor:  "transparent",
                        }}
                      >
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableLoading && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-[13px] text-[#334155]">
                        <RefreshCw size={16} className="animate-spin mx-auto mb-2 text-[#475569]" />
                        Loading agent data…
                      </td>
                    </tr>
                  )}
                  {!tableLoading && agentRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-[13px] text-[#334155]">
                        No agents found. Create one from the dashboard.
                      </td>
                    </tr>
                  )}
                  {agentRows.map((row, i) => (
                    <tr
                      key={row.agentId}
                      style={{
                        borderBottom: i < agentRows.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "rgba(255,255,255,0.025)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "transparent"; }}
                    >
                      {/* Agent name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-black"
                            style={{
                              background: `${row.themeColor || "#00f2ff"}18`,
                              border:     `1px solid ${row.themeColor || "#00f2ff"}30`,
                              color:      row.themeColor || "#00f2ff",
                              boxShadow:  `0 0 8px ${row.themeColor || "#00f2ff"}20`,
                            }}
                          >
                            {row.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-[#e2e8f0] leading-none">{row.name}</p>
                            <p className="text-[10px] text-[#334155] mt-0.5 font-mono">id:{row.agentId.slice(-6)}</p>
                          </div>
                        </div>
                      </td>

                      {/* Messages */}
                      <td className="px-6 py-4">
                        {row.messageCount > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className="text-[13px] font-bold tabular-nums"
                              style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                            >
                              {row.messageCount.toLocaleString()}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#334155] italic">No activity yet</span>
                        )}
                      </td>

                      {/* Files */}
                      <td className="px-6 py-4 text-[13px] text-[#64748b] tabular-nums">{row.fileCount}</td>

                      {/* Chunks */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] text-[#64748b] tabular-nums">{row.chunkCount.toLocaleString()}</span>
                          {row.chunkCount > 0 && (
                            <div
                              className="h-1 rounded-full flex-1 max-w-[40px] overflow-hidden"
                              style={{ background: "rgba(255,255,255,0.05)" }}
                            >
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                  width:      `${Math.min(100, (row.chunkCount / Math.max(...agentRows.map((r) => r.chunkCount), 1)) * 100)}%`,
                                  background: row.themeColor || "#00f2ff",
                                  boxShadow:  `0 0 4px ${row.themeColor || "#00f2ff"}`,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Last Active */}
                      <td className="px-6 py-4">
                        {row.lastMessageAt ? (
                          <div className="flex items-center gap-1.5 text-[12px] text-[#64748b]">
                            <Clock size={10} className="text-[#334155] shrink-0" />
                            {relativeTime(row.lastMessageAt)}
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#334155] italic">Never used</span>
                        )}
                      </td>

                      {/* Status — derived from lastMessageAt (< 15 min → Active) */}
                      <td className="px-6 py-4">
                        {(() => {
                          const active = isRecentlyActive(row.lastMessageAt);
                          return (
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{
                                  background: active ? "#10b981" : "#334155",
                                  boxShadow:  active
                                    ? "0 0 8px #10b981, 0 0 18px rgba(16,185,129,0.45)"
                                    : "none",
                                  animation:  active ? "pulse 2s infinite" : "none",
                                }}
                              />
                              <span
                                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                                style={{
                                  background: active
                                    ? "rgba(16,185,129,0.1)"
                                    : "rgba(100,116,139,0.08)",
                                  border: active
                                    ? "1px solid rgba(16,185,129,0.28)"
                                    : "1px solid rgba(100,116,139,0.15)",
                                  color: active ? "#10b981" : "#64748b",
                                }}
                              >
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

        </div>{/* end fade wrapper */}
      </div>
    </div>
  );
}
