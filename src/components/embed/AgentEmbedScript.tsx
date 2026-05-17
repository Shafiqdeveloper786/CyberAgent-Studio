"use client";

/**
 * AgentEmbedScript — Hydration-Safe Next.js Script Wrapper
 *
 * WHY A CLIENT COMPONENT IS REQUIRED:
 * Next.js App Router layouts are Server Components by default.
 * `window` does not exist in the Node.js server runtime, so any
 * direct access to `window?.location?.origin` inside a Server Component
 * throws at SSR time — even with optional chaining — because `window` is
 * not merely undefined; it is entirely absent from the Node.js global scope.
 *
 * HYDRATION-SAFE PATTERN:
 * 1. `NEXT_PUBLIC_APP_URL` (inlined at build time) is used as the
 *    initial state value. The server renders an HTML src attribute that
 *    already points to the correct production URL — no placeholder needed.
 * 2. A `useEffect` runs after hydration and may correct the origin to
 *    `window.location.origin` if the runtime host differs from the build
 *    env var (e.g. custom-domain deployments or local dev without .env.local).
 * 3. Because the initial state matches what the server rendered, React sees
 *    zero hydration mismatch between the SSR HTML and the initial client render.
 *    The `useEffect` update fires only after the first paint — well after
 *    hydration is complete.
 *
 * USAGE IN ANY LAYOUT (server or client):
 *
 *   import { AgentEmbedScript } from "@/components/embed/AgentEmbedScript";
 *
 *   export default function RootLayout({ children }) {
 *     return (
 *       <html lang="en">
 *         <body>
 *           {children}
 *           <AgentEmbedScript
 *             agentId="your-agent-id"
 *             accentColor="#00f2ff"
 *           />
 *         </body>
 *       </html>
 *     );
 *   }
 */

import Script from "next/script";
import { useState, useEffect } from "react";

interface AgentEmbedScriptProps {
  /** MongoDB ObjectId of the agent whose widget to embed */
  agentId: string;
  /** Hex colour for the widget accent (e.g. "#00f2ff") */
  accentColor?: string;
}

/* Build-time base URL — safe for SSR.
   Falls back to the production Vercel URL so generated src attributes
   are never stamped with localhost in server-rendered HTML.              */
const BUILD_TIME_BASE =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_BASE_URL ??
  "https://cyber-agent-studio.vercel.app";

export function AgentEmbedScript({
  agentId,
  accentColor = "#00f2ff",
}: AgentEmbedScriptProps) {
  /* initialise with the build-time constant so SSR HTML and the first
     client render are identical — React sees zero hydration delta.      */
  const [baseUrl, setBaseUrl] = useState(BUILD_TIME_BASE);

  useEffect(() => {
    /* After hydration, correct to the actual runtime origin.
       This handles custom domains and local dev transparently. */
    const runtimeOrigin = window.location.origin;
    if (runtimeOrigin !== baseUrl) {
      setBaseUrl(runtimeOrigin);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Script
      src={`${baseUrl}/embed.js`}
      strategy="afterInteractive"
      id="cyberagent-universal-script"
      data-agent-id={agentId}
      data-accent-color={accentColor}
    />
  );
}
