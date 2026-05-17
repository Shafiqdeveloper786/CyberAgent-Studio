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
 *   1. React Error #418 — hydration mismatch loop:
 *      If the env var resolved to "http://localhost:3000" in the build
 *      environment but the browser was on the Vercel domain, the server
 *      rendered src="http://localhost:3000/embed.js" while the useEffect
 *      tried to correct it. React detected a mismatch between the SSR
 *      HTML and the client VDOM, triggering Error #418 and a re-render
 *      loop via the Script component's internal postMessage mechanism.
 *
 *   2. GET localhost:3000/embed.js ERR_CONNECTION_REFUSED:
 *      The browser tried to fetch the localhost URL that was baked into
 *      the server-rendered HTML before useEffect could correct it.
 *
 * Solution — decouple completely from the React render tree:
 *   • Both server render and initial client render return null.
 *   • Server emits zero bytes for this component → nothing to hydrate.
 *   • useEffect fires after React hydration is complete and confirmed.
 *   • Script tag is created via raw DOM APIs, invisible to React's
 *     reconciler — no hydration surface, no mismatch possible.
 *   • window.location.origin is read safely (browser-only context).
 */

import { useEffect, useState } from "react";

interface AgentEmbedScriptProps {
  /** MongoDB ObjectId of the agent whose widget to embed */
  agentId: string;
  /** Hex colour for the widget accent (e.g. "#00f2ff") */
  accentColor?: string;
}

const PRODUCTION_FALLBACK = "https://cyber-agent-studio.vercel.app";

export function AgentEmbedScript({
  agentId,
  accentColor = "#00f2ff",
}: AgentEmbedScriptProps) {
  /* mounted tracks whether we are in the browser — kept for consumers
     that may inspect the prop, but the render always returns null.      */
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    /* Never inject inside the widget iframe route — the root layout runs for
       /widget/[agentId] too, which would mount a second launcher bubble on top
       of the chat input.  embed.js also guards via window !== window.top, but
       skipping the script injection entirely avoids the wasted network request. */
    if (window.location.pathname.startsWith("/widget/")) return;

    /* Prevent duplicate injection across HMR reloads or StrictMode
       double-invocations.                                               */
    if (document.getElementById("cyberagent-universal-script")) return;

    /* Resolve the base URL strictly inside the browser context.
       Prefers the actual runtime origin so custom-domain deployments
       work without any env var. Falls back to the production Vercel URL
       if somehow window.location is unavailable (sandboxed iframes etc) */
    const runtimeOrigin =
      typeof window !== "undefined" && window.location.origin
        ? window.location.origin
        : PRODUCTION_FALLBACK;

    /* Resolve to production URL if running on localhost in the browser
       to avoid fetching embed.js from a dev server that isn't serving it.
       Remove this guard if you want the widget active in local dev too.  */
    const baseHost = runtimeOrigin.includes("localhost")
      ? PRODUCTION_FALLBACK
      : runtimeOrigin;

    /* cache-buster: forces a fresh fetch on every mount so stale cached
       versions of embed.js don't persist across deployments.             */
    const script = document.createElement("script");
    script.id                                      = "cyberagent-universal-script";
    script.src                                     = `${baseHost}/embed.js?ts=${Date.now()}`;
    script.defer                                   = true;
    script.setAttribute("data-agent-id",     agentId);
    script.setAttribute("data-accent-color", accentColor);

    document.body.appendChild(script);
    console.log("[AgentEmbedScript] Injected embed.js from:", baseHost);

    return () => {
      /* Cleanup on unmount — prevents ghost scripts during HMR */
      const el = document.getElementById("cyberagent-universal-script");
      if (el) el.remove();
    };
  }, [agentId, accentColor]);

  /* Return null on BOTH server and first client render.
     Server emits nothing → nothing to hydrate → Error #418 impossible. */
  if (!mounted) return null;
  return null;
}
