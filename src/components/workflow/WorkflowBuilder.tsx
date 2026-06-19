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
  glow: string; desc: string; lightBg: string;
}> = {
  start:     { label: "Start",      icon: Play,          color: "#10b981", glow: "rgba(16,185,129,0.25)",    desc: "Entry point of the flow",     lightBg: "bg-emerald-50"  },
  action:    { label: "AI Action",  icon: Bot,           color: "#06b6d4", glow: "rgba(6,182,212,0.25)",     desc: "Run an AI processing step",   lightBg: "bg-cyan-50"     },
  condition: { label: "Condition",  icon: GitBranch,     color: "#f59e0b", glow: "rgba(245,158,11,0.25)",    desc: "Branch based on a condition", lightBg: "bg-amber-50"    },
  response:  { label: "Response",   icon: MessageSquare, color: "#a855f7", glow: "rgba(168,85,247,0.25)",    desc: "Send a message to the user",  lightBg: "bg-purple-50"   },
  end:       { label: "End",        icon: StopCircle,    color: "#ef4444", glow: "rgba(239,68,68,0.25)",     desc: "Terminate the flow",          lightBg: "bg-red-50"      },
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

/* ── Geometry helpers ── */
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
   Node Card — Light Theme
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
      {/* Selected ring */}
      {selected && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ boxShadow: `0 0 0 2px ${meta.color}60, 0 0 20px ${meta.glow}` }}
        />
      )}

      <div
        className="relative rounded-xl overflow-hidden transition-all duration-150 bg-white border shadow-md"
        style={{
          borderColor: selected ? meta.color : "rgba(0,0,0,0.1)",
          boxShadow: selected
            ? `0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px ${meta.color}30`
            : "0 2px 8px rgba(0,0,0,0.06)",
        }}
      >
        {/* Color top accent bar */}
        <div
          className="h-0.5 w-full"
          style={{ background: `linear-gradient(90deg,${meta.color},${meta.color}60,transparent)` }}
        />

        <div className="flex items-center gap-3 px-3.5 py-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${meta.color}12`, border: `1px solid ${meta.color}30` }}
          >
            <Icon size={14} style={{ color: meta.color }} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-slate-800 leading-none truncate">{node.label}</p>
            {node.subtitle && (
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">{node.subtitle}</p>
            )}
          </div>

          {node.type !== "start" && node.type !== "end" && (
            <button
              onMouseDown={(e) => { e.stopPropagation(); onDelete(); }}
              onTouchStart={(e) => { e.stopPropagation(); onDelete(); }}
              className="opacity-0 group-hover/node:opacity-100 transition-all w-5 h-5 rounded flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50"
            >
              <Trash2 size={11} />
            </button>
          )}
        </div>

        {node.type === "condition" && (
          <div className="flex justify-between px-3.5 pb-2.5 text-[10px] font-semibold">
            <span className="text-emerald-600">↗ Yes</span>
            <span className="text-red-500">↘ No</span>
          </div>
        )}
      </div>

      {/* Input port */}
      {node.type !== "start" && (
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 bg-white"
          style={{ borderColor: `${meta.color}70` }}
        />
      )}

      {/* Output port(s) */}
      {node.type !== "end" && (
        node.type === "condition" ? (
          <>
            <div className="absolute right-0 top-[35%] translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
            <div className="absolute right-0 top-[65%] translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm" />
          </>
        ) : (
          <div
            className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-sm"
            style={{ background: meta.color }}
          />
        )
      )}
    </motion.div>
  );
}

/* ══════════════════════════════════════════════
   Sidebar Node Card — Light
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
      className="group relative flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-left transition-all duration-150 overflow-hidden bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50/80"
    >
      {/* Left color strip */}
      <div
        className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full"
        style={{ background: meta.color }}
      />

      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all group-hover:scale-110"
        style={{ background: `${meta.color}12`, border: `1px solid ${meta.color}30` }}
      >
        <Icon size={13} style={{ color: meta.color }} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-slate-800">{meta.label}</p>
        <p className="text-[10px] text-slate-400 truncate leading-snug mt-0.5">{meta.desc}</p>
      </div>

      <Plus size={11} className="shrink-0 text-slate-300 group-hover:text-slate-500 transition-colors" />
    </button>
  );
}

