"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { useAgentStore } from "@/store/agentStore";
import { AgentSetup } from "./AgentSetup";
import { WidgetStyling } from "./WidgetStyling";
import { EmbedCodeSection } from "./EmbedCodeSection";
import { WidgetPreview } from "@/components/widget/WidgetPreview";
import { SavedAgentsList, type SavedAgent } from "./SavedAgentsList";
import { MessageCircle, X } from "lucide-react";

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
  const { data: session, status }      = useSession();
  const { loadAgent, activeAgentId } = useAgentStore();

  /* Stable refs so fetchAgents doesn't re-create on every activeAgentId change,
     which would cause a fetch-loop after auto-select fires.                  */
  const loadAgentRef      = useRef(loadAgent);
  const activeAgentIdRef  = useRef(activeAgentId);
  useEffect(() => { loadAgentRef.current     = loadAgent;    }, [loadAgent]);
  useEffect(() => { activeAgentIdRef.current = activeAgentId; }, [activeAgentId]);

  const [agents,        setAgents]        = useState<SavedAgent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

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
           having to manually click a card first.                             */
        if (!activeAgentIdRef.current && list.length > 0) {
          loadAgentRef.current(list[0]);
        }
      }
    } catch { /* silent */ } finally {
      setLoadingAgents(false);
    }
  }, [session?.user?.id]);

  /* Check verification status */
  useEffect(() => {
    if (status === "authenticated") {
      setIsVerified(true);
    }
  }, [status]);

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
    <div className="grid grid-cols-1 lg:grid-cols-12 h-[calc(100vh-64px)] overflow-hidden">

      {/* Floating Chat Button with Label */}
      {!chatOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-2">
          <span className="text-xs font-semibold text-slate-700 bg-white px-3 py-1.5 rounded-full shadow-md border border-slate-200">
            Let's Talk
          </span>
          <button
            onClick={() => setChatOpen(true)}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-xl hover:shadow-2xl hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center"
            title="Open chat preview"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </button>
        </div>
      )}

      {/* Chat Preview Modal */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md h-[600px] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-bold text-slate-900">Chat Preview</h3>
              <button
                onClick={() => setChatOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <WidgetPreview />
            </div>
          </div>
        </div>
      )}

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
            <div 
              className="h-full flex flex-col bg-white border border-slate-100 rounded-xl transition-all duration-500"
              style={{
                filter: isVerified ? 'none' : 'blur(8px)',
                pointerEvents: isVerified ? 'auto' : 'none',
                opacity: isVerified ? 1 : 0.6,
              }}
            >
              <WidgetPreview />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}