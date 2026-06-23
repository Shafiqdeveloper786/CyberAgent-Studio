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
  theme?:         any;
}

interface Props {
  agents:         SavedAgent[];
  loading:        boolean;
  activeAgentId: string | null;
  onSelect:      (agent: SavedAgent) => void;
  onDelete:      (id: string) => Promise<void>;
}

/* ── Corporate Slate Control Toggle Switch ── */
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
      className="relative shrink-0 focus:outline-none cursor-pointer disabled:cursor-not-allowed"
      style={{ width: 36, height: 20 }}
    >
      {/* Track Framework */}
      <div
        className={cn(
          "absolute inset-0 rounded-full transition-colors duration-200 border",
          isActive 
            ? "bg-emerald-500 border-emerald-600" 
            : "bg-slate-200 border-slate-300"
        )}
      />
      {/* Absolute Sliding Knob */}
      <div
        className="absolute rounded-full bg-white shadow-sm transition-all duration-200"
        style={{
          width: 14,
          height: 14,
          top: 3,
          left: isActive ? 19 : 3,
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
  const [statusOverride, setStatusOverride] = useState<Record<string, "active" | "inactive">>({});
  const [pending, setPending] = useState<{
    type:      "deactivate" | "delete";
    agentId:   string;
    agentName: string;
  } | null>(null);

  const getStatus = (agent: SavedAgent): "active" | "inactive" => {
    if (agent._id in statusOverride) return statusOverride[agent._id];
    return agent.status === "active" ? "active" : "inactive";
  };

  const handleDelete = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation();
    setPending({ type: "delete", agentId: id, agentName: name });
  };

  const confirmDelete = async () => {
    if (!pending || pending.type !== "delete") return;
    const { agentId, agentName } = pending;
    setPending(null);
    setDeletingId(agentId);
    try {
      await onDelete(agentId);
      toast.success(`"${agentName}" successfully removed.`);
    } catch {
      toast.error("Could not delete agent.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (e: React.MouseEvent, agentId: string) => {
    e.stopPropagation();
    if (togglingId === agentId) return;

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

    const agent = agents.find((a) => a._id === agentId);
    if (!agent) return;
    const prevStatus  = getStatus(agent);
    const nextStatus: "active" | "inactive" = prevStatus === "active" ? "inactive" : "active";

    setStatusOverride((prev) => ({ ...prev, [agentId]: nextStatus }));
    setTogglingId(agentId);

    try {
      const res = await fetch(`/api/agents/${agentId}/toggle`, { method: "PATCH" });
      if (!res.ok) throw new Error("Toggle request failed");
      const data = (await res.json()) as { status: "active" | "inactive" };
      setStatusOverride((prev) => ({ ...prev, [agentId]: data.status }));
      toast.success(
        data.status === "active"
          ? `"${agent.name}" deployment initialized.`
          : `"${agent.name}" offline window set.`
      );
    } catch {
      setStatusOverride((prev) => ({ ...prev, [agentId]: prevStatus }));
      toast.error("Failed to sync deployment parameters.");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <section className="space-y-3.5">
      {/* Grid Layout Header Row */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Saved System Agents</p>
        {loading && <RefreshCw size={12} className="animate-spin text-slate-400" />}
      </div>

      {/* Corporate Empty State Wrapper */}
      {!loading && agents.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 py-8 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
          <Bot size={24} className="text-slate-300" />
          <p className="text-[12px] font-medium text-slate-600">No records allocated</p>
          <p className="text-[11px] text-slate-400">Configure and save your first instance setup wizard above</p>
        </div>
      )}

      {/* Populated Dynamic Cards Framework */}
      {agents.length > 0 && (
        <div className="grid grid-cols-1 gap-3">
          {agents.map((agent) => {
            const isSelected  = agent._id === activeAgentId;
            const accentColor = agent.themeColor || "#2563eb";
            const agentStatus = getStatus(agent);
            const isActive    = agentStatus === "active";
            const isToggling  = togglingId === agent._id;

            return (
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
                  "relative group text-left rounded-xl w-full transition-all border p-4 select-none outline-none bg-white",
                  isSelected 
                    ? "border-slate-800 shadow-md shadow-slate-100" 
                    : "border-slate-200 hover:border-slate-300 shadow-sm"
                )}
              >
                {/* Active Framework Context Top Bar Indicator */}
                {isSelected && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider uppercase bg-slate-900 text-white shadow-sm">
                    <Check size={9} strokeWidth={3} /> SELECTED
                  </div>
                )}

                {/* Primary Metadata Content Rows */}
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border shadow-sm transition-colors"
                      style={{ 
                        backgroundColor: isSelected ? `${accentColor}10` : "#f8fafc",
                        borderColor: isSelected ? `${accentColor}25` : "#e2e8f0"
                      }}
                    >
                      <Bot size={15} style={{ color: isSelected ? accentColor : "#64748b" }} />
                    </div>
                    
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-slate-800 truncate leading-tight">
                        {agent.name}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                        Added {new Date(agent.createdAt).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Accessible Trash Action Node Button */}
                  <button
                    onClick={(e) => handleDelete(e, agent._id, agent.name)}
                    title="Delete system record"
                    className={cn(
                      "shrink-0 flex items-center justify-center w-7 h-7 rounded-lg border border-slate-200 bg-white shadow-sm transition-all text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-200",
                      "opacity-0 group-hover:opacity-100 focus:opacity-100",
                      deletingId === agent._id && "opacity-100"
                    )}
                  >
                    {deletingId === agent._id
                      ? <RefreshCw size={11} className="animate-spin" />
                      : <Trash2 size={11} />
                    }
                  </button>
                </div>

                {/* Tag Metadata Layout Row */}
                <div className="mb-3.5">
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-semibold">
                    <Zap size={10} className="text-slate-400 shrink-0" />
                    <span className="truncate max-w-[200px]">{agent.persona}</span>
                  </div>
                </div>

                {/* Structural Border Break Line */}
                <div className="h-px bg-slate-100 -mx-4 my-3" />

                {/* Footer Operations - Syncing with parameters metrics */}
                <div className="flex items-center justify-between">
                  <div 
                    className="flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <StatusToggle
                      agentId={agent._id}
                      isActive={isActive}
                      isToggling={isToggling}
                      onToggle={handleToggle}
                    />
                    <span className={cn(
                      "text-[10px] font-bold tracking-wide uppercase",
                      isActive ? "text-emerald-600" : "text-slate-400"
                    )}>
                      {isToggling ? "Updating Status…" : isActive ? "Active Online" : "Inactive Window"}
                    </span>
                  </div>

                  <div className="text-[9px] font-bold tracking-wider uppercase text-slate-400">
                    System Node
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ── Deactivation Confirmation Dialogue Modal ── */}
      <ConfirmModal
        open={pending?.type === "deactivate"}
        title="Suspend Active Agent Deployment?"
        description="Are you sure you want to decouple this workspace? Current live standalone integrations will terminate processing pipelines instantaneously."
        confirmLabel="Deactivate Framework"
        danger
        onConfirm={confirmDeactivate}
        onCancel={() => setPending(null)}
      />

      {/* ── Permanence Deletion Dialogue Modal ── */}
      <ConfirmModal
        open={pending?.type === "delete"}
        title={`Purge system structural identity: "${pending?.agentName}"?`}
        description="This execution strictly removes the target environment from all remote indexing channels. Re-compiling historical records is impossible."
        confirmLabel="Delete Permanently"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setPending(null)}
      />
    </section>
  );
}