/* ══════════════════════════════════════════════
   Main WorkflowBuilder — Light Theme
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

  /* ── Canvas pan ── */
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

      {/* LEFT SIDEBAR — Light */}
      <aside className="hidden sm:flex flex-col w-52 shrink-0 py-4 gap-1.5 overflow-y-auto bg-white border-r border-slate-200">
        <div className="px-4 mb-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Node Types</p>
          <p className="text-[9px] text-slate-400 mt-0.5">Click to add to canvas</p>
        </div>

        <div className="px-2 space-y-1">
          {(Object.entries(NODE_META) as [NodeType, typeof NODE_META[NodeType]][]).map(([type, meta]) => (
            <SidebarNodeCard key={type} type={type} meta={meta} onClick={() => addNode(type)} />
          ))}
        </div>

        <div className="mx-4 my-3 h-px bg-slate-100" />

        <div className="px-4 space-y-2.5">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Tips</p>
          {[
            { icon: MousePointer2, text: "Drag nodes to reposition" },
            { icon: Zap,           text: "Scroll to zoom in/out"    },
          ].map(({ icon: TipIcon, text }) => (
            <div key={text} className="flex items-center gap-2 text-[10px] text-slate-400">
              <TipIcon size={10} className="shrink-0 text-slate-300" />
              {text}
            </div>
          ))}
        </div>
      </aside>

      {/* CANVAS COLUMN */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Toolbar — Light */}
        <div className="flex items-center justify-between px-4 py-2.5 shrink-0 gap-3 flex-wrap bg-white/80 backdrop-blur border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-slate-100 border border-slate-200">
              <GitBranch size={13} className="text-slate-600" />
            </div>
            <div>
              <span className="text-[13px] font-bold tracking-wide text-slate-800">Conversation Flow</span>
              <span className="ml-2 text-[11px] text-slate-400">
                {nodes.length} nodes · {edges.length} edges
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 border border-slate-200">
              <button onClick={() => setZoom((z) => Math.max(30, z - 10))}
                className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all">
                <ZoomOut size={12} />
              </button>
              <span className="text-[11px] text-slate-600 w-9 text-center tabular-nums font-mono">{zoom}%</span>
              <button onClick={() => setZoom((z) => Math.min(160, z + 10))}
                className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all">
                <ZoomIn size={12} />
              </button>
            </div>

            <div className="w-px h-5 bg-slate-200" />

            <button onClick={reset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300">
              <RotateCcw size={11} /> Reset
            </button>

            <button onClick={exportJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 hover:border-blue-300">
              <Download size={11} /> Export JSON
            </button>
          </div>
        </div>

        {/* Canvas — Light bg-slate-50 with subtle dot grid */}
        <div
          ref={canvasRef}
          className={cn("relative flex-1 overflow-hidden", isPanning ? "cursor-grabbing" : "cursor-default")}
          onMouseDown={startPan}
          onTouchStart={startPanTouch}
          onWheel={handleWheel}
          onClick={() => setSelectedId(null)}
          style={{
            background: "#f8fafc",
            backgroundImage: `
              radial-gradient(circle, rgba(148,163,184,0.3) 1px, transparent 1px)
            `,
            backgroundSize: "24px 24px",
          }}
        >
          {/* Zoom + pan transform group */}
          <div
            style={{ position: "absolute", inset: 0, transformOrigin: "0 0", transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})` }}
          >
            {/* SVG edge layer */}
            <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}>
              <defs>
                {/* Arrow markers per node type - slate colors */}
                {(Object.entries(NODE_META) as [NodeType, typeof NODE_META[NodeType]][]).map(([type]) => (
                  <marker key={type} id={`arrow-${type}`} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                    <path d="M0,0.5 L0,6.5 L6.5,3.5 z" fill="#94a3b8" opacity="0.8" />
                  </marker>
                ))}
                <marker id="arrow-yes" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                  <path d="M0,0.5 L0,6.5 L6.5,3.5 z" fill="#10b981" opacity="0.9" />
                </marker>
                <marker id="arrow-no" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                  <path d="M0,0.5 L0,6.5 L6.5,3.5 z" fill="#ef4444" opacity="0.9" />
                </marker>
              </defs>

              {edges.map((edge) => {
                const fromNode = nodes.find((n) => n.id === edge.from);
                const toNode   = nodes.find((n) => n.id === edge.to);
                if (!fromNode || !toNode) return null;
                const path     = calcEdgePath(fromNode, toNode, edge.fromPort);
                const mid      = edgeMid(fromNode, toNode, edge.fromPort);
                const edgeColor = edge.fromPort === "yes" ? "#10b981" : edge.fromPort === "no" ? "#ef4444" : "#94a3b8";
                const arrowId  = edge.fromPort === "yes" ? "yes" : edge.fromPort === "no" ? "no" : toNode.type;
                const dur      = 1.0 + Math.random() * 0.6;

                return (
                  <g key={edge.id}>
                    {/* Shadow */}
                    <path d={path} fill="none" stroke={edgeColor} strokeWidth="2" strokeOpacity="0.08" />
                    {/* Main wire */}
                    <path d={path} fill="none" stroke={edgeColor} strokeWidth="1.5" strokeOpacity="0.5" markerEnd={`url(#arrow-${arrowId})`} />
                    {/* Animated data pulse */}
                    <path d={path} fill="none" stroke={edgeColor} strokeWidth="2" strokeOpacity="0.7" strokeDasharray="5 22" strokeLinecap="round">
                      <animate attributeName="stroke-dashoffset" from="27" to="0" dur={`${dur}s`} repeatCount="indefinite" />
                    </path>
                    {/* Traveling dot */}
                    <circle r="2.5" fill={edgeColor} opacity="0.7">
                      <animateMotion dur={`${dur * 1.5}s`} repeatCount="indefinite" path={path} />
                    </circle>

                    {/* Edge label */}
                    {edge.label && (
                      <g transform={`translate(${mid.x},${mid.y})`}>
                        <rect x="-18" y="-9" width="36" height="18" rx="5" fill="white" stroke={edgeColor} strokeOpacity="0.45" strokeWidth="1" className="shadow-sm" />
                        <text textAnchor="middle" dominantBaseline="middle" fill={edgeColor} fontSize="9" fontWeight="800" fontFamily="monospace">
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

        {/* Selected node inspector — Light */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ y: 56, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{   y: 56, opacity: 0 }}
              transition={{ type: "spring", stiffness: 360, damping: 32 }}
              className="shrink-0 flex items-center gap-4 px-5 py-3 flex-wrap bg-white border-t border-slate-200"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${NODE_META[selectedNode.type].color}12`, border: `1px solid ${NODE_META[selectedNode.type].color}30` }}
              >
                {(() => { const I = NODE_META[selectedNode.type].icon; return <I size={14} style={{ color: NODE_META[selectedNode.type].color }} />; })()}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-slate-800">{selectedNode.label}</p>
                <p className="text-[11px] text-slate-400">{selectedNode.subtitle}</p>
              </div>

              <div className="hidden sm:flex items-center gap-4 text-[11px] text-slate-400 font-mono">
                <span>id: <span className="text-slate-500">{selectedNode.id}</span></span>
                <span>x: <span className="text-slate-500">{Math.round(selectedNode.x)}</span></span>
                <span>y: <span className="text-slate-500">{Math.round(selectedNode.y)}</span></span>
              </div>

              <button onClick={() => setSelectedId(null)}
                className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                <X size={12} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* MOBILE FAB + DRAWER */}
      <div className="sm:hidden">
        <button
          onClick={() => setMobileDrawer(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 bg-blue-600 text-white shadow-lg"
        >
          <Plus size={22} />
        </button>

        <AnimatePresence>
          {mobileDrawer && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                onClick={() => setMobileDrawer(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 320, damping: 30 }}
                className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl overflow-hidden bg-white border border-slate-200 shadow-xl"
              >
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-10 h-1 rounded-full bg-slate-200" />
                </div>

                <div className="flex items-center justify-between px-5 pb-3">
                  <p className="text-[12px] font-bold uppercase tracking-widest text-slate-700">Add Node</p>
                  <button onClick={() => setMobileDrawer(false)} className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 bg-slate-100">
                    <X size={13} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5 px-4 pb-6">
                  {(Object.entries(NODE_META) as [NodeType, typeof NODE_META[NodeType]][]).map(([type, meta]) => {
                    const Icon = meta.icon;
                    return (
                      <button
                        key={type}
                        onClick={() => addNode(type)}
                        className="flex items-center gap-2.5 p-3.5 rounded-2xl text-left active:scale-95 transition-all bg-white border border-slate-200 hover:border-slate-300"
                      >
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                          style={{ background: `${meta.color}12`, border: `1px solid ${meta.color}30` }}>
                          <Icon size={15} style={{ color: meta.color }} />
                        </div>
                        <div>
                          <p className="text-[12px] font-bold text-slate-800">{meta.label}</p>
                          <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{meta.desc}</p>
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