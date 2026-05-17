"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useAgentStore } from "@/store/agentStore";
import { AgentSetup } from "./AgentSetup";
import { WidgetStyling } from "./WidgetStyling";
import { EmbedCodeSection } from "./EmbedCodeSection";
import { WidgetPreview } from "@/components/widget/WidgetPreview";
import { SavedAgentsList, type SavedAgent } from "./SavedAgentsList";

/* Gradient panel title used for both columns */
function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h2
        className="text-[12px] font-black tracking-[0.14em] uppercase"
        style={{
          background:           "linear-gradient(90deg,#00f2ff 0%,#a855f7 80%,#ec4899 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor:  "transparent",
          textShadow:           "none",
          filter:               "drop-shadow(0 0 8px rgba(0,242,255,0.25))",
        }}
      >
        {children}
      </h2>
      <div
        style={{
          height:     1,
          background: "linear-gradient(90deg,rgba(0,242,255,0.35),rgba(168,85,247,0.15),transparent)",
        }}
      />
    </div>
  );
}

export function DashboardContent() {
  const { data: session }            = useSession();
  const { loadAgent, activeAgentId } = useAgentStore();

  /* Stable refs so fetchAgents doesn't re-create on every activeAgentId change,
     which would cause a fetch-loop after auto-select fires.                     */
  const loadAgentRef      = useRef(loadAgent);
  const activeAgentIdRef  = useRef(activeAgentId);
  useEffect(() => { loadAgentRef.current     = loadAgent;    }, [loadAgent]);
  useEffect(() => { activeAgentIdRef.current = activeAgentId; }, [activeAgentId]);

  const [agents,        setAgents]        = useState<SavedAgent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);

  const fetchAgents = useCallback(async () => {
    if (!session?.user?.id) return;
    setLoadingAgents(true);
    try {
      const res = await fetch("/api/agents");
      if (res.ok) {
        const list = ((await res.json()) as { agents: SavedAgent[] }).agents ?? [];
        setAgents(list);
        /* Auto-select: on the 1-agent plan, bind the agent globally so all
           pages (Knowledge Base, Analytics, Embed Code) work without the user
           having to manually click a card first.                              */
        if (!activeAgentIdRef.current && list.length > 0) {
          loadAgentRef.current(list[0]);
        }
      }
    } catch { /* silent */ } finally {
      setLoadingAgents(false);
    }
  }, [session?.user?.id]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const handleDelete = useCallback(async (id: string) => {
    setAgents((prev) => prev.filter((a) => a._id !== id));
    const res = await fetch(`/api/agents/${id}`, { method: "DELETE" });
    if (!res.ok) fetchAgents();
  }, [fetchAgents]);

  const handleSelect = useCallback((agent: SavedAgent) => {
    loadAgent(agent);
  }, [loadAgent]);

  return (
    <div className="flex flex-col lg:flex-row lg:h-full lg:min-h-0">

      {/* ════════════════════════════════════
          LEFT — Dashboard Control
      ════════════════════════════════════ */}
      <div
        className="w-full lg:w-[52%] xl:w-[48%] lg:min-h-0 lg:overflow-y-auto"
        style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}
      >
        <div className="px-4 sm:px-6 py-5 shrink-0">
          <PanelTitle>Dashboard Control</PanelTitle>
        </div>

        <div className="px-4 sm:px-6 pb-8 space-y-8">
          <AgentSetup onSaved={fetchAgents} />

          <div className="h-px bg-white/5" />

          <SavedAgentsList
            agents={agents}
            loading={loadingAgents}
            activeAgentId={activeAgentId}
            onSelect={handleSelect}
            onDelete={handleDelete}
          />

          <div className="h-px bg-white/5" />
          <WidgetStyling />
          <div className="h-px bg-white/5" />
          <EmbedCodeSection />
        </div>
      </div>

      {/* ════════════════════════════════════
          RIGHT — Live Widget Preview
      ════════════════════════════════════ */}
      <div
        className="flex flex-col lg:flex-1 lg:min-h-0 lg:overflow-hidden"
        style={{ minHeight: 520 }}
      >
        {/* Single heading — not repeated inside WidgetPreview */}
        <div className="px-4 sm:px-6 py-5 shrink-0">
          <PanelTitle>Live Widget Preview</PanelTitle>
        </div>

        <div className="flex-1 px-4 sm:px-6 pb-6 lg:pb-8 lg:min-h-0 lg:overflow-hidden">
          <WidgetPreview />
        </div>
      </div>

    </div>
  );
}
