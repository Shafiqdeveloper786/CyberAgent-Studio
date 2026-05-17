"use client";

import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Bot, GitBranch, MessageSquare, StopCircle,
  Plus, Trash2, RotateCcw, Download, ZoomIn, ZoomOut,
  Zap, MousePointer2, X, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ══════════════════════════════════════════════
   Types
══════════════════════════════════════════════ */
type NodeType = "start" | "action" | "condition" | "response" | "end";

interface WFNode {
  id: string; type: NodeType;
  label: string; subtitle?: string;
  x: number; y: number;
}
interface WFEdge {
  id: string; from: string; to: string;
  label?: string; fromPort?: "default" | "yes" | "no";
}

/* ══════════════════════════════════════════════
   Constants
══════════════════════════════════════════════ */
const NODE_W = 188;
const NODE_H = 72;

const NODE_META: Record<NodeType, {
  label: string; icon: LucideIcon; color: string;
  glow: string; desc: string; gradient: string;
}> = {
  start:     { label: "Start",      icon: Play,          color: "#00ff94", glow: "rgba(0,255,148,0.3)",    desc: "Entry point of the flow",     gradient: "linear-gradient(135deg,rgba(0,255,148,0.12),rgba(0,255,148,0.04))"  },
  action:    { label: "AI Action",  icon: Bot,           color: "#00f2ff", glow: "rgba(0,242,255,0.3)",    desc: "Run an AI processing step",   gradient: "linear-gradient(135deg,rgba(0,242,255,0.12),rgba(0,242,255,0.04))"  },
  condition: { label: "Condition",  icon: GitBranch,     color: "#f59e0b", glow: "rgba(245,158,11,0.3)",   desc: "Branch based on a condition", gradient: "linear-gradient(135deg,rgba(245,158,11,0.12),rgba(245,158,11,0.04))" },
  response:  { label: "Response",   icon: MessageSquare, color: "#a855f7", glow: "rgba(168,85,247,0.3)",   desc: "Send a message to the user",  gradient: "linear-gradient(135deg,rgba(168,85,247,0.12),rgba(168,85,247,0.04))" },
  end:       { label: "End",        icon: StopCircle,    color: "#f87171", glow: "rgba(248,113,113,0.3)",  desc: "Terminate the flow",          gradient: "linear-gradient(135deg,rgba(248,113,113,0.12),rgba(248,113,113,0.04))" },
};

const DEFAULT_NODES: WFNode[] = [
  { id: "s1", type: "start",     label: "Start",              subtitle: "User sends message",        x:  60, y: 220 },
  { id: "a1", type: "action",    label: "Parse Intent",       subtitle: "Extract intent & entities", x: 300, y: 220 },
  { id: "c1", type: "condition", label: "In Knowledge Base?", subtitle: "Check vector similarity",   x: 540, y: 220 },
  { id: "a2", type: "action",    label: "Generate Response",  subtitle: "GPT-4 with RAG context",    x: 780, y: 120 },
  { id: "a3", type: "action",    label: "Trigger Fallback",   subtitle: "Route to human support",    x: 780, y: 330 },
  { id: "r1", type: "response",  label: "Send Reply",         subtitle: "Stream response to user",   x:1020, y: 220 },
  { id: "e1", type: "end",       label: "End",                subtitle: "Session complete",          x:1250, y: 220 },
];

const DEFAULT_EDGES: WFEdge[] = [
  { id: "e-s1-a1", from: "s1", to: "a1", fromPort: "default" },
  { id: "e-a1-c1", from: "a1", to: "c1", fromPort: "default" },
  { id: "e-c1-a2", from: "c1", to: "a2", fromPort: "yes", label: "Yes" },
  { id: "e-c1-a3", from: "c1", to: "a3", fromPort: "no",  label: "No"  },
  { id: "e-a2-r1", from: "a2", to: "r1", fromPort: "default" },
  { id: "e-a3-r1", from: "a3", to: "r1", fromPort: "default" },
  { id: "e-r1-e1", from: "r1", to: "e1", fromPort: "default" },
];

