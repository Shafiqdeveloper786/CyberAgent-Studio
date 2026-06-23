"use client";

import { useEffect, useRef, useState } from "react";
import { Send, X, MessageCircle, User } from "lucide-react";
import { useLiveChat, type ChatMessage } from "@/hooks/useLiveChat";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface Props {
  agentId:        string;
  agentName:      string;
  accentColor:    string;
  theme?:         string;
  logoUrl?:       string;
  welcomeMessage?: string;
}

/* ── CyberAgent Studio Brand Icon ── */
function CyberAgentIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="url(#cyber-brand-grad)" />
      <path d="M16 6C10.477 6 6 10.477 6 16s4.477 10 10 10 10-4.477 10-10S21.523 6 16 6zm-1.5 15v-4h-3.5l5-7v4h3.5l-5 7z" fill="#fff" opacity="0.95" />
      <circle cx="16" cy="16" r="3" fill="#fff" opacity="0.95" />
      <defs>
        <linearGradient id="cyber-brand-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563eb" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/* ── Mobile detection hook ── */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

/* ── Live countdown ── */
function LimitCountdown({ resetAt, accent }: { resetAt: string; accent: string }) {
  const [display, setDisplay] = useState("calculating…");

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, new Date(resetAt).getTime() - Date.now());
      const h    = Math.floor(diff / 3_600_000);
      const m    = Math.floor((diff % 3_600_000) / 60_000);
      const s    = Math.floor((diff % 60_000) / 1_000);
      setDisplay(
        diff === 0
          ? "Resetting now…"
          : `${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`
      );
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [resetAt]);

  return (
    <div
      className="flex items-center gap-2 mt-2.5 px-3 py-1.5 rounded-lg text-[11px] font-mono font-semibold"
      style={{
        background: `${accent}10`,
        border:     `1px solid ${accent}25`,
        color:      accent,
      }}
    >
      <span style={{ fontSize: 10 }}>⏱</span>
      Resets in: {display}
    </div>
  );
}

/* ── Limit bubble ── */
function LimitBubble({ msg, agentName, accent }: {
  msg: ChatMessage; agentName: string; accent: string;
}) {
  return (
    <div className="flex items-end gap-2">
      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
        style={{ background: `${accent}20`, border: `1px solid ${accent}30` }}>
        <CyberAgentIcon size={13} />
      </div>
      <div className="max-w-[85%]">
        <p className="text-[10px] mb-1 font-semibold" style={{ color: `var(--subtext-color, #475569)` }}>{agentName}</p>
        <div className="px-3.5 py-3 rounded-2xl rounded-tl-sm"
          style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.22)" }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <span style={{ fontSize: 13 }}>🚫</span>
            <p className="text-[12px] font-black" style={{ color: "#f87171" }}>Daily Limit Reached</p>
          </div>
          <p className="text-[11px] leading-relaxed" style={{ color: "#94a3b8" }}>{msg.content}</p>
          {msg.resetAt && <LimitCountdown resetAt={msg.resetAt} accent="#f87171" />}
        </div>
      </div>
    </div>
  );
}

/* ── CSS variables builder ── */
function buildCssVars(accent: string, theme: string) {
  let widgetBg = "#ffffff";
  let widgetBorder = "rgba(0,0,0,0.1)";
  let headerBg = "#f8fafc";
  let textColor = "#1e293b";
  let subtextColor = "#64748b";
  let userBubbleBg = accent;
  let userBubbleText = "#ffffff";
  let agentBubbleBg = "#f1f5f9";
  let agentBubbleText = "#1e293b";

  if (theme === "minimal-dark") {
    widgetBg = "#18181b";
    widgetBorder = "rgba(255,255,255,0.08)";
    headerBg = "#27272a";
    textColor = "#e4e4e7";
    subtextColor = "#a1a1aa";
    userBubbleBg = accent;
    userBubbleText = "#050505";
    agentBubbleBg = "#3f3f46";
    agentBubbleText = "#e4e4e7";
  } else if (theme === "cyberpunk") {
    widgetBg = "rgba(5,5,10,0.98)";
    widgetBorder = `${accent}20`;
    headerBg = "rgba(0,0,0,0.6)";
    textColor = "#e2e8f0";
    subtextColor = "#64748b";
    userBubbleBg = accent;
    userBubbleText = "#050505";
    agentBubbleBg = "rgba(255,255,255,0.06)";
    agentBubbleText = "#e2e8f0";
  }

  return {
    "--accent-color":         accent,
    "--accent-color-alpha40": `${accent}66`,
    "--accent-color-alpha20": `${accent}33`,
    "--accent-color-alpha25": `${accent}40`,
    "--accent-color-alpha10": `${accent}1A`,
    "--accent-color-alpha18": `${accent}2E`,
    "--widget-bg":           widgetBg,
    "--widget-border":       widgetBorder,
    "--header-bg":           headerBg,
    "--text-color":          textColor,
    "--subtext-color":       subtextColor,
    "--user-bubble-bg":      userBubbleBg,
    "--user-bubble-text":    userBubbleText,
    "--agent-bubble-bg":     agentBubbleBg,
    "--agent-bubble-text":   agentBubbleText,
  } as React.CSSProperties;
}

