"use client";

import { useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useAgentStore } from "@/store/agentStore";
import { AgentSetup } from "./AgentSetup";
import { WidgetStyling } from "./WidgetStyling";
import { EmbedCodeSection } from "./EmbedCodeSection";
import { WidgetPreview } from "@/components/widget/WidgetPreview";
import { SavedAgentsList, type SavedAgent } from "./SavedAgentsList";
import { useAgents } from "@/lib/swr";

/* Reusable structural section title matching corporate identity layout */
function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h2 className="text-[12px] font-bold tracking-[0.06em] uppercase text-slate-700">
        {children}
      </h2>
      <div className="h-px bg-slate-100 w-full" />
    </div>
  );
}

export function DashboardContent() {
  const { data: session }            = useSession();
  const { loadAgent, activeAgentId } = useAgentStore();

  /* Stable refs so auto-select doesn't loop on activeAgentId change */
  const loadAgentRef      = useRef(loadAgent);
  const activeAgentIdRef  = useRef(activeAgentId);
  useEffect(() => { loadAgentRef.current     = loadAgent;    }, [loadAgent]);
  useEffect(() => { activeAgentIdRef.current = activeAgentId; }, [activeAgentId]);

  const { data: agentsData, isLoading: loadingAgents, mutate: fetchAgents } = useAgents(session?.user?.id);
  const agents = agentsData?.agents || [];

  useEffect(() => {
    if (agentsData?.agents && agentsData.agents.length > 0 && !activeAgentIdRef.current) {
      loadAgentRef.current(agentsData.agents[0]);
    }
  }, [agentsData]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await fetch(`/api/agents/${id}`, { method: "DELETE" });
      fetchAgents();
    } catch (err) {
      console.error("Error deleting agent:", err);
    }
  }, [fetchAgents]);

  const handleSelect = useCallback((agent: SavedAgent) => {
    loadAgent(agent);
  }, [loadAgent]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 h-[calc(100vh-64px)] overflow-hidden">
      {/* ════════════════════════════════════
          LEFT — Dashboard Control Panel (col-span-7)
         ════════════════════════════════════ */}
      <div className="lg:col-span-7 overflow-y-auto h-full pr-2 border-r border-slate-100 bg-white">
        <div className="px-4 sm:px-6 py-5 shrink-0">
          <PanelTitle>Dashboard Control</PanelTitle>
        </div>

        <div className="px-4 sm:px-6 pb-8 space-y-6">
          <AgentSetup onSaved={fetchAgents} />

          <div className="h-px bg-slate-100" />

          <SavedAgentsList
            agents={agents}
            loading={loadingAgents}
            activeAgentId={activeAgentId}
            onSelect={handleSelect}
            onDelete={handleDelete}
          />

          <div className="h-px bg-slate-100" />
          <WidgetStyling />
          <div className="h-px bg-slate-100" />
          <EmbedCodeSection />
        </div>
      </div>

      {/* ════════════════════════════════════
          RIGHT — Live Widget Preview (col-span-5)
          Strictly locked — never scrolls, stays fixed
         ════════════════════════════════════ */}
      <div className="lg:col-span-5 h-full relative">
        <div className="sticky top-0 self-start w-full h-full flex flex-col">
          {/* Section heading */}
          <div className="px-4 sm:px-6 py-5 shrink-0 bg-white">
            <PanelTitle>Live Widget Preview</PanelTitle>
          </div>

          {/* Preview canvas */}
          <div className="flex-1 px-4 sm:px-6 pb-6 lg:pb-8 overflow-hidden">
            <div className="h-full flex flex-col bg-white border border-slate-100 rounded-xl">
              <WidgetPreview />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}