/* ══════════════════════════════════════════════
   Geometry helpers
══════════════════════════════════════════════ */
function calcEdgePath(from: WFNode, to: WFNode, port: WFEdge["fromPort"]) {
  let sy = from.y + NODE_H / 2;
  if (port === "yes") sy = from.y + NODE_H * 0.35;
  if (port === "no")  sy = from.y + NODE_H * 0.65;
  const sx = from.x + NODE_W;
  const tx = to.x;
  const ty = to.y + NODE_H / 2;
  const dx = Math.max(60, (tx - sx) * 0.45);
  return `M ${sx} ${sy} C ${sx + dx} ${sy} ${tx - dx} ${ty} ${tx} ${ty}`;
}

function edgeMid(from: WFNode, to: WFNode, port: WFEdge["fromPort"]) {
  let sy = from.y + NODE_H / 2;
  if (port === "yes") sy = from.y + NODE_H * 0.35;
  if (port === "no")  sy = from.y + NODE_H * 0.65;
  return { x: (from.x + NODE_W + to.x) / 2, y: (sy + to.y + NODE_H / 2) / 2 };
}

/* ══════════════════════════════════════════════
   Node Card
══════════════════════════════════════════════ */
function NodeCard({ node, selected, onSelect, onDragStart, onDragStartTouch, onDelete }: {
  node: WFNode; selected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.MouseEvent) => void;
  onDragStartTouch: (e: React.TouchEvent) => void;
  onDelete: () => void;
}) {
  const meta = NODE_META[node.type];
  const Icon = meta.icon;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ type: "spring", stiffness: 360, damping: 28 }}
      onMouseDown={(e) => { onSelect(); onDragStart(e); }}
      onTouchStart={(e) => { onSelect(); onDragStartTouch(e); }}
      className="absolute select-none cursor-grab active:cursor-grabbing group/node"
      style={{ left: node.x, top: node.y, width: NODE_W, zIndex: selected ? 10 : 1 }}
    >
      {/* Outer glow ring when selected */}
      {selected && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            boxShadow: `0 0 0 2px ${meta.color}60, 0 0 30px ${meta.glow}, 0 0 60px ${meta.glow.replace("0.3", "0.12")}`,
          }}
        />
      )}

      <div
        className="relative rounded-xl overflow-hidden transition-all duration-150"
        style={{
          background:       `${meta.gradient}, linear-gradient(135deg,rgba(8,8,18,0.92),rgba(5,5,12,0.96))`,
          border:           selected ? `1.5px solid ${meta.color}90` : `1px solid ${meta.color}30`,
          boxShadow:        selected
            ? `0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)`
            : `0 4px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)`,
          backdropFilter:   "blur(8px)",
        }}
      >
        {/* Gradient top accent bar */}
        <div
          className="h-0.5 w-full"
          style={{
            background: `linear-gradient(90deg,${meta.color},${meta.color}40,transparent)`,
            opacity:    selected ? 1 : 0.6,
          }}
        />

        {/* Body */}
        <div className="flex items-center gap-3 px-3.5 py-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: `${meta.color}18`,
              border:     `1px solid ${meta.color}40`,
              boxShadow:  `0 0 12px ${meta.color}20`,
            }}
          >
            <Icon size={14} style={{ color: meta.color }} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-[#e2e8f0] leading-none truncate">{node.label}</p>
            {node.subtitle && (
              <p className="text-[10px] text-[#475569] mt-0.5 truncate">{node.subtitle}</p>
            )}
          </div>

          {node.type !== "start" && node.type !== "end" && (
            <button
              onMouseDown={(e) => { e.stopPropagation(); onDelete(); }}
              onTouchStart={(e) => { e.stopPropagation(); onDelete(); }}
              className="opacity-0 group-hover/node:opacity-100 transition-all w-5 h-5 rounded flex items-center justify-center text-[#475569] hover:text-red-400 hover:bg-red-400/10"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>

        {node.type === "condition" && (
          <div className="flex justify-between px-3.5 pb-2.5 text-[10px] font-semibold">
            <span style={{ color: "#00ff94" }}>↗ Yes</span>
            <span style={{ color: "#f87171" }}>↘ No</span>
          </div>
        )}
      </div>

      {/* Input port */}
      {node.type !== "start" && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full"
          style={{
            background:  "#1a1a2e",
            border:      `2px solid ${meta.color}60`,
            boxShadow:   `0 0 6px ${meta.color}40`,
          }}
        />
      )}

      {/* Output port(s) */}
      {node.type !== "end" && (
        node.type === "condition" ? (
          <>
            <div className="absolute right-0 top-[35%] translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
              style={{ background: "#00ff94", border: "2px solid #1a1a2e", boxShadow: "0 0 8px rgba(0,255,148,0.6)" }} />
            <div className="absolute right-0 top-[65%] translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
              style={{ background: "#f87171", border: "2px solid #1a1a2e", boxShadow: "0 0 8px rgba(248,113,113,0.6)" }} />
          </>
        ) : (
          <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
            style={{
              background:  meta.color,
              border:      "2px solid #1a1a2e",
              boxShadow:   `0 0 8px ${meta.glow}`,
            }}
          />
        )
      )}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════
   Sidebar — Node type card
══════════════════════════════════════════════ */
function SidebarNodeCard({ type, meta, onClick }: {
  type: NodeType;
  meta: typeof NODE_META[NodeType];
  onClick: () => void;
}) {
  const Icon = meta.icon;
  return (
    <button
      onClick={onClick}
      className="group relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-all duration-150 overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.02)",
        border:     `1px solid ${meta.color}18`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = `${meta.color}0a`;
        (e.currentTarget as HTMLButtonElement).style.borderColor = `${meta.color}40`;
        (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 16px ${meta.glow.replace("0.3","0.12")}`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.02)";
        (e.currentTarget as HTMLButtonElement).style.borderColor = `${meta.color}18`;
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
      }}
    >
      {/* Left color strip */}
      <div
        className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full"
        style={{ background: meta.color, boxShadow: `0 0 6px ${meta.color}` }}
      />

      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all group-hover:scale-110"
        style={{
          background: `${meta.color}18`,
          border:     `1px solid ${meta.color}35`,
          boxShadow:  `0 0 10px ${meta.color}15`,
        }}
      >
        <Icon size={13} style={{ color: meta.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold" style={{ color: meta.color }}>{meta.label}</p>
        <p className="text-[10px] text-[#334155] truncate leading-snug mt-0.5">{meta.desc}</p>
      </div>

      <Plus size={11} className="shrink-0 text-[#334155] group-hover:text-[#64748b] transition-colors" />
    </button>
  );
}

/* ══════════════════════════════════════════════
   Main WorkflowBuilder
══════════════════════════════════════════════ */
export function WorkflowBuilder() {
  const [nodes, setNodes]           = useState<WFNode[]>(DEFAULT_NODES);
  const [edges]                     = useState<WFEdge[]>(DEFAULT_EDGES);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom]             = useState(80);
  const [pan, setPan]               = useState({ x: 20, y: 20 });
  const [isPanning, setIsPanning]   = useState(false);
  const [mobileDrawer, setMobileDrawer] = useState(false);
  const panStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  /* ── Node drag (mouse) ── */
  const startNodeDrag = useCallback((e: React.MouseEvent, nodeId: string) => {
    e.preventDefault(); e.stopPropagation();
    const sx = e.clientX; const sy = e.clientY;
    const scale = zoom / 100;
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const nx = node.x; const ny = node.y;
    const onMove = (ev: MouseEvent) => setNodes((p) =>
      p.map((n) => n.id === nodeId ? { ...n, x: nx + (ev.clientX - sx) / scale, y: ny + (ev.clientY - sy) / scale } : n)
    );
    const onUp = () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [nodes, zoom]);

  /* ── Node drag (touch) ── */
  const startNodeDragTouch = useCallback((e: React.TouchEvent, nodeId: string) => {
    e.stopPropagation();
    const touch = e.touches[0];
    const sx = touch.clientX; const sy = touch.clientY;
    const scale = zoom / 100;
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const nx = node.x; const ny = node.y;
    const onMove = (ev: TouchEvent) => {
      ev.preventDefault();
      const t = ev.touches[0];
      setNodes((p) => p.map((n) => n.id === nodeId ? { ...n, x: nx + (t.clientX - sx) / scale, y: ny + (t.clientY - sy) / scale } : n));
    };
    const onEnd = () => { window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onEnd); };
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
  }, [nodes, zoom]);

  /* ── Canvas pan (mouse) ── */
  const startPan = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".node-card")) return;
    setIsPanning(true);
    panStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    const onMove = (ev: MouseEvent) => {
      if (!panStart.current) return;
      setPan({ x: panStart.current.px + ev.clientX - panStart.current.mx, y: panStart.current.py + ev.clientY - panStart.current.my });
    };
    const onUp = () => { setIsPanning(false); panStart.current = null; window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [pan]);

  /* ── Canvas pan (touch) ── */
  const startPanTouch = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest(".node-card")) return;
    const touch = e.touches[0];
    panStart.current = { mx: touch.clientX, my: touch.clientY, px: pan.x, py: pan.y };
    const onMove = (ev: TouchEvent) => {
      if (!panStart.current || ev.touches.length !== 1) return;
      const t = ev.touches[0];
      setPan({ x: panStart.current.px + t.clientX - panStart.current.mx, y: panStart.current.py + t.clientY - panStart.current.my });
    };
    const onEnd = () => { panStart.current = null; window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onEnd); };
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
  }, [pan]);

  /* ── Wheel zoom ── */
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(160, Math.max(30, z - e.deltaY * 0.05)));
  }, []);

  /* ── Add node ── */
  const addNode = (type: NodeType) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    const scale = zoom / 100;
    const cx = rect ? (rect.width  / 2 - pan.x) / scale - NODE_W / 2 : 200;
    const cy = rect ? (rect.height / 2 - pan.y) / scale - NODE_H / 2 : 200;
    const meta = NODE_META[type];
    setNodes((p) => [...p, { id: `n-${Date.now()}`, type, label: meta.label, subtitle: meta.desc, x: cx, y: cy }]);
    setMobileDrawer(false);
  };

  const deleteNode = (id: string) => { setNodes((p) => p.filter((n) => n.id !== id)); if (selectedId === id) setSelectedId(null); };
  const reset = () => { setNodes(DEFAULT_NODES); setZoom(80); setPan({ x: 20, y: 20 }); setSelectedId(null); };

  const exportJSON = () => {
    const data = JSON.stringify({ nodes, edges }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "workflow.json"; a.click();
    URL.revokeObjectURL(url);
  };

  const selectedNode = nodes.find((n) => n.id === selectedId);

  return (
    <div className="flex h-full overflow-hidden">

      {/* ════════════════════════════
          LEFT SIDEBAR (desktop)
      ════════════════════════════ */}
      <aside
        className="hidden sm:flex flex-col w-52 shrink-0 py-4 gap-1.5 overflow-y-auto"
        style={{
          background:   "rgba(6,6,14,0.98)",
          borderRight:  "1px solid rgba(255,255,255,0.06)",
          boxShadow:    "4px 0 20px rgba(0,0,0,0.3)",
        }}
      >
        {/* Sidebar heading */}
        <div className="px-4 mb-3">
          <p
            className="text-[10px] font-black tracking-widest uppercase"
            style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            Node Types
          </p>
          <p className="text-[9px] text-[#334155] mt-0.5">Click to add to canvas</p>
        </div>

        <div className="px-2 space-y-1">
          {(Object.entries(NODE_META) as [NodeType, typeof NODE_META[NodeType]][]).map(([type, meta]) => (
            <SidebarNodeCard key={type} type={type} meta={meta} onClick={() => addNode(type)} />
          ))}
        </div>

        {/* Divider */}
        <div className="mx-4 my-3 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(0,242,255,0.15),transparent)" }} />

        {/* Tips */}
        <div className="px-4 space-y-2.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-[#334155]">Tips</p>
          {[
            { icon: MousePointer2, text: "Drag nodes to reposition" },
            { icon: Zap,           text: "Scroll to zoom in/out"    },
          ].map(({ icon: TipIcon, text }) => (
            <div key={text} className="flex items-center gap-2 text-[10px] text-[#334155]">
              <TipIcon size={10} className="shrink-0 text-[#475569]" />
              {text}
            </div>
          ))}
        </div>
      </aside>

      {/* ════════════════════════════
          CANVAS COLUMN
      ════════════════════════════ */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* ── Toolbar ── */}
        <div
          className="flex items-center justify-between px-4 py-2.5 shrink-0 gap-3 flex-wrap"
          style={{
            background:   "rgba(6,6,14,0.97)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            boxShadow:    "0 4px 20px rgba(0,0,0,0.4)",
          }}
        >
          {/* Title */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(0,242,255,0.1)", border: "1px solid rgba(0,242,255,0.25)", boxShadow: "0 0 12px rgba(0,242,255,0.15)" }}
            >
              <GitBranch size={13} className="text-[#00f2ff]" />
            </div>
            <div>
              <span
                className="text-[13px] font-black tracking-wide"
                style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
              >
                Conversation Flow
              </span>
              <span className="ml-2 text-[11px] text-[#334155]">
                {nodes.length} nodes · {edges.length} edges
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5">
            {/* Zoom buttons */}
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-lg"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <button
                onClick={() => setZoom((z) => Math.max(30, z - 10))}
                className="w-6 h-6 flex items-center justify-center rounded text-[#64748b] hover:text-[#00f2ff] transition-all hover:bg-[rgba(0,242,255,0.08)]"
              >
                <ZoomOut size={12} />
              </button>
              <span className="text-[11px] text-[#64748b] w-9 text-center tabular-nums font-mono">{zoom}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(160, z + 10))}
                className="w-6 h-6 flex items-center justify-center rounded text-[#64748b] hover:text-[#00f2ff] transition-all hover:bg-[rgba(0,242,255,0.08)]"
              >
                <ZoomIn size={12} />
              </button>
            </div>

            <div className="w-px h-5 bg-white/[0.07]" />

            {/* Reset */}
            <button
              onClick={reset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", color: "#64748b" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.14)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 12px rgba(255,255,255,0.04)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#64748b"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; }}
            >
              <RotateCcw size={11} /> Reset
            </button>

            {/* Export */}
            <button
              onClick={exportJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
              style={{
                background: "linear-gradient(90deg,rgba(0,242,255,0.15),rgba(168,85,247,0.15))",
                border:     "1px solid rgba(0,242,255,0.3)",
                color:      "#00f2ff",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 20px rgba(0,242,255,0.2)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,242,255,0.5)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.boxShadow = "none"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,242,255,0.3)"; }}
            >
              <Download size={11} /> Export JSON
            </button>
          </div>
        </div>

        {/* ── Canvas ── */}
        <div
          ref={canvasRef}
          className={cn("relative flex-1 overflow-hidden", isPanning ? "cursor-grabbing" : "cursor-default")}
          onMouseDown={startPan}
          onTouchStart={startPanTouch}
          onWheel={handleWheel}
          onClick={() => setSelectedId(null)}
          style={{
            /* Cyber-grid: neon dots at intersections + subtle grid lines */
            background: "#04040c",
            backgroundImage: `
              radial-gradient(circle at 25% 20%, rgba(0,242,255,0.045) 0%, transparent 45%),
              radial-gradient(circle at 78% 75%, rgba(168,85,247,0.04) 0%, transparent 45%),
              radial-gradient(circle, rgba(0,242,255,0.18) 1px, transparent 1px),
              linear-gradient(rgba(0,242,255,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,242,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: "100% 100%, 100% 100%, 32px 32px, 32px 32px, 32px 32px",
          }}
        >
          {/* Vignette overlay */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 50%, rgba(4,4,12,0.6) 100%)" }}
          />

          {/* Zoom + pan transform group */}
          <div
            style={{ position: "absolute", inset: 0, transformOrigin: "0 0", transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})` }}
          >
            {/* SVG edge layer */}
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}>
              <defs>
                {/* Arrow markers per node type */}
                {(Object.entries(NODE_META) as [NodeType, typeof NODE_META[NodeType]][]).map(([type, meta]) => (
                  <marker key={type} id={`arrow-${type}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                    <path d="M0,0.5 L0,6.5 L6.5,3.5 z" fill={meta.color} opacity="0.8" />
                  </marker>
                ))}
                <marker id="arrow-yes" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                  <path d="M0,0.5 L0,6.5 L6.5,3.5 z" fill="#00ff94" opacity="0.9" />
                </marker>
                <marker id="arrow-no" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                  <path d="M0,0.5 L0,6.5 L6.5,3.5 z" fill="#f87171" opacity="0.9" />
                </marker>
              </defs>

              {edges.map((edge) => {
                const fromNode = nodes.find((n) => n.id === edge.from);
                const toNode   = nodes.find((n) => n.id === edge.to);
                if (!fromNode || !toNode) return null;
                const path     = calcEdgePath(fromNode, toNode, edge.fromPort);
                const mid      = edgeMid(fromNode, toNode, edge.fromPort);
                const fromMeta = NODE_META[fromNode.type];
                const edgeColor = edge.fromPort === "yes" ? "#00ff94" : edge.fromPort === "no" ? "#f87171" : fromMeta.color;
                const arrowId  = edge.fromPort === "yes" ? "yes" : edge.fromPort === "no" ? "no" : toNode.type;
                const dur      = 1.0 + Math.random() * 0.6;

                return (
                  <g key={edge.id}>
                    {/* Wide glow shadow */}
                    <path d={path} fill="none" stroke={edgeColor} strokeWidth="8" strokeOpacity="0.04" />
                    {/* Medium glow */}
                    <path d={path} fill="none" stroke={edgeColor} strokeWidth="3" strokeOpacity="0.1" />
                    {/* Main wire */}
                    <path
                      d={path} fill="none"
                      stroke={edgeColor} strokeWidth="1.5" strokeOpacity="0.45"
                      markerEnd={`url(#arrow-${arrowId})`}
                    />
                    {/* Animated data pulse */}
                    <path
                      d={path} fill="none"
                      stroke={edgeColor} strokeWidth="2"
                      strokeOpacity="0.9" strokeDasharray="5 22"
                      strokeLinecap="round"
                    >
                      <animate attributeName="stroke-dashoffset" from="27" to="0" dur={`${dur}s`} repeatCount="indefinite" />
                    </path>
                    {/* Traveling dot (data packet) */}
                    <circle r="3" fill={edgeColor} opacity="0.9" style={{ filter: `drop-shadow(0 0 4px ${edgeColor})` }}>
                      <animateMotion dur={`${dur * 1.5}s`} repeatCount="indefinite" path={path} />
                    </circle>

                    {/* Edge label */}
                    {edge.label && (
                      <g transform={`translate(${mid.x},${mid.y})`}>
                        <rect x="-18" y="-9" width="36" height="18" rx="5"
                          fill="#06060e" stroke={edgeColor} strokeOpacity="0.45" strokeWidth="1"
                          style={{ filter: `drop-shadow(0 0 6px ${edgeColor}50)` }}
                        />
                        <text textAnchor="middle" dominantBaseline="middle"
                          fill={edgeColor} fontSize="9" fontWeight="800" fontFamily="monospace">
                          {edge.label}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Nodes */}
            <AnimatePresence>
              {nodes.map((node) => (
                <NodeCard
                  key={node.id}
                  node={node}
                  selected={selectedId === node.id}
                  onSelect={() => setSelectedId(node.id)}
                  onDragStart={(e) => startNodeDrag(e, node.id)}
                  onDragStartTouch={(e) => startNodeDragTouch(e, node.id)}
                  onDelete={() => deleteNode(node.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Selected node inspector ── */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ y: 56, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{   y: 56, opacity: 0 }}
              transition={{ type: "spring", stiffness: 360, damping: 32 }}
              className="shrink-0 flex items-center gap-4 px-5 py-3 flex-wrap"
              style={{
                background:  "rgba(6,6,14,0.99)",
                borderTop:   `1px solid ${NODE_META[selectedNode.type].color}35`,
                boxShadow:   `0 -4px 20px ${NODE_META[selectedNode.type].glow.replace("0.3","0.08")}`,
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: `${NODE_META[selectedNode.type].color}15`,
                  border:     `1px solid ${NODE_META[selectedNode.type].color}35`,
                  boxShadow:  `0 0 12px ${NODE_META[selectedNode.type].glow}`,
                }}
              >
                {(() => { const I = NODE_META[selectedNode.type].icon; return <I size={14} style={{ color: NODE_META[selectedNode.type].color }} />; })()}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold" style={{ color: NODE_META[selectedNode.type].color }}>
                  {selectedNode.label}
                </p>
                <p className="text-[11px] text-[#475569]">{selectedNode.subtitle}</p>
              </div>

              <div className="hidden sm:flex items-center gap-4 text-[11px] text-[#334155] font-mono">
                <span>id: <span className="text-[#475569]">{selectedNode.id}</span></span>
                <span>x: <span className="text-[#475569]">{Math.round(selectedNode.x)}</span></span>
                <span>y: <span className="text-[#475569]">{Math.round(selectedNode.y)}</span></span>
              </div>

              <button onClick={() => setSelectedId(null)}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[#334155] hover:text-[#94a3b8] hover:bg-white/[0.06] transition-all">
                <X size={12} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ════════════════════════════
          MOBILE FAB + DRAWER
      ════════════════════════════ */}
      <div className="sm:hidden">
        {/* Floating plus button */}
        <button
          onClick={() => setMobileDrawer(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95"
          style={{
            background: "linear-gradient(135deg,#00f2ff,#a855f7)",
            boxShadow:  "0 4px 24px rgba(0,242,255,0.5), 0 0 40px rgba(168,85,247,0.3)",
          }}
        >
          <Plus size={22} style={{ color: "#050508" }} />
        </button>

        {/* Bottom drawer */}
        <AnimatePresence>
          {mobileDrawer && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                onClick={() => setMobileDrawer(false)}
              />
              {/* Sheet */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden"
                style={{
                  background:   "rgba(8,8,18,0.98)",
                  border:       "1px solid rgba(0,242,255,0.15)",
                  borderBottom: "none",
                  boxShadow:    "0 -8px 40px rgba(0,0,0,0.6)",
                  paddingBottom: "env(safe-area-inset-bottom,16px)",
                }}
              >
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-10 h-1 rounded-full bg-white/10" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 pb-3">
                  <p className="text-[12px] font-black uppercase tracking-widest"
                    style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    Add Node
                  </p>
                  <button onClick={() => setMobileDrawer(false)} className="w-7 h-7 rounded-full flex items-center justify-center text-[#475569] hover:text-[#94a3b8] bg-white/[0.05]">
                    <X size={13} />
                  </button>
                </div>

                {/* Node chips */}
                <div className="grid grid-cols-2 gap-2.5 px-4 pb-6">
                  {(Object.entries(NODE_META) as [NodeType, typeof NODE_META[NodeType]][]).map(([type, meta]) => {
                    const Icon = meta.icon;
                    return (
                      <button
                        key={type}
                        onClick={() => addNode(type)}
                        className="flex items-center gap-2.5 p-3.5 rounded-2xl text-left active:scale-95 transition-all"
                        style={{
                          background: `${meta.color}0a`,
                          border:     `1px solid ${meta.color}30`,
                          boxShadow:  `0 0 16px ${meta.glow.replace("0.3","0.08")}`,
                        }}
                      >
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: `${meta.color}20`, border: `1px solid ${meta.color}40` }}>
                          <Icon size={15} style={{ color: meta.color }} />
                        </div>
                        <div>
                          <p className="text-[12px] font-bold" style={{ color: meta.color }}>{meta.label}</p>
                          <p className="text-[10px] text-[#334155] leading-tight mt-0.5">{meta.desc.slice(0, 20)}…</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
