"use client";

import { useState } from "react";
import { Trash2, Bot, RefreshCw, Zap, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export interface SavedAgent {
  _id:            string;
  name:           string;
  persona:        string;
  status:         "active" | "inactive";
  themeColor:     string;
  welcomeMessage: string;
  createdAt:      string;
}

interface Props {
  agents:        SavedAgent[];
  loading:       boolean;
  activeAgentId: string | null;
  onSelect:      (agent: SavedAgent) => void;
  onDelete:      (id: string) => Promise<void>;
}

/* ── Premium neon toggle switch ── */
function StatusToggle({
  agentId,
  isActive,
  isToggling,
  onToggle,
}: {
  agentId:    string;
  isActive:   boolean;
  isToggling: boolean;
  onToggle:   (e: React.MouseEvent, id: string) => void;
}) {
  return (
    <button
      onClick={(e) => onToggle(e, agentId)}
      disabled={isToggling}
      aria-label={isActive ? "Deactivate agent" : "Activate agent"}
      className="relative shrink-0 focus:outline-none"
      style={{ width: 38, height: 22 }}
    >
      {/* Track */}
      <div
        className="absolute inset-0 rounded-full transition-all duration-300"
        style={{
          background: isActive
            ? "rgba(0,255,148,0.18)"
            : "rgba(255,255,255,0.06)",
          border: isActive
            ? "1px solid rgba(0,255,148,0.45)"
            : "1px solid rgba(255,255,255,0.10)",
          boxShadow: isActive ? "0 0 12px rgba(0,255,148,0.25)" : "none",
        }}
      />
      {/* Knob */}
      <div
        className="absolute rounded-full transition-all duration-300"
        style={{
          width:      isToggling ? 18 : 14,
          height:     14,
          top:        4,
          left:       isActive ? (isToggling ? 16 : 20) : 4,
          background: isActive ? "#00ff94" : "#475569",
          boxShadow:  isActive ? "0 0 8px rgba(0,255,148,0.7)" : "none",
          opacity:    isToggling ? 0.6 : 1,
        }}
      />
    </button>
  );
}

export function SavedAgentsList({
  agents,
  loading,
  activeAgentId,
  onSelect,
  onDelete,
}: Props) {
  const [deletingId,     setDeletingId]     = useState<string | null>(null);
  const [togglingId,     setTogglingId]     = useState<string | null>(null);
  /* Local status overrides for optimistic UI — keyed by agentId */
  const [statusOverride, setStatusOverride] = useState<Record<string, "active" | "inactive">>({});
  /* Pending confirmation — set before opening the modal, cleared on dismiss */
  const [pending, setPending] = useState<{
    type:      "deactivate" | "delete";
    agentId:   string;
    agentName: string;
  } | null>(null);

  /* Resolve displayed status: local override wins over server value */
  const getStatus = (agent: SavedAgent): "active" | "inactive" => {
    if (agent._id in statusOverride) return statusOverride[agent._id];
    return agent.status === "active" ? "active" : "inactive";
  };

  /* ── Intercept delete → open confirmation modal ── */
  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setPending({ type: "delete", agentId: id, agentName: name });
  };

  /* ── Perform delete after modal confirmation ── */
  const confirmDelete = async () => {
    if (!pending || pending.type !== "delete") return;
    const { agentId, agentName } = pending;
    setPending(null);
    setDeletingId(agentId);
    try {
      await onDelete(agentId);
      toast.success(`"${agentName}" deleted.`);
    } catch {
      toast.error("Could not delete agent.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (e: React.MouseEvent, agentId: string) => {
    e.stopPropagation();
    if (togglingId === agentId) return;

    /* Deactivation requires confirmation — activating is instant */
    const currentStatus = getStatus(agents.find((a) => a._id === agentId)!);
    if (currentStatus === "active") {
      const agent = agents.find((a) => a._id === agentId);
      setPending({ type: "deactivate", agentId, agentName: agent?.name ?? "this agent" });
      return;
    }
    await executeToggle(agentId);
  };

  const confirmDeactivate = async () => {
    if (!pending || pending.type !== "deactivate") return;
    const { agentId } = pending;
    setPending(null);
    await executeToggle(agentId);
  };

  const executeToggle = async (agentId: string) => {
    if (togglingId === agentId) return;

    const agent       = agents.find((a) => a._id === agentId);
    if (!agent) return;
    const prevStatus  = getStatus(agent);
    const nextStatus: "active" | "inactive" = prevStatus === "active" ? "inactive" : "active";

    /* Optimistic flip */
    setStatusOverride((prev) => ({ ...prev, [agentId]: nextStatus }));
    setTogglingId(agentId);

    try {
      const res = await fetch(`/api/agents/${agentId}/toggle`, { method: "PATCH" });
      if (!res.ok) throw new Error("Toggle request failed");
      const data = (await res.json()) as { status: "active" | "inactive" };
      /* Confirm with server's canonical value */
      setStatusOverride((prev) => ({ ...prev, [agentId]: data.status }));
      toast.success(
        data.status === "active"
          ? `"${agent.name}" is now active.`
          : `"${agent.name}" deactivated.`
      );
    } catch {
      /* Rollback + glassmorphic error toast */
      setStatusOverride((prev) => ({ ...prev, [agentId]: prevStatus }));
      toast.error("Status update failed — please try again.");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="section-label">Saved Agents</p>
        {loading && <RefreshCw size={12} className="animate-spin text-[#334155]" />}
      </div>

      {/* Empty state */}
      {!loading && agents.length === 0 && (
        <div
          className="flex flex-col items-center gap-2.5 py-8 rounded-xl"
          style={{
            background: "rgba(255,255,255,0.015)",
            border:     "1px dashed rgba(255,255,255,0.07)",
          }}
        >
          <Bot size={28} className="text-[#1e293b]" />
          <p className="text-[12px] text-[#334155]">No agents saved yet</p>
          <p className="text-[11px] text-[#1e293b]">Configure and save your first agent above</p>
        </div>
      )}

      {/* Agent cards */}
      {agents.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {agents.map((agent) => {
            const isSelected  = agent._id === activeAgentId;
            const color       = agent.themeColor || "#00f2ff";
            const agentStatus = getStatus(agent);
            const isActive    = agentStatus === "active";
            const isToggling  = togglingId === agent._id;

            return (
              /* div replaces button here — StatusToggle renders its own <button>
                 inside this card. Nesting <button> inside <button> is invalid HTML
                 and triggers React hydration errors. role="button" + tabIndex + onKeyDown
                 preserves full keyboard accessibility.                                   */
              <div
                key={agent._id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(agent)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(agent);
                  }
                }}
                className={cn(
                  "relative group text-left rounded-2xl w-full transition-all duration-300",
                  "cursor-pointer focus:outline-none select-none",
                  isSelected ? "scale-[1.01]" : "hover:scale-[1.005] hover:-translate-y-0.5"
                )}
                style={{
                  padding:        "18px 20px 16px",
                  background:     isSelected
                    ? `linear-gradient(135deg, ${color}12 0%, rgba(5,5,18,0.96) 60%)`
                    : "linear-gradient(135deg, rgba(8,8,24,0.95) 0%, rgba(5,5,18,0.98) 100%)",
                  backdropFilter: "blur(16px)",
                  border:         `1.5px solid ${color}${isSelected ? "60" : "30"}`,
                  boxShadow: [
                    `0 0 0 1px ${color}${isSelected ? "18" : "08"}`,
                    `0 0 ${isSelected ? 40 : 20}px ${color}${isSelected ? "20" : "08"}`,
                    isActive ? `0 0 60px ${color}06` : "",
                    "0 8px 32px rgba(0,0,0,0.5)",
                    `inset 0 1px 0 ${color}${isSelected ? "25" : "12"}`,
                  ].filter(Boolean).join(","),
                }}
              >
                {/* Full-width gradient top shimmer */}
                <div
                  className="absolute top-0 left-0 right-0 h-px rounded-t-2xl"
                  style={{
                    background: `linear-gradient(90deg, transparent 5%, ${color}${isSelected ? "cc" : "70"} 50%, transparent 95%)`,
                  }}
                />

                {/* Left accent stripe */}
                <div
                  className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full"
                  style={{
                    background:  `linear-gradient(180deg, ${color}, ${color}40)`,
                    boxShadow:   `0 0 12px ${color}80`,
                    opacity:     isSelected ? 1 : 0.5,
                    transition:  "opacity .2s",
                  }}
                />

                {/* Selected badge */}
                {isSelected && (
                  <div
                    className="absolute top-3 right-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase"
                    style={{
                      background: `${color}20`,
                      border:     `1px solid ${color}50`,
                      color,
                      boxShadow:  `0 0 8px ${color}30`,
                    }}
                  >
                    <Check size={8} strokeWidth={3.5} /> SELECTED
                  </div>
                )}

                {/* Name + delete row */}
                <div className="flex items-center justify-between gap-3 mb-3 pl-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: `${color}18`,
                        border:     `1px solid ${color}35`,
                        boxShadow:  `0 0 14px ${color}25`,
                      }}
                    >
                      <Bot size={15} style={{ color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-bold text-[#e2e8f0] truncate leading-tight">
                        {agent.name}
                      </p>
                      <p className="text-[10px] text-[#475569] mt-0.5 truncate">
                        {new Date(agent.createdAt).toLocaleDateString("en-US", {
                          month: "long", day: "numeric", year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  <div
                    onClick={(e) => handleDelete(e, agent._id, agent.name)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      handleDelete(e as unknown as React.MouseEvent, agent._id, agent.name)
                    }
                    title="Delete agent"
                    className={cn(
                      "shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150",
                      "opacity-0 group-hover:opacity-100",
                      "text-[#475569] hover:text-red-400 hover:bg-red-500/15",
                      deletingId === agent._id && "opacity-100"
                    )}
                  >
                    {deletingId === agent._id
                      ? <RefreshCw size={12} className="animate-spin" />
                      : <Trash2 size={12} />
                    }
                  </div>
                </div>

                {/* Persona badge */}
                <div className="pl-3 mb-3">
                  <div
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                    style={{
                      background: `${color}12`,
                      border:     `1px solid ${color}28`,
                      color,
                    }}
                  >
                    <Zap size={9} />{agent.persona}
                  </div>
                </div>

                {/* Footer — toggle + status label */}
                <div
                  className="flex items-center justify-between pl-3 pt-3"
                  style={{ borderTop: `1px solid ${color}12` }}
                >
                  <div
                    className="flex items-center gap-2.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <StatusToggle
                      agentId={agent._id}
                      isActive={isActive}
                      isToggling={isToggling}
                      onToggle={handleToggle}
                    />
                    <span
                      className="text-[11px] font-bold transition-all duration-200"
                      style={{
                        color:      isActive ? "#00ff94" : "#334155",
                        textShadow: isActive ? "0 0 10px rgba(0,255,148,0.5)" : "none",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {isToggling ? "updating…" : isActive ? "● ACTIVE" : "○ INACTIVE"}
                    </span>
                  </div>

                  <div
                    className="text-[9px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full"
                    style={{
                      background: `${color}10`,
                      border:     `1px solid ${color}20`,
                      color:      `${color}99`,
                    }}
                  >
                    AGENT
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Deactivation confirmation modal ── */}
      <ConfirmModal
        open={pending?.type === "deactivate"}
        title="Deactivate this agent?"
        description="Are you sure you want to deactivate this agent? It will stop responding on all external websites immediately."
        confirmLabel="Deactivate"
        danger
        onConfirm={confirmDeactivate}
        onCancel={() => setPending(null)}
      />

      {/* ── Deletion confirmation modal ── */}
      <ConfirmModal
        open={pending?.type === "delete"}
        title={`Delete "${pending?.agentName}"?`}
        description="This will permanently remove the agent and all its associated data. This action cannot be undone."
        confirmLabel="Delete Agent"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setPending(null)}
      />
    </section>
  );
}
