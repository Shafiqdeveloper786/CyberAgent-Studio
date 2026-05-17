"use client";

import { useState, useEffect } from "react";
import { Copy, Check, AlertCircle, RefreshCw, Eye, EyeOff, ExternalLink } from "lucide-react";
import { useAgentStore } from "@/store/agentStore";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h3
        className="text-[11px] font-bold tracking-[0.1em] uppercase"
        style={{
          background:           "linear-gradient(90deg,#00f2ff,#a855f7)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor:  "transparent",
        }}
      >
        {children}
      </h3>
      <div style={{ height: 1, background: "linear-gradient(90deg,rgba(0,242,255,0.45),rgba(168,85,247,0.2),transparent)" }} />
    </div>
  );
}

function buildHtmlSnippet(agentId: string, accentColor: string, origin: string): string {
  return `<!-- Paste before </body> on any HTML page -->
<script
  src="${origin}/embed.js"
  id="cyberagent-universal-script"
  data-agent-id="${agentId}"
  data-accent-color="${accentColor || "#00f2ff"}"
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

function CodeBlock({ code, accent = "#00f2ff", onCopy, copied }: {
  code: string; accent?: string; onCopy: () => void; copied: boolean;
}) {
  return (
    <div
      className="relative rounded-xl px-4 py-3 font-mono text-[11px] leading-relaxed overflow-x-auto"
      style={{ background: "rgba(0,0,0,0.45)", border: `1px solid ${accent}33`, boxShadow: `0 0 20px ${accent}07` }}
    >
      <div className="absolute top-0 left-4 right-4 h-px rounded-full"
        style={{ background: `linear-gradient(90deg,${accent}66,rgba(168,85,247,0.2),transparent)` }} />
      <pre className="whitespace-pre-wrap break-all pr-8" style={{ color: accent }}>{code}</pre>
      <button onClick={onCopy}
        className="absolute top-3 right-3 p-1.5 rounded-lg transition-colors"
        style={{ background: "rgba(0,0,0,0.5)", color: copied ? "#00ff94" : "#475569" }}
        title="Copy">
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
    </div>
  );
}

export function EmbedCodeSection() {
  const { activeAgentId } = useAgentStore();

  const [tab,          setTab]          = useState<Tab>("script");
  const [copied,       setCopied]       = useState(false);
  const [apiKey,       setApiKey]       = useState<string | null>(null);
  const [accentColor,  setAccentColor]  = useState<string>("#00f2ff");
  const [keyLoading,   setKeyLoading]   = useState(false);
  const [keyVisible,   setKeyVisible]   = useState(false);
  const [regenLoading, setRegenLoading] = useState(false);

  const origin    = typeof window !== "undefined"
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000");
  const widgetUrl = `${origin}/widget/${activeAgentId ?? "YOUR_AGENT_ID"}`;
  const agentIdDisplay = activeAgentId ?? "YOUR_AGENT_ID";

  const htmlSnippet = buildHtmlSnippet(agentIdDisplay, accentColor, origin);
  const apiSnippet  = activeAgentId && apiKey
    ? buildApiSnippet(activeAgentId, apiKey, origin)
    : "// Select an agent above to see your API key";

  useEffect(() => {
    if (!activeAgentId) { setApiKey(null); setAccentColor("#00f2ff"); return; }
    setKeyLoading(true);
    setApiKey(null);
    fetch(`/api/agents/${activeAgentId}`)
      .then((r) => r.json())
      .then((d) => { setApiKey(d?.agent?.apiKey ?? null); setAccentColor(d?.agent?.themeColor ?? "#00f2ff"); })
      .catch(() => { setApiKey(null); setAccentColor("#00f2ff"); })
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
      <SectionHeading>Embed &amp; API</SectionHeading>

      {!activeAgentId && (
        <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-[12px] font-medium text-[#f59e0b]"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <AlertCircle size={14} />
          Select an agent from &quot;Saved Agents&quot; above to activate your embed code.
        </div>
      )}

      {/* Outer tab switcher */}
      <div className="flex gap-1 p-1 rounded-xl"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {(["script", "widget", "apikey"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
            style={{
              background: tab === t ? "rgba(0,242,255,0.12)" : "transparent",
              border:     tab === t ? "1px solid rgba(0,242,255,0.25)" : "1px solid transparent",
              color:      tab === t ? "#00f2ff" : "#475569",
            }}>
            {t === "script" ? "Embed Script" : t === "widget" ? "Widget URL" : "API Key"}
          </button>
        ))}
      </div>

      {/* ── Embed Script tab — HTML / Universal only ── */}
      {tab === "script" && (
        <div className="space-y-3">
          {activeAgentId && keyLoading && (
            <div className="flex items-center gap-2 text-[11px] text-[#475569]">
              <RefreshCw size={11} className="animate-spin" /> Fetching agent config…
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase"
              style={{ background: "rgba(0,242,255,0.12)", border: "1px solid rgba(0,242,255,0.25)", color: "#00f2ff" }}>
              Universal
            </span>
            <span className="text-[10px] text-[#334155]">Any website — no framework or build step required</span>
          </div>

          <CodeBlock code={htmlSnippet} accent="#00f2ff" onCopy={() => copy(htmlSnippet)} copied={copied} />

          <button onClick={() => copy(htmlSnippet)} disabled={keyLoading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold tracking-wide transition-all duration-150 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: copied
                ? "rgba(0,255,148,0.15)"
                : "linear-gradient(90deg,rgba(0,242,255,0.18),rgba(168,85,247,0.12))",
              border:    copied ? "1px solid rgba(0,255,148,0.35)" : "1px solid rgba(0,242,255,0.3)",
              color:     copied ? "#00ff94" : "#00f2ff",
              boxShadow: copied ? "none" : "0 0 18px rgba(0,242,255,0.08)",
            }}>
            {copied ? <><Check size={14} />Copied!</> : <><Copy size={13} />COPY EMBED SCRIPT</>}
          </button>

          {/* Minimal install note */}
          <p className="text-[11px] leading-relaxed" style={{ color: "#475569" }}>
            Paste before the closing{" "}
            <code className="px-1 py-0.5 rounded font-mono text-[10px]"
              style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)", color: "#c084fc" }}>
              &lt;/body&gt;
            </code>{" "}
            tag. Loads asynchronously — zero page-speed impact. For Next.js, React Native, or Flutter,
            visit the{" "}
            <a href="/embed-code"
              style={{ color: "#00f2ff", textDecoration: "underline", textUnderlineOffset: 3 }}>
              Embed Code
            </a>{" "}
            page for framework-specific guides.
          </p>

          {activeAgentId && (
            <a href={widgetUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: "linear-gradient(90deg,rgba(0,242,255,0.06),rgba(168,85,247,0.06))", border: "1px solid rgba(0,242,255,0.15)" }}>
              <ExternalLink size={11} style={{ color: "#00f2ff" }} />
              <span style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Preview Standalone Widget
              </span>
            </a>
          )}
        </div>
      )}

      {/* ── Widget URL tab ── */}
      {tab === "widget" && (
        <div className="space-y-3">
          <div className="relative rounded-xl px-4 py-3 font-mono text-[11px] overflow-x-auto"
            style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(168,85,247,0.2)" }}>
            <div className="absolute top-0 left-4 right-4 h-px rounded-full"
              style={{ background: "linear-gradient(90deg,rgba(168,85,247,0.4),rgba(0,242,255,0.2),transparent)" }} />
            <pre className="text-[#a855f7] whitespace-pre-wrap break-all">{widgetUrl}</pre>
            <button onClick={() => copy(widgetUrl)}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-[#475569] hover:text-[#a855f7] transition-colors"
              style={{ background: "rgba(0,0,0,0.5)" }}>
              {copied ? <Check size={13} className="text-[#00ff94]" /> : <Copy size={13} />}
            </button>
          </div>
          <button onClick={() => copy(widgetUrl)} disabled={!activeAgentId}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-bold tracking-wide transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: copied ? "rgba(0,255,148,0.15)" : "rgba(168,85,247,0.12)",
              border:     copied ? "1px solid rgba(0,255,148,0.35)" : "1px solid rgba(168,85,247,0.3)",
              color:      copied ? "#00ff94" : "#a855f7",
            }}>
            {copied ? <><Check size={14} />Copied!</> : "COPY WIDGET URL"}
          </button>
          {activeAgentId && (
            <a href={widgetUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2 rounded-xl text-[11px] font-semibold transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: "linear-gradient(90deg,rgba(168,85,247,0.08),rgba(236,72,153,0.06))", border: "1px solid rgba(168,85,247,0.2)" }}>
              <ExternalLink size={11} style={{ color: "#a855f7" }} />
              <span style={{ background: "linear-gradient(90deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Preview Standalone Widget
              </span>
            </a>
          )}
        </div>
      )}

      {/* ── API Key tab ── */}
      {tab === "apikey" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-3.5 py-3 rounded-xl"
            style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(0,242,255,0.15)" }}>
            {keyLoading ? (
              <span className="text-[12px] text-[#475569] flex-1">Loading…</span>
            ) : apiKey ? (
              <>
                <code className="flex-1 font-mono text-[11px] text-[#00f2ff] break-all">{displayKey}</code>
                <button onClick={() => setKeyVisible((v) => !v)} className="text-[#475569] hover:text-[#94a3b8] transition-colors">
                  {keyVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <button onClick={() => copy(apiKey)} className="text-[#475569] hover:text-[#00f2ff] transition-colors">
                  {copied ? <Check size={13} className="text-[#00ff94]" /> : <Copy size={13} />}
                </button>
              </>
            ) : (
              <span className="text-[12px] text-[#334155] flex-1">
                {activeAgentId ? "No key found." : "Select an agent first."}
              </span>
            )}
          </div>
          {activeAgentId && (
            <button onClick={regenerateKey} disabled={regenLoading}
              className="flex items-center gap-1.5 text-[11px] text-[#f59e0b] hover:text-[#fbbf24] transition-colors disabled:opacity-50">
              <RefreshCw size={11} className={regenLoading ? "animate-spin" : ""} />
              {regenLoading ? "Regenerating…" : "Regenerate key"}
            </button>
          )}
          <p className="text-[11px] text-[#334155] leading-relaxed">
            Use the <code className="text-[#475569]">x-api-key</code> header to call{" "}
            <code className="text-[#475569]">/api/chat</code> directly. Wrong key → 403.
          </p>
          <div className="relative rounded-xl px-4 py-3 font-mono overflow-x-auto"
            style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(0,242,255,0.12)" }}>
            <div className="absolute top-0 left-4 right-4 h-px rounded-full"
              style={{ background: "linear-gradient(90deg,rgba(0,242,255,0.3),rgba(168,85,247,0.15),transparent)" }} />
            <pre className="text-[10.5px] text-[#64748b] whitespace-pre-wrap break-all">{apiSnippet}</pre>
            <button onClick={() => copy(apiSnippet)}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-[#475569] hover:text-[#00f2ff] transition-colors"
              style={{ background: "rgba(0,0,0,0.5)" }}>
              {copied ? <Check size={13} className="text-[#00ff94]" /> : <Copy size={13} />}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