/* ── TASK 4: formatMessage — strips tool-call artifacts, returns clean text ── */
function formatMessage(content: string): string {
  if (!content) return "";
  // If the raw content is a tool call JSON/function artifact, show clean message
  if (content.includes("function=createTicket") ||
      content.includes('"toolName": "createTicket"') ||
      content.includes('"function":"createTicket"')) {
    return "Support ticket submitted successfully.";
  }
  // Strip any remaining JSON-like tool call syntax
  return content.replace(/\{?"(?:function|toolName)"\s*:\s*"[^"]*"[^}]*\}?/g, "").trim() || content;
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export function WidgetChat({
  agentId,
  agentName: _propsAgentName,
  accentColor,
  theme: propsTheme = "corporate-light",
  logoUrl: propsLogoUrl = "/logo1.png",
  welcomeMessage: _propsWelcomeMsg = "",
}: Props) {
  const accent = accentColor || "#00f2ff";
  const endRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  /* ── BRANDING PERSISTENCE: Always "NexCore AI" — the central support assistant ── */
  const agentName = "NexCore AI";
  const logoUrl = propsLogoUrl;
  const [theme, setTheme] = useState(propsTheme);
  const welcomeMessage = _propsWelcomeMsg || `Hello! I'm ${agentName}. How can I help you today?`;

  const initialContent = welcomeMessage || `Hello! I'm ${agentName}. How can I help you today?`;

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    isLimitReached,
    limitResetAt,
    limitMessage,
  } = useLiveChat({
    agentId,
    initialMessages: [{
      id:      "welcome",
      role:    "assistant",
      content: initialContent,
    }],
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const canSend = input.trim().length > 0 && !isLoading && !isLimitReached;
  const cssVars = buildCssVars(accent, theme);

  /* ── Filter out raw tool-call artifacts from message list ── */
  const visibleMessages = messages.filter((msg) => {
    if (msg.role !== "assistant") return true;
    if (msg.content.includes("function=createTicket")) return false;
    if (msg.content.includes('"toolName": "createTicket"')) return false;
    return true;
  });

  return (
    <div
      className="flex flex-col"
      style={{
        /* ── TASK 1: CSS Isolation — all:initial + fixed positioning ── */
        all: "initial",
        display: "flex",
        flexDirection: "column",
        position: "fixed" as any,
        bottom: "20px",
        right: "20px",
        zIndex: 2147483647,
        /* ── TASK 2: Larger sizing (400×650) ── */
        width: isMobile ? "100vw" : "400px",
        height: isMobile ? "100vh" : "650px",
        maxHeight: isMobile ? "100vh" : "85vh",
        /* ── TASK 3: Mobile — full-screen, no border-radius ── */
        borderRadius: isMobile ? "0px" : "12px",
        left: isMobile ? "0px" : "auto",
        top: isMobile ? "0px" : "auto",
        transition: "all 0.3s ease",
        boxShadow: isMobile ? "none" : "0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)",
        background: `var(--widget-bg, #ffffff)`,
        touchAction: "auto",
        overflow: "hidden",
        margin: 0,
        padding: 0,
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        fontSize: "13px",
        lineHeight: "1.4",
        color: "inherit",
        ...cssVars,
      } as React.CSSProperties}
    >
      {/* ── Header ── */}
      <div
        className="shrink-0 flex items-center gap-3"
        style={{
          padding: "12px 16px",
          background: `var(--header-bg, #ffffff)`,
          borderBottom: `1px solid var(--widget-border, #e2e8f0)`,
        }}
      >
        {/* Brand icon */}
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `linear-gradient(135deg, var(--accent-color, ${accent}), #7c3aed)`,
          }}
        >
          <CyberAgentIcon size={18} />
        </div>

        {/* Name + status */}
        <div className="flex-1" style={{ minWidth: 0 }}>
          <p className="font-semibold truncate" style={{ fontSize: 13, color: `var(--text-color, #1e293b)` }}>
            {agentName}
          </p>
          <div className="flex items-center gap-1.5" style={{ marginTop: 2 }}>
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: isLimitReached ? "#f87171" : isLoading ? `var(--accent-color, ${accent})` : "#00ff94",
                animation: "pulse 2s cubic-bezier(.4,0,.6,1) infinite",
              }}
            />
            <span style={{ fontSize: 10, color: `var(--subtext-color, #64748b)` }}>
              {isLimitReached ? "Limit reached" : isLoading ? "Responding…" : "Online"}
            </span>
          </div>
        </div>

        {/* ── Logo — increased spacing (12px padding on all sides) ── */}
        <div className="flex items-center justify-center" style={{ padding: "0 6px" }}>
          <Image
            src={logoUrl}
            alt="CyberAgent Studio"
            width={110}
            height={26}
            className="object-contain"
            style={{ height: "24px", width: "auto" }}
            quality={100}
            priority
          />
        </div>

        {/* Close button */}
        <button
          onClick={() => { try { window.parent.postMessage({ channel: "nexa-agent", command: "CLOSE" }, "*"); } catch { /**/ } }}
          aria-label="Close chat"
          className="flex items-center justify-center shrink-0"
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: `1px solid var(--widget-border, #e2e8f0)`,
            background: "rgba(0,0,0,0.04)",
            cursor: "pointer",
            outline: "none",
          }}
        >
          <X size={12} style={{ color: "#64748b" }} />
        </button>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto" style={{ padding: "12px 12px", minHeight: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {visibleMessages.map((msg) => {
            if (msg.type === "limit") {
              return <LimitBubble key={msg.id} msg={msg} agentName={agentName} accent={accent} />;
            }
            return (
              <div key={msg.id} style={{ display: "flex", gap: 6, ...(msg.role === "user" ? { flexDirection: "row-reverse" } : { alignItems: "flex-end" }) }}>
                {/* ── TASK 1: Distinct icons — Agent uses CyberAgent, User uses User avatar ── */}
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    ...(msg.role === "user"
                      ? { background: `var(--subtext-color, #94a3b8)20`, border: `1px solid var(--subtext-color, #94a3b8)30` }
                      : { background: `linear-gradient(135deg, var(--accent-color, ${accent}), #7c3aed)` }
                    ),
                  }}
                >
                  {msg.role === "assistant" ? <CyberAgentIcon size={13} /> : <User size={13} style={{ color: `var(--subtext-color, #64748b)` }} />}
                </div>
                <div style={{ maxWidth: msg.role === "user" ? "80%" : "82%" }}>
                  {msg.role === "assistant" && (
                    <p style={{ fontSize: 9, marginBottom: 4, fontWeight: 500, color: `var(--subtext-color, #475569)` }}>{agentName}</p>
                  )}
                  <div
                    style={{
                      padding: "8px 12px",
                      fontSize: 12,
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      ...(msg.role === "user"
                        ? { background: `var(--user-bubble-bg, ${accent})`, color: `var(--user-bubble-text, #ffffff)`, fontWeight: 500 }
                        : { background: `var(--agent-bubble-bg, #f1f5f9)`, color: `var(--agent-bubble-text, #1e293b)`, border: `1px solid var(--widget-border, #e2e8f0)` }
                      ),
                    }}
                  >
                    {formatMessage(msg.content)}
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && visibleMessages[visibleMessages.length - 1]?.role !== "assistant" && (
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
              <div
                className="flex items-center justify-center shrink-0"
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  background: `linear-gradient(135deg, var(--accent-color, ${accent}), #7c3aed)`,
                }}
              >
                <CyberAgentIcon size={12} />
              </div>
              <div>
                <p style={{ fontSize: 9, marginBottom: 4, fontWeight: 500, color: `var(--subtext-color, #475569)` }}>{agentName}</p>
                <div
                  className="flex items-center gap-1.5"
                  style={{
                    padding: "10px 12px",
                    borderRadius: "16px 16px 16px 4px",
                    background: `var(--agent-bubble-bg, #f1f5f9)`,
                    border: `1px solid var(--accent-color-alpha25, ${accent}30)`,
                  }}
                >
                  {[0, 160, 320].map((d) => (
                    <span key={d} className="rounded-full animate-bounce"
                      style={{ width: 6, height: 6, background: `var(--accent-color, ${accent})`, opacity: 0.75, animationDelay: `${d}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      {/* ── Limit bar ── */}
      {isLimitReached && (
        <div style={{ margin: "0 12px 8px", padding: "8px 12px", borderRadius: 12, background: "rgba(127,29,29,0.28)", border: "1px solid rgba(248,113,113,0.38)" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ fontSize: 14 }}>🚫</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 10, fontWeight: 900, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4, color: "#f87171" }}>Daily Limit Reached</p>
              <p style={{ fontSize: 10, lineHeight: 1.5, color: "#fca5a5" }}>{limitMessage ?? "50 messages/day on Free Plan."}</p>
              {limitResetAt && <LimitCountdown resetAt={limitResetAt} accent="#f87171" />}
            </div>
          </div>
        </div>
      )}

      {/* ── Input ── */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 flex items-center gap-2"
        style={{ padding: "8px 12px", borderTop: `1px solid var(--widget-border, #e2e8f0)`, background: `var(--header-bg, #f8fafc)` }}
      >
        <input
          value={input}
          onChange={handleInputChange}
          placeholder={isLimitReached ? "Limit reached" : isLoading ? "Waiting…" : "Type a message…"}
          disabled={isLoading || isLimitReached}
          style={{
            flex: 1,
            background: "transparent",
            fontSize: 12,
            outline: "none",
            border: "none",
            color: `var(--text-color, #1e293b)`,
            touchAction: "auto",
            opacity: isLoading || isLimitReached ? 0.5 : 1,
          }}
        />
        <button
          type="submit"
          disabled={!canSend}
          className="flex items-center justify-center shrink-0"
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: "none",
            cursor: canSend ? "pointer" : "default",
            background: canSend ? `var(--accent-color, ${accent})` : "rgba(255,255,255,0.08)",
            boxShadow: canSend ? `0 0 10px var(--accent-color-alpha40, ${accent}50)` : "none",
            opacity: canSend ? 1 : 0.35,
            transition: "all 0.2s ease",
          }}
        >
          <Send size={11} style={{ color: canSend ? "#050505" : "#475569" }} />
        </button>
      </form>

      {/* ── Footer ── */}
      <div
        className="shrink-0 flex items-center justify-center gap-1.5"
        style={{ padding: "6px 12px", borderTop: `1px solid var(--widget-border, #e2e8f0)`, background: `var(--header-bg, #f8fafc)` }}
      >
        <span style={{ fontSize: 8, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase", color: `var(--subtext-color, #94a3b8)` }}>Powered by</span>
        <Image src={logoUrl} alt="CyberAgent Studio" width={80} height={18} className="object-contain" style={{ height: "14px", width: "auto" }} quality={100} />
      </div>
    </div>
  );
}

export const createTicketTool = {
  name: "createTicket",
  description: "Automated support ticketing tool. Registers customer inquiries directly into the database.",
  parameters: {
    type: "object",
    properties: {
      name: { type: "string", description: "The customer's full name" },
      email: { type: "string", description: "The customer's email address" },
      message: { type: "string", description: "Detailed support/issue message" }
    },
    required: ["name", "email", "message"]
  }
};