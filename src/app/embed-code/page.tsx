"use client";

import { DashboardShell } from "@/components/layout/DashboardShell";
import { useAgentStore } from "@/store/agentStore";
import { useEffect, useState } from "react";
import {
  Copy, Check, Code2, Globe, Smartphone,
  ExternalLink, Sparkles, Zap, ChevronRight, Star,
  Bot, AlertCircle, ArrowRight, RefreshCw,
} from "lucide-react";

/* ══════════════════════════════════════════════
   Syntax highlighters
══════════════════════════════════════════════ */
type Token = { text: string; color: string };

function tokenizeHTML(code: string): Token[][] {
  return code.split("\n").map((line) => {
    const tokens: Token[] = [];
    let remaining = line;
    const push = (text: string, color: string) => { if (text) tokens.push({ text, color }); };
    if (remaining.trimStart().startsWith("<!--")) { push(remaining, "#6272a4"); return tokens; }
    while (remaining.length > 0) {
      const tagMatch = remaining.match(/^(<\/?[a-zA-Z][a-zA-Z0-9-]*|>|\/?>)/);
      if (tagMatch) { push(tagMatch[0], "#ff79c6"); remaining = remaining.slice(tagMatch[0].length); continue; }
      const attrMatch = remaining.match(/^([a-zA-Z][a-zA-Z0-9-]*)(=?)/);
      if (attrMatch && tokens.length > 0) { push(attrMatch[1], "#8be9fd"); remaining = remaining.slice(attrMatch[1].length); continue; }
      const strMatch = remaining.match(/^"([^"]*)"/);
      if (strMatch) { push(`"${strMatch[1]}"`, "#f1fa8c"); remaining = remaining.slice(strMatch[0].length); continue; }
      const kwMatch = remaining.match(/^(async|defer)\b/);
      if (kwMatch) { push(kwMatch[0], "#bd93f9"); remaining = remaining.slice(kwMatch[0].length); continue; }
      push(remaining[0], "#94a3b8"); remaining = remaining.slice(1);
    }
    return tokens;
  });
}

function tokenizeTSX(code: string): Token[][] {
  const KEYWORDS  = /^(import|export|default|from|return|const|let|function|=>)\b/;
  const COMPONENTS = /^([A-Z][a-zA-Z0-9]*)/;
  const JSXATTR   = /^([a-zA-Z][a-zA-Z0-9]*)(=)/;
  const JSXCLOSE  = /^(<\/[A-Z][a-zA-Z0-9]*>|<\/[a-z][a-zA-Z0-9]*>|<[A-Z][a-zA-Z0-9]*|<[a-z][a-zA-Z0-9]*)/;
  return code.split("\n").map((line) => {
    const tokens: Token[] = [];
    let r = line;
    const push = (text: string, color: string) => { if (text) tokens.push({ text, color }); };
    while (r.length > 0) {
      const sq = r.match(/^'[^']*'/); if (sq) { push(sq[0], "#f1fa8c"); r = r.slice(sq[0].length); continue; }
      const dq = r.match(/^"[^"]*"/); if (dq) { push(dq[0], "#f1fa8c"); r = r.slice(dq[0].length); continue; }
      const jsx = r.match(JSXCLOSE); if (jsx) { push(jsx[0], "#ff79c6"); r = r.slice(jsx[0].length); continue; }
      if (r[0] === ">" || r.startsWith("/>")) { push(r[0] === ">" ? ">" : "/>", "#ff79c6"); r = r.slice(r[0] === ">" ? 1 : 2); continue; }
      const kw = r.match(KEYWORDS); if (kw) { push(kw[0], "#bd93f9"); r = r.slice(kw[0].length); continue; }
      if (r.trimStart().startsWith("//") || r.trimStart().startsWith("{/*")) { push(r, "#6272a4"); break; }
      const ja = r.match(JSXATTR); if (ja) { push(ja[1], "#8be9fd"); r = r.slice(ja[1].length); continue; }
      const comp = r.match(COMPONENTS); if (comp) { push(comp[0], "#50fa7b"); r = r.slice(comp[0].length); continue; }
      if (r.startsWith("process.env.")) { push("process.env.", "#bd93f9"); r = r.slice(12); continue; }
      if ("{}()[]".includes(r[0])) { push(r[0], "#e2e8f0"); r = r.slice(1); continue; }
      push(r[0], "#94a3b8"); r = r.slice(1);
    }
    return tokens;
  });
}

function tokenizeEnv(code: string): Token[][] {
  return code.split("\n").map((line) => {
    if (line.startsWith("#")) return [{ text: line, color: "#6272a4" }];
    if (line.trim() === "") return [{ text: "", color: "#94a3b8" }];
    const eqIdx = line.indexOf("=");
    if (eqIdx < 0) return [{ text: line, color: "#94a3b8" }];
    return [
      { text: line.slice(0, eqIdx), color: "#8be9fd" },
      { text: "=", color: "#e2e8f0" },
      { text: line.slice(eqIdx + 1), color: "#50fa7b" },
    ];
  });
}

function HighlightedCode({ lines }: { lines: Token[][] }) {
  return (
    <>
      {lines.map((lineTokens, li) => (
        <div key={li} className="flex">
          <span className="select-none mr-4 text-right shrink-0" style={{ color: "#334155", minWidth: 20 }}>
            {li + 1}
          </span>
          <span>
            {lineTokens.map((t, ti) => (
              <span key={ti} style={{ color: t.color }}>{t.text}</span>
            ))}
          </span>
        </div>
      ))}
    </>
  );
}

