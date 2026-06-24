"use client";

/**
 * AgentEmbedScript — Zero-Hydration Script Injector
 *
 * WHY return null + useEffect:
 *
 * The previous version used useState(BUILD_TIME_BASE) to initialise a
 * <Script src="..."> element, relying on the server and first client
 * render producing the same src string to avoid hydration mismatches.
 * This worked when NEXT_PUBLIC_APP_URL was set correctly, but failed in
 * two ways when it was missing or wrong:
 *
 * 1. React Error #418 — hydration mismatch loop:
 * If the env var resolved to "http://localhost:3000" in the build
 * environment but the browser was on the Vercel domain, the server
 * rendered src="http://localhost:3000/embed.js" while the useEffect
 * tried to correct it. React detected a mismatch between the SSR
 * HTML and the client VDOM, triggering Error #418 and a re-render
 * loop via the Script component's internal postMessage mechanism.
 *
 * 2. GET localhost:3000/embed.js ERR_CONNECTION_REFUSED:
 * The browser tried to fetch the localhost URL that was baked into
 * the server-rendered HTML before useEffect could correct it.
 *
 * Solution — decouple completely from the React render tree:
 * • Both server render and initial client render return null.
 * • Server emits zero bytes for this component → nothing to hydrate.
 * • useEffect fires after React hydration is complete and confirmed.
 * • Script tag is created via raw DOM APIs, invisible to React's
 * reconciler — no hydration surface, no mismatch possible.
 * • window.location.origin is read safely (browser-only context).
 */

import { useEffect, useState } from "react";

interface AgentEmbedScriptProps {
  /** MongoDB ObjectId of the agent whose widget to embed */
  agentId: string;
  /** Hex color for the corporate widget accent (Defaults to Enterprise Blue: "#2563eb") */
  accentColor?: string;
}

const PRODUCTION_FALLBACK = "https://cyber-agent-studio.vercel.app";

export function AgentEmbedScript({
  agentId,
  accentColor = "#2563eb",
}: AgentEmbedScriptProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    if (window.location.pathname.startsWith("/widget/")) return;

    /* ── AGENT CONTEXT ISOLATION: If agentId changed, remove old embed ── */
    const existingScript = document.getElementById("system-agent-universal-script");
    if (existingScript) {
      const currentAgentId = existingScript.getAttribute("data-agent-id");
      if (currentAgentId === agentId) {
        /* Same agent — no need to re-inject */
        return;
      }
      /* Different agent — remove the old script so the new one loads fresh */
      existingScript.remove();
    }

    /* ── Also check for leftover widget root divs from previous agent ── */
    const oldWidget = document.getElementById("cyberagent-widget-root");
    if (oldWidget) oldWidget.remove();

    const runtimeOrigin =
      typeof window !== "undefined" && window.location.origin
        ? window.location.origin
        : PRODUCTION_FALLBACK;

    const baseHost = runtimeOrigin.includes("localhost")
      ? PRODUCTION_FALLBACK
      : runtimeOrigin;

    const script = document.createElement("script");
    script.id              = "system-agent-universal-script";
    script.src             = `${baseHost}/embed.js?ts=${Date.now()}`;
    script.defer           = true;
    script.setAttribute("data-agent-id",      agentId);
    script.setAttribute("data-accent-color",  accentColor);
    script.setAttribute("data-icon",          "/icons/professional-agent.svg");
    script.setAttribute("data-mode",          "production");
    script.setAttribute("data-context-lock",  "strict-kb-only");

    document.body.appendChild(script);
    console.log(`[AgentEmbedScript] ✓ Isolated script for agent ${agentId} from ${baseHost}`);

    return () => {
      const el = document.getElementById("system-agent-universal-script");
      if (el) el.remove();
      const w = document.getElementById("cyberagent-widget-root");
      if (w) w.remove();
    };
  }, [agentId, accentColor]);

  if (!mounted) return null;
  return null;
}
