"use client";

import { useState, useEffect } from "react";
import { Copy, Check, AlertCircle, RefreshCw, Eye, EyeOff, ExternalLink } from "lucide-react";
import { useAgentStore } from "@/store/agentStore";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-[11px] font-bold tracking-[0.06em] uppercase text-slate-700">
        {children}
      </h3>
      <div className="h-px bg-slate-100 w-full" />
    </div>
  );
}

function buildHtmlSnippet(agentId: string, accentColor: string, origin: string): string {
  return `<!-- Paste before </body> on any HTML page -->
<script
  src="${origin}/embed.js"
  id="cyberagent-universal-script"
  data-agent-id="${agentId}"
  data-accent-color="${accentColor || "#2563eb"}"
  data-theme="corporate-light"
  data-logo="true"
  async>
</script>`;
}

function buildApiSnippet(agentId: string, apiKey: string, origin: string): string {
  return `const res = await fetch("${origin}/api/chat", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "${apiKey}",
  },
  body: JSON.stringify({
    agentId: "${agentId}",
    messages: [{ role: "user", content: "Hello" }],
  }),
});
const reader = res.body.getReader();
const dec = new TextDecoder();
let text = "";
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  text += dec.decode(value, { stream: true });
  console.log(text);
}`;
}

type Tab = "script" | "widget" | "apikey";