/* ══════════════════════════════════════════════
   Terminal Code Block
   isLive → green "● LIVE" badge in chrome bar
══════════════════════════════════════════════ */
function TerminalBlock({
  code, title, lang, accent, tokenize, copied, onCopy, isLive,
}: {
  code: string; title: string; lang: string; accent: string;
  tokenize: (c: string) => Token[][];
  copied: boolean; onCopy: () => void;
  isLive?: boolean;
}) {
  const lines = tokenize(code);
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: "#02020a",
        border:     `1px solid ${isLive ? "rgba(0,255,148,0.3)" : accent + "25"}`,
        boxShadow:  isLive
          ? "0 0 30px rgba(0,255,148,0.06), 0 8px 32px rgba(0,0,0,0.5)"
          : `0 0 30px ${accent}08, 0 8px 32px rgba(0,0,0,0.5)`,
      }}
    >
      {/* Chrome bar */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{
          background:   "#06060e",
          borderBottom: `1px solid ${isLive ? "rgba(0,255,148,0.15)" : accent + "18"}`,
        }}
      >
        <div className="flex items-center gap-3">
          {/* macOS dots */}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: "#ff5f57", boxShadow: "0 0 6px rgba(255,95,87,0.5)" }} />
            <div className="w-3 h-3 rounded-full" style={{ background: "#febc2e", boxShadow: "0 0 6px rgba(254,188,46,0.5)" }} />
            <div className="w-3 h-3 rounded-full" style={{ background: "#28c840", boxShadow: "0 0 6px rgba(40,200,64,0.5)" }} />
          </div>
          <div className="w-px h-4 bg-white/[0.07]" />
          <span className="text-[11px] font-mono font-bold" style={{ color: isLive ? "#00ff94" : accent }}>{title}</span>
          <span
            className="text-[9px] px-1.5 py-0.5 rounded font-mono"
            style={{
              background: `${isLive ? "rgba(0,255,148,0.1)" : accent + "12"}`,
              color:      isLive ? "#00ff94" : `${accent}90`,
              border:     `1px solid ${isLive ? "rgba(0,255,148,0.25)" : accent + "20"}`,
            }}
          >
            {lang}
          </span>
          {/* Live badge */}
          {isLive && (
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black"
              style={{
                background: "rgba(0,255,148,0.1)",
                border:     "1px solid rgba(0,255,148,0.3)",
                color:      "#00ff94",
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#00ff94", boxShadow: "0 0 4px #00ff94", animation: "pulse 2s infinite" }} />
              LIVE
            </div>
          )}
        </div>
        <button
          onClick={onCopy}
          className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg transition-all"
          style={{
            color:      copied ? "#00ff94" : "#64748b",
            background: copied ? "rgba(0,255,148,0.08)" : "rgba(255,255,255,0.04)",
            border:     copied ? "1px solid rgba(0,255,148,0.2)" : "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {copied ? <Check size={11} /> : <Copy size={11} />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Code area — horizontally scrollable on mobile */}
      <div className="overflow-x-auto">
        <pre className="p-5 text-[12px] font-mono leading-[1.7]" style={{ minWidth: "max-content" }}>
          <HighlightedCode lines={lines} />
        </pre>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Info Callout
══════════════════════════════════════════════ */
function InfoCallout({ emoji, title, body, from, to }: {
  emoji: string; title: string; body: React.ReactNode;
  from: string; to: string;
}) {
  return (
    <div
      className="relative rounded-2xl px-4 py-4 overflow-hidden"
      style={{ background: `linear-gradient(135deg,${from}09,${to}07)`, border: `1px solid ${from}25` }}
    >
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg,${from},${to},transparent)` }} />
      <div className="flex items-start gap-3">
        <span className="text-xl shrink-0 leading-none mt-0.5">{emoji}</span>
        <div className="space-y-0.5">
          <p className="text-[11px] font-black uppercase tracking-widest"
            style={{ background: `linear-gradient(90deg,${from},${to})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            {title}
          </p>
          <p className="text-[12px] text-[#94a3b8] leading-relaxed">{body}</p>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Paste Guide — glassmorphism install card
══════════════════════════════════════════════ */
function PasteGuide() {
  const PLATFORMS = ["WordPress", "Shopify", "Wix", "Webflow", "Static HTML", "Ghost"];

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{
        background:     "linear-gradient(135deg,rgba(0,242,255,0.06),rgba(168,85,247,0.04))",
        border:         "1px solid rgba(0,242,255,0.22)",
        backdropFilter: "blur(20px)",
      }}
    >
      {/* Top rainbow line */}
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7,#ec4899)" }} />

      {/* Ambient corner glow */}
      <div className="absolute -top-8 -left-8 w-28 h-28 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle,rgba(0,242,255,0.1),transparent 70%)" }} />

      <div className="px-5 py-4 space-y-4">
        {/* Header row */}
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(0,242,255,0.12)", border: "1px solid rgba(0,242,255,0.3)" }}
          >
            <Code2 size={12} className="text-[#00f2ff]" />
          </div>
          <span
            className="text-[11px] font-black uppercase tracking-widest"
            style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            How to Install
          </span>
        </div>

        {/* Main instruction */}
        <p className="text-[12px] text-[#94a3b8] leading-relaxed">
          Simply paste the script above <span className="text-[#e2e8f0] font-semibold">before the closing</span>{" "}
          <code
            className="px-1.5 py-0.5 rounded font-mono text-[10px]"
            style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.35)", color: "#c084fc" }}
          >
            &lt;/body&gt;
          </code>{" "}
          tag of your HTML file. Works on any platform — no backend or build step required.
        </p>

        {/* Visual placement diagram */}
        <div
          className="rounded-xl overflow-hidden font-mono text-[11px] leading-relaxed"
          style={{ background: "rgba(2,2,10,0.7)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          {/* Diagram header */}
          <div
            className="flex items-center gap-1.5 px-4 py-2 border-b"
            style={{ background: "rgba(0,0,0,0.3)", borderColor: "rgba(255,255,255,0.06)" }}
          >
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ff5f57" }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#febc2e" }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#28c840" }} />
            <span className="ml-2 text-[10px] text-[#334155]">index.html</span>
          </div>

          <div className="px-4 py-3 space-y-0.5">
            <p style={{ color: "#334155" }}>  &lt;!-- your existing page content --&gt;</p>
            <p style={{ color: "#475569" }}>  &lt;p&gt;Hello, World!&lt;/p&gt;</p>
            <p className="flex items-start gap-3 flex-wrap">
              <span style={{ color: "#00f2ff" }}>
                {"  "}&lt;script src=&quot;…/embed.js&quot; data-agent-id=&quot;…&quot; async&gt;&lt;/script&gt;
              </span>
              <span
                className="shrink-0 px-2 py-0.5 rounded text-[9px] font-black mt-0.5"
                style={{ background: "rgba(0,242,255,0.12)", border: "1px solid rgba(0,242,255,0.35)", color: "#00f2ff" }}
              >
                ← Paste here
              </span>
            </p>
            <p style={{ color: "#ff79c6" }}>  &lt;/body&gt;</p>
            <p style={{ color: "#ff79c6" }}>&lt;/html&gt;</p>
          </div>
        </div>

        {/* Platform compatibility chips */}
        <div className="space-y-1.5">
          <p className="text-[9px] font-black uppercase tracking-widest text-[#334155]">Works on</p>
          <div className="flex flex-wrap gap-1.5">
            {PLATFORMS.map((p) => (
              <span
                key={p}
                className="px-2.5 py-1 rounded-full text-[10px] font-medium"
                style={{ background: "rgba(0,242,255,0.06)", border: "1px solid rgba(0,242,255,0.14)", color: "#64748b" }}
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   No-Agent Gate — full blocking state
══════════════════════════════════════════════ */
/* ══════════════════════════════════════════════
   Mobile integration guide card — reused for RN and Flutter panels
══════════════════════════════════════════════ */
function MobileGuideCard({ accent, rnInstall }: { accent: string; rnInstall: string }) {
  return (
    <div className="relative rounded-2xl overflow-hidden"
      style={{ background: "rgba(5,5,12,0.7)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(16px)" }}>
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg,${accent},${accent}60,transparent)` }} />
      <div className="px-5 py-5 space-y-4">
        <p className="text-[12px] font-black tracking-wide flex items-center gap-2"
          style={{ background: `linear-gradient(90deg,${accent},#00ff94)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          <Smartphone size={13} style={{ color: accent }} />
          Mobile Integration Guide
        </p>

        {/* Package */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#334155]">Install package</p>
          <code className="block px-3 py-2 rounded-xl text-[11px] font-mono"
            style={{ background: `${accent}0e`, border: `1px solid ${accent}25`, color: accent }}>
            {rnInstall}
          </code>
        </div>

        {/* Network permissions */}
        <div className="flex items-start gap-3 px-3 py-3 rounded-xl"
          style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.22)" }}>
          <span className="text-base shrink-0 mt-0.5">⚠️</span>
          <div className="space-y-2.5">
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: "#fbbf24" }}>Network Permissions Required</p>

            {/* Android */}
            <div className="space-y-1">
              <p className="text-[11px] leading-relaxed" style={{ color: "#78716c" }}>
                <span className="font-semibold text-[#e2e8f0]">Android — </span>
                add both lines to <code className="text-[#fbbf24] font-mono text-[9px]">AndroidManifest.xml</code>:
              </p>
              <div className="rounded-lg overflow-hidden" style={{ border: "1px solid rgba(251,191,36,0.2)" }}>
                <div className="px-3 py-2 font-mono text-[9px] leading-relaxed"
                  style={{ background: "rgba(0,0,0,0.45)", color: "#fbbf24" }}>
                  <div>{"<uses-permission android:name=\"android.permission.INTERNET\"/>"}</div>
                  <div className="mt-1 flex items-start gap-1.5">
                    <span>{"<application"}</span>
                    <span style={{ color: "#e2e8f0" }}>{"android:usesCleartextTraffic=\"true\""}</span>
                    <span>{"...>"}</span>
                  </div>
                </div>
                <div className="px-3 py-1.5 flex items-center gap-1.5"
                  style={{ background: "rgba(251,191,36,0.07)", borderTop: "1px solid rgba(251,191,36,0.15)" }}>
                  <span className="text-[9px]">⚡</span>
                  <p className="text-[9px] leading-snug" style={{ color: "#92400e" }}>
                    <code style={{ color: "#fbbf24" }}>usesCleartextTraffic=&quot;true&quot;</code> is required for localhost HTTP during development. Remove or restrict to debug builds before shipping to production.
                  </p>
                </div>
              </div>
            </div>

            {/* iOS */}
            <p className="text-[11px] leading-relaxed" style={{ color: "#78716c" }}>
              <span className="font-semibold text-[#e2e8f0]">iOS — </span>add{" "}
              <code className="px-1.5 py-0.5 rounded text-[9px] font-mono"
                style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24" }}>NSAppTransportSecurity</code>{" "}
              with <code className="text-[#fbbf24] font-mono text-[9px]">NSAllowsArbitraryLoads: YES</code> to{" "}
              <code className="text-[#fbbf24] font-mono text-[9px]">Info.plist</code> for non-SSL localhost. Restrict to{" "}
              <code className="text-[#fbbf24] font-mono text-[9px]">NSExceptionDomains</code> for specific domains in production.
            </p>
          </div>
        </div>

        {/* Layout tip */}
        <div className="flex items-start gap-2.5">
          <span className="text-base shrink-0 mt-0.5">📐</span>
          <p className="text-[11px] leading-relaxed" style={{ color: "#78716c" }}>
            <span className="font-semibold text-[#e2e8f0]">Layout tip —</span>{" "}
            Keep the parent flexible (<code className="font-mono text-[9px]" style={{ color: accent }}>flex: 1</code> in React Native,{" "}
            <code className="font-mono text-[9px]" style={{ color: accent }}>Expanded</code> in Flutter) so the WebView
            fills the viewport without clipping the chat widget.
          </p>
        </div>
      </div>
    </div>
  );
}

function NoAgentGate() {
  const STEPS = [
    { n: "01", title: "Create an Agent",     desc: "Go to Agent Space, fill in a name and persona, then click Save.",   color: "#00f2ff" },
    { n: "02", title: "Click Your Agent",    desc: "Select your saved agent card to make it the active agent.",           color: "#a855f7" },
    { n: "03", title: "Return Here",         desc: "Come back to Embed Code — your snippet will be pre-filled instantly.", color: "#00ff94" },
  ];

  return (
    <div
      className="relative rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(0,242,255,0.15)", background: "rgba(6,6,14,0.85)" }}
    >
      {/* Top rainbow bar */}
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7,#ec4899)" }} />

      {/* Subtle cyber grid */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.018] rounded-2xl"
        style={{ backgroundImage: "linear-gradient(rgba(0,242,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,242,255,1) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />

      <div className="relative flex flex-col items-center gap-8 py-16 px-6 text-center">

        {/* Icon */}
        <div
          className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg,rgba(0,242,255,0.1),rgba(168,85,247,0.1))",
            border:     "1px solid rgba(0,242,255,0.25)",
            boxShadow:  "0 0 40px rgba(0,242,255,0.12)",
          }}
        >
          <Bot size={36} className="text-[#00f2ff]" style={{ filter: "drop-shadow(0 0 8px rgba(0,242,255,0.5))" }} />
        </div>

        {/* Heading */}
        <div className="space-y-2 max-w-lg">
          <h3
            className="text-[20px] font-black tracking-tight"
            style={{ background: "linear-gradient(90deg,#00f2ff,#e2e8f0 50%,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            Ready to Embed Your Agent?
          </h3>
          <p className="text-[13px] text-[#64748b] leading-relaxed">
            Select an active agent and your personalised embed code will be generated
            instantly — no manual editing needed.
          </p>
        </div>

        {/* 3-step guide */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">
          {STEPS.map(({ n, title, desc, color }) => (
            <div
              key={n}
              className="relative rounded-xl p-4 text-left overflow-hidden"
              style={{
                background: `${color}06`,
                border:     `1px solid ${color}20`,
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-px"
                style={{ background: `linear-gradient(90deg,${color},transparent)` }} />
              <div
                className="text-[22px] font-black mb-2 leading-none"
                style={{ background: `linear-gradient(90deg,${color},${color}80)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
              >
                {n}
              </div>
              <p className="text-[12px] font-bold mb-1" style={{ color }}>{title}</p>
              <p className="text-[11px] text-[#475569] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <a
          href="/dashboard"
          className="flex items-center gap-2 px-6 py-3 rounded-xl text-[13px] font-black tracking-wide transition-all hover:opacity-90 active:scale-[0.97]"
          style={{
            background: "linear-gradient(90deg,rgba(0,242,255,0.18),rgba(168,85,247,0.18))",
            border:     "1px solid rgba(0,242,255,0.35)",
            color:      "#00f2ff",
            boxShadow:  "0 0 24px rgba(0,242,255,0.12)",
          }}
        >
          Go to Agent Space
          <ArrowRight size={14} />
        </a>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   Integration selector data
══════════════════════════════════════════════ */
type FrameworkTab = "html" | "nextjs" | "react" | "react_native" | "flutter";

const FRAMEWORK_TABS: {
  id: FrameworkTab; label: string; sublabel: string;
  color: string; glow: string;
}[] = [
  { id: "html",         label: "HTML / Vanilla",    sublabel: "Any website — no build step",    color: "#00f2ff", glow: "rgba(0,242,255,0.3)"   },
  { id: "nextjs",       label: "Next.js Layout",    sublabel: "App Router & Pages Router",      color: "#a855f7", glow: "rgba(168,85,247,0.3)"  },
  { id: "react",        label: "React Component",   sublabel: "Vite · CRA · SPA — universal",  color: "#ec4899", glow: "rgba(236,72,153,0.3)"  },
  { id: "react_native", label: "React Native",      sublabel: "WebView — iOS & Android",        color: "#00d4ff", glow: "rgba(0,212,255,0.3)"   },
  { id: "flutter",      label: "Flutter",           sublabel: "InAppWebView — iOS & Android",   color: "#53c5f6", glow: "rgba(83,197,246,0.3)"  },
];

/* ══════════════════════════════════════════════
   Page
══════════════════════════════════════════════ */
type AgentMeta = { apiKey?: string; themeColor?: string; name?: string };

export default function EmbedCodePage() {
  const { activeAgentId }             = useAgentStore();
  const [agentMeta,   setAgentMeta]   = useState<AgentMeta | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [copied,       setCopied]      = useState<string | null>(null);
  const [frameworkTab, setFrameworkTab] = useState<FrameworkTab>("html");

  /* Fetch agent credentials whenever the active agent changes */
  useEffect(() => {
    if (!activeAgentId) { setAgentMeta(null); return; }
    setLoadingMeta(true);
    fetch(`/api/agents/${activeAgentId}`)
      .then((r) => r.json())
      .then((d: { agent?: AgentMeta }) => setAgentMeta(d.agent ?? null))
      .catch(() => setAgentMeta(null))
      .finally(() => setLoadingMeta(false));
  }, [activeAgentId]);

  /* ── Environment-aware origin ────────────────────────────────────
     Browser:  window.location.origin — always correct, zero config.
     SSR/Edge: checks NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_SITE_URL,
               NEXT_PUBLIC_BASE_URL in priority order, falls back to
               localhost so snippets are never empty during development.
  ────────────────────────────────────────────────────────────────── */
  const siteOrigin = typeof window !== "undefined"
    ? window.location.origin
    : (process.env.NEXT_PUBLIC_APP_URL
        ?? process.env.NEXT_PUBLIC_SITE_URL
        ?? process.env.NEXT_PUBLIC_BASE_URL
        ?? "http://localhost:3000");

  /* ── Resolved values (real data when available, placeholders otherwise) ── */
  const agentId     = activeAgentId        ?? "YOUR_AGENT_ID";
  const apiKey      = agentMeta?.apiKey    ?? "4u_live_xxxxxxxxxxxxxxxxxxxxxxxx";
  const accentColor = agentMeta?.themeColor ?? "#00f2ff";
  const agentLabel  = agentMeta?.name ?? (activeAgentId ? "Agent" : null);

  /* true once we have both IDs and the fetch is done */
  const isLive = !!activeAgentId && !!agentMeta?.apiKey && !loadingMeta;

  /* ── Pre-filled code snippets ── */
  const HTML_SNIPPET = `<!-- Paste before </body> on any HTML page -->
<script
  src="${siteOrigin}/embed.js"
  id="cyberagent-universal-script"
  data-agent-id="${agentId}"
  data-accent-color="${accentColor || "#00f2ff"}"
  async>
</script>`;

  const NEXTJS_SNIPPET = `import Script from 'next/script';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}

        {/* Live CyberAgent Instance — Hydration Safe */}
        <Script
          src={\`\${window?.location?.origin || 'http://localhost:3000'}/embed.js\`}
          strategy="afterInteractive"
          data-agent-id="${agentId}"
          data-accent-color="${accentColor || "#00f2ff"}"
        />
      </body>
    </html>
  );
}`;

  const REACT_SNIPPET = `import { useEffect } from 'react';

export default function CyberAgentWidget() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "${siteOrigin}/embed.js";
    script.id = "cyberagent-universal-script";
    script.setAttribute('data-agent-id', "${agentId}");
    script.setAttribute('data-accent-color', "${accentColor || "#00f2ff"}");
    script.async = true;

    document.body.appendChild(script);

    return () => {
      const existingScript = document.getElementById('cyberagent-universal-script');
      if (existingScript) existingScript.remove();
    };
  }, []);

  return null;
}`;

  const RN_SNIPPET = `import React from 'react';
import { StyleSheet, SafeAreaView, Platform, View } from 'react-native';
import { WebView } from 'react-native-webview';

export default function CyberAgentMobileWidget() {
  const agentId     = "${agentId}";
  const accentColor = "${accentColor || "#00f2ff"}";
  const sourceOrigin = "${siteOrigin}"; // Dynamically bound to env siteOrigin

  const embeddedHtml = \`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          body, html { margin: 0; padding: 0; width: 100%; height: 100%; background: transparent; overflow: hidden; }
        </style>
      </head>
      <body>
        <script
          src="\${sourceOrigin}/embed.js"
          id="cyberagent-universal-script"
          data-agent-id="\${agentId}"
          data-accent-color="\${accentColor}"
          async>
        </script>
      </body>
    </html>
  \`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.webviewWrapper}>
        <WebView
          originWhitelist={['*']}
          source={{ html: embeddedHtml }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          transparent={true}
          backgroundColor="transparent"
          scalesPageToFit={Platform.OS === 'android'}
          nestedScrollEnabled={true}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: 'transparent' },
  webviewWrapper: { flex: 1, width: '100%', height: '100%', backgroundColor: 'transparent' },
  webview:        { flex: 1, backgroundColor: 'transparent' },
});`;

  const FLUTTER_SNIPPET = `import 'package:flutter/material.dart';
import 'package:flutter_inappwebview/flutter_inappwebview.dart';

class CyberAgentMobileWidget extends StatelessWidget {
  final String agentId     = "${agentId}";
  final String accentColor = "${accentColor || "#00f2ff"}";
  final String sourceOrigin = "${siteOrigin}"; // Dynamically bound to env siteOrigin

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.transparent,
      body: SafeArea(
        child: Container(
          width: double.infinity,
          height: double.infinity,
          color: Colors.transparent,
          child: InAppWebView(
            initialData: InAppWebViewInitialData(
              data: """
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset='utf-8'>
                    <meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'>
                    <style>
                      body, html { margin:0; padding:0; width:100%; height:100%; background:transparent; overflow:hidden; }
                    </style>
                  </head>
                  <body>
                    <script
                      src='\$sourceOrigin/embed.js'
                      id='cyberagent-universal-script'
                      data-agent-id='\$agentId'
                      data-accent-color='\$accentColor'
                      async>
                    </script>
                  </body>
                </html>
              """,
            ),
            initialOptions: InAppWebViewGroupOptions(
              crossPlatform: InAppWebViewOptions(
                transparentBackground: true,
                javaScriptEnabled: true,
                supportZoom: false,
                useShouldOverrideUrlLoading: true,
              ),
              android: AndroidInAppWebViewOptions(
                useHybridComposition: true,
              ),
            ),
          ),
        ),
      ),
    );
  }
}`;

  const ENV_SNIPPET = `# .env.local — never commit this file

# Your CyberAgent Studio credentials
NEXT_PUBLIC_AGENT_ID=${agentId}
NEXT_PUBLIC_API_KEY=${apiKey}

# Widget appearance (hex colour)
NEXT_PUBLIC_ACCENT_COLOR=${accentColor}

# Base URL of your CyberAgent deployment
NEXT_PUBLIC_BASE_URL=${siteOrigin}`;

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const accent = FRAMEWORK_TABS.find((t) => t.id === frameworkTab)?.color ?? "#00f2ff";

  return (
    <DashboardShell title="Embed Code">
      <div className="h-full overflow-y-auto">
        <div className="px-4 sm:px-6 lg:px-10 py-6 w-full max-w-7xl mx-auto space-y-8">

          {/* ── Page header ── */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-black tracking-tight">
                <span style={{
                  background:           "linear-gradient(90deg,#00f2ff 0%,#a855f7 60%,#ec4899 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor:  "transparent",
                  filter:               "drop-shadow(0 0 12px rgba(0,242,255,0.25))",
                }}>
                  Embed Your Widget
                </span>
              </h1>
              <p className="text-[13px] text-[#64748b]">
                Add your AI agent to any website in seconds — no backend required.
              </p>
            </div>

            {/* Agent status pill */}
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-semibold shrink-0"
              style={{
                background: isLive    ? "rgba(0,255,148,0.06)"
                  : activeAgentId     ? "rgba(255,255,255,0.04)"
                  : "rgba(255,255,255,0.04)",
                border: isLive        ? "1px solid rgba(0,255,148,0.22)"
                  : activeAgentId     ? "1px solid rgba(255,255,255,0.08)"
                  : "1px solid rgba(255,255,255,0.08)",
                color: isLive         ? "#00ff94"
                  : activeAgentId     ? "#64748b"
                  : "#475569",
              }}
            >
              <div
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  background: isLive ? "#00ff94" : activeAgentId ? "#f59e0b" : "#334155",
                  boxShadow:  isLive ? "0 0 6px #00ff94" : "none",
                  animation:  isLive ? "pulse 2s infinite" : "none",
                }}
              />
              {loadingMeta
                ? "Loading…"
                : agentLabel
                  ? `Agent: ${agentLabel}`
                  : "No agent selected"}
            </div>
          </div>

          {/* ── Framework tab selector (2×2 grid) ── */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {FRAMEWORK_TABS.map(({ id, label, sublabel, color, glow }) => {
              const isActive = frameworkTab === id;
              return (
                <button
                  key={id}
                  onClick={() => setFrameworkTab(id)}
                  className="relative flex flex-col items-start gap-1 p-4 rounded-2xl text-left transition-all duration-200 overflow-hidden"
                  style={{
                    background:     isActive ? `linear-gradient(135deg,${color}10,${color}05)` : "rgba(255,255,255,0.025)",
                    border:         isActive ? `1.5px solid ${color}55` : `1px solid rgba(255,255,255,0.07)`,
                    boxShadow:      isActive ? `0 0 24px ${glow.replace("0.3","0.12")}` : "none",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  {isActive && (
                    <div className="absolute top-0 left-0 right-0 h-px"
                      style={{ background: `linear-gradient(90deg,${color},${color}40,transparent)` }} />
                  )}
                  <p className="text-[13px] font-bold leading-none" style={{ color: isActive ? color : "#94a3b8" }}>
                    {label}
                  </p>
                  <p className="text-[10px] leading-snug" style={{ color: "#475569" }}>{sublabel}</p>
                  {isActive && <ChevronRight size={12} style={{ color, position: "absolute", top: 14, right: 10 }} />}
                </button>
              );
            })}
          </div>

          {/* ══════════════════════════════════════════
              GATE — shown when no agent is selected
          ══════════════════════════════════════════ */}
          {!activeAgentId && <NoAgentGate />}

          {/* ══════════════════════════════════════════
              CODE SECTION — shown when agent is active
          ══════════════════════════════════════════ */}
          {activeAgentId && (
            <>
              <style>{`
                @keyframes tab-slide {
                  from { opacity: 0; transform: translateY(8px); }
                  to   { opacity: 1; transform: translateY(0); }
                }
              `}</style>

              {/* ── Live-data status banner ── */}
              <div className="relative flex items-center gap-3 px-4 py-3.5 rounded-xl overflow-hidden"
                style={{
                  background: isLive ? "rgba(0,255,148,0.07)" : "rgba(255,255,255,0.04)",
                  border:     isLive ? "1px solid rgba(0,255,148,0.3)" : "1px solid rgba(255,255,255,0.08)",
                  boxShadow:  isLive ? "0 0 24px rgba(0,255,148,0.08)" : "none",
                }}>
                {isLive && (
                  <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
                    style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(0,255,148,1) 3px,rgba(0,255,148,1) 4px)" }} />
                )}
                {loadingMeta ? (
                  <RefreshCw size={14} className="animate-spin shrink-0" style={{ color: "#475569" }} />
                ) : isLive ? (
                  <div className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: "#00ff94", boxShadow: "0 0 8px #00ff94, 0 0 18px rgba(0,255,148,0.5)", animation: "pulse 2s infinite" }} />
                ) : (
                  <AlertCircle size={14} className="shrink-0" style={{ color: "#f59e0b" }} />
                )}
                <p className="text-[12px] leading-relaxed relative z-10">
                  {loadingMeta ? (
                    <span className="text-[#475569]">Loading your agent credentials…</span>
                  ) : isLive ? (
                    <>
                      <span className="font-black" style={{ color: "#00ff94" }}>● Live data injected.</span>{" "}
                      <span className="text-[#64748b]">All placeholders replaced with your real credentials — just click <span className="text-[#e2e8f0] font-semibold">Copy</span> and paste.</span>
                    </>
                  ) : (
                    <>
                      <span className="font-bold" style={{ color: "#f59e0b" }}>API key not found.</span>{" "}
                      <span className="text-[#64748b]">Regenerate it in the <span className="text-[#00f2ff] font-semibold">Embed &amp; API</span> tab inside Agent Space.</span>
                    </>
                  )}
                </p>
              </div>

              {/* ── html: HTML / Vanilla Script ── */}
              {frameworkTab === "html" && (
                <div key="tab-html" className="grid grid-cols-1 xl:grid-cols-2 gap-6" style={{ animation: "tab-slide 0.18s ease-out" }}>
                  <div className="space-y-5">
                    <TerminalBlock
                      code={HTML_SNIPPET} title="index.html" lang="HTML" accent="#00f2ff"
                      tokenize={tokenizeHTML} copied={copied === "html"} onCopy={() => copy(HTML_SNIPPET, "html")} isLive={isLive}
                    />
                    <PasteGuide />
                  </div>
                  <div className="space-y-5">
                    <div className="rounded-2xl overflow-hidden"
                      style={{ border: "1px solid rgba(255,255,255,0.07)", background: "rgba(6,6,14,0.8)" }}>
                      <div className="px-4 py-3 flex items-center gap-2"
                        style={{ background: "rgba(0,0,0,0.3)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="w-5 h-5 rounded flex items-center justify-center"
                          style={{ background: "rgba(0,242,255,0.12)", border: "1px solid rgba(0,242,255,0.28)" }}>
                          <Zap size={11} className="text-[#00f2ff]" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest"
                          style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                          Script Attributes
                        </span>
                      </div>
                      <div>
                        {[
                          { attr: "data-agent-id",    type: "string",  val: "Auto-filled — your agent's unique ID",         required: true  },
                          { attr: "data-accent-color", type: "string",  val: "Hex colour (e.g. #00f2ff)",                    required: false },
                          { attr: "async",             type: "boolean", val: "Non-blocking load — strongly recommended",      required: false },
                        ].map(({ attr, type, val, required }, i, arr) => (
                          <div key={attr}
                            className="grid grid-cols-[1fr_auto] items-start gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02]"
                            style={{ borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <code className="text-[11px] font-mono font-bold text-[#00f2ff]">{attr}</code>
                                {required && <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded"
                                  style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>required</span>}
                              </div>
                              <p className="text-[11px] text-[#475569]">{val}</p>
                            </div>
                            <span className="text-[9px] px-2 py-0.5 rounded-full font-mono mt-0.5"
                              style={{ background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid rgba(255,255,255,0.08)" }}>{type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <InfoCallout emoji="💡" title="HTML Integration Guide" from="#00f2ff" to="#a855f7"
                      body={<>Paste before the closing <code className="px-1 py-0.5 rounded text-[10px] font-mono" style={{ background: "rgba(0,242,255,0.08)", color: "#00f2ff" }}>&lt;/body&gt;</code> tag. Works on WordPress, Shopify, PHP, and static sites — zero build step.</>}
                    />
                  </div>
                </div>
              )}

              {/* ── nextjs: Next.js Layout ── */}
              {frameworkTab === "nextjs" && (
                <div key="tab-nextjs" className="grid grid-cols-1 xl:grid-cols-2 gap-6" style={{ animation: "tab-slide 0.18s ease-out" }}>
                  <div className="space-y-5">
                    <TerminalBlock
                      code={NEXTJS_SNIPPET} title="app/layout.tsx" lang="TSX" accent="#a855f7"
                      tokenize={tokenizeTSX} copied={copied === "nextjs"} onCopy={() => copy(NEXTJS_SNIPPET, "nextjs")} isLive={isLive}
                    />
                    <InfoCallout emoji="⚡" title="No install required" from="#a855f7" to="#ec4899"
                      body={<>Uses <code className="px-1 py-0.5 rounded text-[10px] font-mono" style={{ background: "rgba(168,85,247,0.1)", color: "#c084fc" }}>&lt;Script strategy=&quot;afterInteractive&quot;&gt;</code> — deferred load, zero blocking.</>}
                    />
                    <InfoCallout emoji="💡" title="Next.js Integration Guide" from="#a855f7" to="#06b6d4"
                      body={<>Open <code className="px-1 py-0.5 rounded text-[10px] font-mono" style={{ background: "rgba(168,85,247,0.08)", color: "#c084fc" }}>src/app/layout.tsx</code> and paste the <code className="px-1 py-0.5 rounded text-[10px] font-mono" style={{ background: "rgba(168,85,247,0.08)", color: "#c084fc" }}>&lt;Script&gt;</code> block below <code className="px-1 py-0.5 rounded text-[10px] font-mono" style={{ background: "rgba(168,85,247,0.08)", color: "#c084fc" }}>{"{children}"}</code>. Works with App Router and Pages Router.</>}
                    />
                  </div>
                  <div className="space-y-5">
                    <TerminalBlock
                      code={ENV_SNIPPET} title=".env.local" lang="ENV" accent="#00ff94"
                      tokenize={tokenizeEnv} copied={copied === "env"} onCopy={() => copy(ENV_SNIPPET, "env")} isLive={isLive}
                    />
                    <InfoCallout emoji="🔐" title="Security First" from="#f59e0b" to="#ef4444"
                      body={<>Never commit <code className="px-1 py-0.5 rounded text-[10px] font-mono" style={{ background: "rgba(245,158,11,0.12)", color: "#fbbf24" }}>.env.local</code> to version control. Set variables in your hosting dashboard for production.</>}
                    />
                  </div>
                </div>
              )}

              {/* ── react: React Functional Component ── */}
              {frameworkTab === "react" && (
                <div key="tab-react" className="grid grid-cols-1 xl:grid-cols-2 gap-6" style={{ animation: "tab-slide 0.18s ease-out" }}>
                  <div className="space-y-5">
                    <TerminalBlock
                      code={REACT_SNIPPET} title="CyberAgentWidget.tsx" lang="TSX" accent="#ec4899"
                      tokenize={tokenizeTSX} copied={copied === "react"} onCopy={() => copy(REACT_SNIPPET, "react")} isLive={isLive}
                    />
                  </div>
                  <div className="space-y-5">
                    <InfoCallout emoji="⚡" title="No npm install" from="#ec4899" to="#a855f7"
                      body={<>Drop this component into your root <code className="px-1 py-0.5 rounded text-[10px] font-mono" style={{ background: "rgba(236,72,153,0.1)", color: "#f472b6" }}>App.tsx</code> or any layout file. Works with <strong className="text-[#e2e8f0]">Vite, CRA, Remix, Gatsby</strong> — no package install required.</>}
                    />
                    <InfoCallout emoji="💡" title="React Integration Guide" from="#ec4899" to="#a855f7"
                      body={<>The script tag is injected once on mount and auto-removed on unmount — safe for single-page apps with dynamic routing. Your <code className="px-1 py-0.5 rounded text-[10px] font-mono" style={{ background: "rgba(236,72,153,0.08)", color: "#f472b6" }}>data-agent-id</code> and <code className="px-1 py-0.5 rounded text-[10px] font-mono" style={{ background: "rgba(236,72,153,0.08)", color: "#f472b6" }}>data-accent-color</code> are pre-filled with your live credentials.</>}
                    />
                    <TerminalBlock
                      code={ENV_SNIPPET} title=".env.local" lang="ENV" accent="#00ff94"
                      tokenize={tokenizeEnv} copied={copied === "env"} onCopy={() => copy(ENV_SNIPPET, "env")} isLive={isLive}
                    />
                  </div>
                </div>
              )}

              {/* ── react_native: React Native WebView ── */}
              {frameworkTab === "react_native" && (
                <div key="tab-rn" className="grid grid-cols-1 xl:grid-cols-2 gap-6" style={{ animation: "tab-slide 0.18s ease-out" }}>
                  <div className="space-y-5">
                    <TerminalBlock
                      code={RN_SNIPPET} title="CyberAgentMobileWidget.tsx" lang="TSX" accent="#00d4ff"
                      tokenize={tokenizeTSX} copied={copied === "rn"} onCopy={() => copy(RN_SNIPPET, "rn")} isLive={isLive}
                    />
                  </div>
                  <div className="space-y-5">
                    <MobileGuideCard accent="#00d4ff" rnInstall="npm install react-native-webview" />
                  </div>
                </div>
              )}

              {/* ── flutter: Flutter InAppWebView ── */}
              {frameworkTab === "flutter" && (
                <div key="tab-flutter" className="grid grid-cols-1 xl:grid-cols-2 gap-6" style={{ animation: "tab-slide 0.18s ease-out" }}>
                  <div className="space-y-5">
                    <TerminalBlock
                      code={FLUTTER_SNIPPET} title="cyber_agent_widget.dart" lang="Dart" accent="#53c5f6"
                      tokenize={tokenizeTSX} copied={copied === "flutter"} onCopy={() => copy(FLUTTER_SNIPPET, "flutter")} isLive={isLive}
                    />
                  </div>
                  <div className="space-y-5">
                    <MobileGuideCard accent="#53c5f6" rnInstall="flutter pub add flutter_inappwebview" />
                  </div>
                </div>
              )}
            </>
          )}

          {/* ════════════════════════════════════
              WHICH ONE SHOULD I CHOOSE?
          ════════════════════════════════════ */}
          <div className="relative rounded-2xl overflow-hidden"
            style={{ border: "1px solid rgba(0,242,255,0.12)", background: "rgba(3,3,10,0.85)", backdropFilter: "blur(20px)" }}>
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7,#ec4899,#00d4ff,#53c5f6)" }} />

            {/* Subtle grid overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.015]"
              style={{ backgroundImage: "linear-gradient(rgba(0,242,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,242,255,1) 1px,transparent 1px)", backgroundSize: "48px 48px" }} />

            <div className="relative px-6 py-6 space-y-5">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(0,242,255,0.1)", border: "1px solid rgba(0,242,255,0.25)", boxShadow: "0 0 20px rgba(0,242,255,0.1)" }}>
                  <Star size={16} className="text-[#00f2ff]" />
                </div>
                <div>
                  <h3 className="text-[15px] font-black tracking-wide"
                    style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    Which one should I choose?
                  </h3>
                  <p className="text-[11px] text-[#475569]">Pick the integration that matches your production tech stack</p>
                </div>
              </div>

              {/* 3-card matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    icon: Code2, label: "Script Tag / Universal", color: "#00f2ff",
                    ease: 5, badge: "🏆 Easiest",
                    tagline: "Paste & go — works everywhere",
                    best: ["WordPress", "Shopify", "Wix", "Webflow", "Static HTML"],
                    pros: ["Zero build step", "Paste & done in 10 sec", "Works everywhere"],
                    cons: ["Less runtime programmatic customisation"],
                  },
                  {
                    icon: Globe, label: "React / Next.js Frameworks", color: "#a855f7",
                    ease: 4, badge: "⚡ Recommended",
                    tagline: "TypeScript-safe, zero npm weight",
                    best: ["Next.js (App & Pages)", "React SPAs", "Vite", "Remix", "Gatsby"],
                    pros: ["Full TypeScript definitions", "No npm weight install", "Self-cleaning on unmount"],
                    cons: ["Requires one layout script or component file"],
                  },
                  {
                    icon: Smartphone, label: "Native Mobile WebView", color: "#00d4ff",
                    ease: 3, badge: "📱 Live",
                    tagline: "React Native & Flutter — full support",
                    best: ["React Native", "Flutter", "Cross-Platform architectures"],
                    pros: ["Fluid viewport rendering", "Isolated execution thread", "Zero dependency bloat"],
                    cons: ["Requires internet manifest permission keys"],
                  },
                ].map(({ icon: Icon, label, color, ease, best, pros, cons, badge, tagline }) => (
                  <div
                    key={label}
                    className="rounded-xl p-5 space-y-3.5 relative overflow-hidden flex flex-col"
                    style={{ background: `${color}06`, border: `1px solid ${color}28`, backdropFilter: "blur(8px)" }}
                  >
                    <div className="absolute top-0 left-0 right-0 h-[2px]"
                      style={{ background: `linear-gradient(90deg,${color},${color}40,transparent)` }} />

                    <div className="flex items-start justify-between gap-2">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: `${color}15`, border: `1px solid ${color}35`, boxShadow: `0 0 16px ${color}18` }}>
                        <Icon size={18} style={{ color, filter: `drop-shadow(0 0 4px ${color}80)` }} />
                      </div>
                      <span className="text-[9px] font-black px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 mt-0.5"
                        style={{ background: `${color}15`, border: `1px solid ${color}35`, color, boxShadow: `0 0 8px ${color}18` }}>
                        {badge}
                      </span>
                    </div>

                    <div>
                      <p className="text-[13px] font-black leading-snug" style={{ color }}>{label}</p>
                      <p className="text-[11px] text-[#475569] mt-0.5">{tagline}</p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#334155] mr-0.5">Ease</span>
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <div key={idx} className="w-2.5 h-2.5 rounded-full"
                          style={{ background: idx < ease ? color : "rgba(255,255,255,0.06)", boxShadow: idx < ease ? `0 0 6px ${color}70` : "none" }} />
                      ))}
                    </div>

                    <div className="space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-widest" style={{ color: `${color}80` }}>Best for</p>
                      <div className="flex flex-wrap gap-1">
                        {best.map((b) => (
                          <span key={b} className="text-[9px] px-2 py-0.5 rounded-full font-medium"
                            style={{ background: `${color}0e`, color: `${color}cc`, border: `1px solid ${color}20` }}>
                            {b}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1 flex-1">
                      {pros.map((p) => (
                        <div key={p} className="flex items-start gap-2 text-[11px] text-[#64748b]">
                          <span className="shrink-0 text-[10px] mt-0.5" style={{ color: "#00ff94" }}>✓</span>{p}
                        </div>
                      ))}
                      {cons.map((c) => (
                        <div key={c} className="flex items-start gap-2 text-[11px] text-[#334155]">
                          <span className="shrink-0 text-[10px] mt-0.5" style={{ color: "#f87171" }}>✕</span>{c}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pro tip terminal banner */}
              <div
                className="relative rounded-xl overflow-hidden"
                style={{ background: "rgba(0,0,0,0.55)", border: "1px solid rgba(0,242,255,0.18)", backdropFilter: "blur(12px)" }}
              >
                <div className="absolute top-0 left-0 right-0 h-px"
                  style={{ background: "linear-gradient(90deg,#00f2ff,rgba(0,242,255,0.2),transparent)" }} />
                <div className="flex items-start gap-3 px-4 py-3.5">
                  <Sparkles size={14} className="shrink-0 mt-0.5" style={{ color: "#00f2ff" }} />
                  <p className="text-[12px] text-[#64748b] leading-relaxed">
                    <span style={{ color: "#00f2ff", fontWeight: 700 }}>Pro tip:</span>{" "}
                    Not sure? Start with the{" "}
                    <span style={{ color: "#e2e8f0", fontWeight: 600 }}>Universal Script Tag</span> — it runs securely on any system,
                    and you can easily transition to a framework wrapper later. Your unique{" "}
                    <code className="px-1.5 py-0.5 rounded font-mono text-[11px]"
                      style={{ background: "rgba(0,242,255,0.08)", border: "1px solid rgba(0,242,255,0.2)", color: "#00f2ff" }}>
                      data-agent-id
                    </code>{" "}
                    remains consistent across all integration channels.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </DashboardShell>
  );
}
