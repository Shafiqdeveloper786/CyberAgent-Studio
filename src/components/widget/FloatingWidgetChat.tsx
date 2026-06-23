"use client";

import { useEffect, useState, useRef } from "react";
import { WidgetChat } from "@/components/widget/WidgetChat";

/**
 * FloatingWidgetChat — Renders the live chat widget as an overlay
 * at the bottom-right of the dashboard, synced with the user's
 * active agent config from the database.
 *
 * Architecture:
 *   1. Fetches the user's first agent from /api/agents endpoint on mount.
 *   2. Renders a floating launcher bubble + expandable panel.
 *   3. Inside the panel, renders WidgetChat DIRECTLY (no iframe),
 *      passing the live DB config as props.
 */

function MessageCircleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
      fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-4.5-7.8" />
      <path d="M21 3v6h-6" />
      <path d="M12 12h.01M9 12h.01M15 12h.01" />
    </svg>
  );
}

interface AgentDoc {
  _id:            string;
  name:           string;
  themeColor:     string;
  theme:          string;
  welcomeMessage: string;
  logoUrl:        string;
}

export function FloatingWidgetChat() {
  const [open, setOpen] = useState(false);
  const [agent, setAgent] = useState<AgentDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  /* Fetch the user's primary agent from API */
  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const res = await fetch("/api/agents");
        if (!res.ok) {
          if (res.status === 401) { setLoading(false); return; }
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        if (Array.isArray(data.agents) && data.agents.length > 0) {
          setAgent(data.agents[0]);
        }
      } catch (err) {
        console.warn("[FloatingWidget] Failed to fetch agent:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAgent();
  }, []);

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  /* Listen for close message from WidgetChat's native X button */
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.channel === "nexa-agent" && e.data?.command === "CLOSE") {
        setOpen(false);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  if (typeof window !== "undefined" && window.location.pathname.startsWith("/widget/")) {
    return null;
  }

  if (loading || !agent) return null;

  /* ── TASK 2: Brand accent #6366f1 as fallback ── */
  const accent = agent.themeColor || "#6366f1";

  return (
    <>
      <style>{`
        #floating-widget-chat-root {
          position: fixed !important;
          bottom: 20px !important;
          right: 20px !important;
          z-index: 9999 !important;
        }
        #floating-widget-chat-root.fl-expanded {
          width: 400px !important;
          height: 600px !important;
          max-height: 85vh !important;
          border-radius: 16px !important;
          bottom: 24px !important;
          right: 24px !important;
          background: #ffffff !important;
          box-shadow: 0 12px 40px rgba(0,0,0,.15), 0 0 0 1px #e2e8f0 !important;
          overflow: hidden !important;
        }
        @media (max-width: 640px) {
          #floating-widget-chat-root.fl-expanded {
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            bottom: 0 !important;
            right: 0 !important;
            width: 100% !important;
            height: 100% !important;
            max-height: 100% !important;
            border-radius: 0 !important;
            z-index: 9999 !important;
          }
        }
        #floating-widget-launcher {
          position: absolute !important;
          bottom: 0 !important;
          right: 0 !important;
          z-index: 2 !important;
          width: 60px !important;
          height: 60px !important;
          border-radius: 50% !important;
          border: none !important;
          cursor: pointer !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 !important;
          outline: none !important;
          touch-action: manipulation !important;
          user-select: none !important;
          -webkit-tap-highlight-color: transparent !important;
          transition: transform .2s ease, box-shadow .2s ease;
        }
        #floating-widget-launcher:hover {
          transform: scale(1.08);
        }
        #floating-widget-chat-root.fl-expanded #floating-widget-launcher {
          display: none !important;
        }
      `}</style>

      <div
        id="floating-widget-chat-root"
        ref={containerRef}
        className={open ? "fl-expanded" : ""}
        style={open ? undefined : { width: 60, height: 60 }}
      >
        {open ? (
          <div style={{ width: "100%", height: "100%", position: "relative", isolation: "isolate" }}>
            <WidgetChat
              agentId={agent._id}
              agentName={agent.name}
              accentColor={accent}
              theme={agent.theme || "corporate-light"}
              logoUrl={agent.logoUrl || "/logo1.png"}
              welcomeMessage={agent.welcomeMessage || ""}
            />
          </div>
        ) : (
          <button
            id="floating-widget-launcher"
            onClick={() => setOpen(true)}
            aria-label="Open CyberAgent chat"
            style={{
              background: `linear-gradient(135deg, ${accent}, #7c3aed)`,
              boxShadow: `0 4px 20px ${accent}80, 0 2px 8px rgba(0,0,0,.4)`,
            }}
          >
            <MessageCircleIcon />
          </button>
        )}
      </div>
    </>
  );
}