function CodeBlock({ code, onCopy, copied }: {
  code: string; onCopy: () => void; copied: boolean;
}) {
  return (
    <div className="relative rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 font-mono text-[11px] leading-relaxed overflow-x-auto shadow-inner">
      <pre className="whitespace-pre-wrap break-all pr-8 text-slate-700">{code}</pre>
      <button 
        onClick={onCopy}
        className="absolute top-2.5 right-2.5 p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors shadow-sm"
        title="Copy"
      >
        {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
      </button>
    </div>
  );
}

export function EmbedCodeSection() {
  const { activeAgentId } = useAgentStore();

  const [tab,          setTab]          = useState<Tab>("script");
  const [copied,       setCopied]       = useState(false);
  const [apiKey,       setApiKey]       = useState<string | null>(null);
  const [accentColor,  setAccentColor]  = useState<string>("#2563eb");
  const [keyLoading,   setKeyLoading]   = useState(false);
  const [keyVisible,   setKeyVisible]   = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);

  const origin = typeof window !== "undefined"
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL
        ?? process.env.NEXT_PUBLIC_SITE_URL
        ?? process.env.NEXT_PUBLIC_BASE_URL
        ?? "https://cyber-agent-studio.vercel.app");
  const widgetUrl = `${origin}/widget/${activeAgentId ?? "YOUR_AGENT_ID"}`;
  const agentIdDisplay = activeAgentId ?? "YOUR_AGENT_ID";

  const htmlSnippet = buildHtmlSnippet(agentIdDisplay, accentColor, origin);
  const apiSnippet  = activeAgentId && apiKey
    ? buildApiSnippet(activeAgentId, apiKey, origin)
    : "// Select an agent above to see your API key";

  useEffect(() => {
    if (!activeAgentId) { setApiKey(null); setAccentColor("#2563eb"); return; }
    setKeyLoading(true);
    setApiKey(null);
    fetch(`/api/agents/${activeAgentId}`)
      .then((r) => r.json())
      .then((d) => { setApiKey(d?.agent?.apiKey ?? null); setAccentColor(d?.agent?.themeColor ?? "#2563eb"); })
      .catch(() => { setApiKey(null); setAccentColor("#2563eb"); })
      .finally(() => setKeyLoading(false));
  }, [activeAgentId]);

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerateKey = async () => {
    if (!activeAgentId || regenLoading) return;
    if (!confirm("Regenerate API key? The old key will stop working immediately.")) return;
    setRegenLoading(true);
    try {
      const res  = await fetch(`/api/agents/${activeAgentId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regenerateApiKey: "true" }),
      });
      const data = await res.json() as { agent?: { apiKey?: string } };
      if (data?.agent?.apiKey) setApiKey(data.agent.apiKey);
    } catch { /* ignore */ }
    finally { setRegenLoading(false); }
  };

  const maskedKey  = apiKey ? apiKey.slice(0, 12) + "•".repeat(Math.max(0, apiKey.length - 12)) : "";
  const displayKey = keyVisible ? (apiKey ?? "") : maskedKey;

  return (
    <section className="space-y-4">
      <SectionHeading>Embed &amp; API Configuration</SectionHeading>

      {!activeAgentId && (
        <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-[12px] font-medium text-amber-700 bg-amber-50 border border-amber-100">
          <AlertCircle size={14} className="shrink-0 text-amber-600" />
          <span>Select an agent from &quot;Saved Agents&quot; above to activate your custom deployment scripts.</span>
        </div>
      )}

      {/* Corporate Tab Switcher Dashboard Controls */}
      <div className="flex gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200/60">
        {(["script", "widget", "apikey"] as Tab[]).map((t) => (
          <button 
            key={t} 
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 ${
              tab === t 
                ? "bg-white border border-slate-200/50 text-slate-800 shadow-sm" 
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t === "script" ? "Embed Script" : t === "widget" ? "Widget URL" : "API Access"}
          </button>
        ))}
      </div>

      {/* ── Embed Script Tab Area ── */}
      {tab === "script" && (
        <div className="space-y-3.5">
          {activeAgentId && keyLoading && (
            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <RefreshCw size={11} className="animate-spin" /> Syncing configuration index…
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md text-[9px] font-bold tracking-wider uppercase bg-blue-50 border border-blue-100 text-blue-600">
              Universal
            </span>
            <span className="text-[11px] text-slate-500 font-medium">Asynchronous compilation wrapper — works anywhere</span>
          </div>

          <CodeBlock code={htmlSnippet} onCopy={() => copy(htmlSnippet)} copied={copied} />

          <button 
            onClick={() => copy(htmlSnippet)} 
            disabled={keyLoading}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-semibold transition-all border ${
              copied 
                ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                : "bg-slate-900 border-slate-900 text-white hover:bg-slate-800 active:scale-[0.99] disabled:opacity-40"
            }`}
          >
            {copied ? <><Check size={14} /> Copied to Clipboard</> : <><Copy size={13} /> Copy Deployment Script</>}
          </button>

          <p className="text-[11px] leading-relaxed text-slate-400">
            Paste immediately before the closing{" "}
            <code className="px-1 py-0.5 rounded font-mono text-[10px] bg-slate-100 border border-slate-200 text-slate-600">
              &lt;/body&gt;
            </code>{" "}
            tag element. For optimized Next.js scripts or localized modules, checkout our comprehensive{" "}
            <a href="/embed-code" className="text-slate-700 font-semibold underline underline-offset-2 hover:text-slate-900">
              Documentation guides
            </a>.
          </p>

          {activeAgentId && (
            <a 
              href={widgetUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-800 shadow-sm transition-all"
            >
              <ExternalLink size={11} className="text-slate-400" />
              <span>Launch Standalone Window</span>
            </a>
          )}
        </div>
      )}

      {/* ── Widget URL Tab Area ── */}
      {tab === "widget" && (
        <div className="space-y-3.5">
          <CodeBlock code={widgetUrl} onCopy={() => copy(widgetUrl)} copied={copied} />
          
          <button 
            onClick={() => copy(widgetUrl)} 
            disabled={!activeAgentId}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12px] font-semibold transition-all border ${
              copied 
                ? "bg-emerald-50 border-emerald-200 text-emerald-700" 
                : "bg-slate-900 border-slate-900 text-white hover:bg-slate-800 active:scale-[0.99] disabled:opacity-40"
            }`}
          >
            {copied ? <><Check size={14} /> Copied to Clipboard</> : "Copy Direct URL Link"}
          </button>

          {activeAgentId && (
            <a 
              href={widgetUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11px] font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-800 shadow-sm transition-all"
            >
              <ExternalLink size={11} className="text-slate-400" />
              <span>Open Endpoint Target</span>
            </a>
          )}
        </div>
      )}

      {/* ── API Key / Direct Integration Tab Area ── */}
      {tab === "apikey" && (
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
            {keyLoading ? (
              <span className="text-[12px] text-slate-400 flex-1">Fetching records…</span>
            ) : apiKey ? (
              <>
                <code className="flex-1 font-mono text-[11px] text-slate-700 break-all">{displayKey}</code>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button 
                    onClick={() => setKeyVisible((v) => !v)} 
                    className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    {keyVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                  <button 
                    onClick={() => copy(apiKey)} 
                    className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                  </button>
                </div>
              </>
            ) : (
              <span className="text-[12px] text-slate-400 flex-1">
                {activeAgentId ? "No secure access keys declared." : "No agent structure designated."}
              </span>
            )}
          </div>

          {activeAgentId && (
            <button 
              onClick={regenerateKey} 
              disabled={regenLoading}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 hover:text-amber-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={11} className={regenLoading ? "animate-spin" : ""} />
              <span>{regenLoading ? "Re-authorizing credentials…" : "Revoke & Regenerate Secret Key"}</span>
            </button>
          )}

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Attach token header parameter strings via <code className="text-slate-700 font-mono font-bold bg-slate-100 px-1 py-0.5 rounded text-[10px]">x-api-key</code> arrays to pass streaming nodes downstream.
          </p>

          <CodeBlock code={apiSnippet} onCopy={() => copy(apiSnippet)} copied={copied} />
        </div>
      )}
    </section>
  );
}