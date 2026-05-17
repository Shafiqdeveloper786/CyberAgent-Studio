"use client";

import { useEffect, useMemo, useRef } from "react";
import { useAgentStore, type Theme } from "@/store/agentStore";
import { useLiveChat } from "@/hooks/useLiveChat";
import { cn } from "@/lib/utils";
import { Send, MoreHorizontal, Bot } from "lucide-react";

/* ═══════════════════════════════════════════
   Theme helpers
═══════════════════════════════════════════ */
interface ThemeStyles {
  widgetBg:        string;
  widgetBorder:    string;
  headerBg:        string;
  userBubbleBg:    string;
  userBubbleText:  string;
  agentBubbleBg:   string;
  agentBubbleText: string;
  text:            string;
  subText:         string;
  browserDotColors: string[];
}

function getThemeStyles(theme: Theme, accent: string): ThemeStyles {
  switch (theme) {
    case "minimal-dark":
      return {
        widgetBg: "#18181b",         widgetBorder: "rgba(255,255,255,0.08)",
        headerBg: "#27272a",
        userBubbleBg: accent,        userBubbleText: "#050505",
        agentBubbleBg: "#3f3f46",    agentBubbleText: "#e4e4e7",
        text: "#e4e4e7",             subText: "#a1a1aa",
        browserDotColors: ["#ff5f57","#ffbd2e","#28c840"],
      };
    case "corporate-light":
      return {
        widgetBg: "#ffffff",          widgetBorder: "rgba(0,0,0,0.1)",
        headerBg: "#f8fafc",
        userBubbleBg: accent,         userBubbleText: "#ffffff",
        agentBubbleBg: "#f1f5f9",     agentBubbleText: "#1e293b",
        text: "#1e293b",              subText: "#64748b",
        browserDotColors: ["#ff5f57","#ffbd2e","#28c840"],
      };
    default: // cyberpunk
      return {
        widgetBg: "rgba(5,5,10,0.98)",  widgetBorder: `${accent}20`,
        headerBg: "rgba(0,0,0,0.6)",
        userBubbleBg: accent,            userBubbleText: "#050505",
        agentBubbleBg: "rgba(255,255,255,0.06)", agentBubbleText: "#e2e8f0",
        text: "#e2e8f0",                 subText: "#64748b",
        browserDotColors: ["#ff5f57","#ffbd2e","#28c840"],
      };
  }
}

/* ═══════════════════════════════════════════
   Typing indicator
═══════════════════════════════════════════ */
function TypingIndicator({
  t, accent, name,
}: {
  t: ThemeStyles; accent: string; name: string;
}) {
  return (
    <div className="flex items-end gap-2">
      <div
        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
        style={{ background: `${accent}20`, border: `1px solid ${accent}30` }}
      >
        <Bot size={10} style={{ color: accent }} />
      </div>
      <div>
        <p className="text-[9px] mb-1 font-medium" style={{ color: t.subText }}>
          {name} is typing…
        </p>
        <div
          className="flex items-center gap-1 px-3 py-2.5 rounded-2xl rounded-tl-sm"
          style={{ background: t.agentBubbleBg }}
        >
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{
                background:     t.agentBubbleText,
                opacity:        0.45,
                animationDelay: `${delay}ms`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Main component
═══════════════════════════════════════════ */
export function WidgetPreview() {
  const { config, activeAgentId } = useAgentStore();
  const t      = getThemeStyles(config.theme, config.accentColor);
  const endRef = useRef<HTMLDivElement>(null);

  /* Build stable initial messages that change only when agent / welcome text changes */
  const initialMessages = useMemo(() => [{
    id:      `welcome-${activeAgentId ?? "default"}`,
    role:    "assistant" as const,
    content: config.welcomeMessage || `Hello! I'm ${config.name}. How can I help you today?`,
  }], [activeAgentId, config.welcomeMessage, config.name]);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useLiveChat({
    agentId:         activeAgentId,
    initialMessages,
  });

  /* Auto-scroll on new message chunks */
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const canSend = input.trim().length > 0 && !isLoading;

  return (
    <div className="flex flex-col h-full">
      {/* ── Browser chrome ── */}
      <div
        className="flex-1 rounded-xl overflow-hidden flex flex-col"
        style={{
          background: "#0d0d12",
          border:     "1px solid rgba(255,255,255,0.08)",
          boxShadow:  "0 0 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
          minHeight:  0,
        }}
      >
        {/* Tab bar */}
        <div
          className="shrink-0 flex items-center gap-2 px-4 py-3"
          style={{ background: "#141418", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-1.5">
            {t.browserDotColors.map((c, i) => (
              <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
            ))}
          </div>
          <div
            className="mx-2 px-3 py-1 rounded-t text-[11px] text-[#64748b] flex-1 max-w-[180px]"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            Live Preview
          </div>
          <div
            className="flex-1 h-6 max-w-[220px] rounded px-2 flex items-center text-[11px] text-[#334155]"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
          >
            cyberagent-studio.com
          </div>
        </div>

        {/* Browser content */}
        <div
          className="flex-1 flex items-center justify-center overflow-hidden p-4"
          style={{ background: "rgba(255,255,255,0.01)", minHeight: 0 }}
        >
          {/* ── Chat Widget ── */}
          <div
            className="w-full rounded-2xl overflow-hidden flex flex-col shadow-2xl"
            style={{
              background: t.widgetBg,
              border:     `1px solid ${t.widgetBorder}`,
              maxWidth:   "min(360px, 100%)",
              height:     "min(520px, 100%)",
              boxShadow:  config.theme === "cyberpunk"
                ? `0 0 40px ${config.accentColor}18, 0 24px 64px rgba(0,0,0,0.6)`
                : "0 24px 64px rgba(0,0,0,0.4)",
            }}
          >
            {/* Widget header */}
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ background: t.headerBg, borderBottom: `1px solid ${t.widgetBorder}` }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg,${config.accentColor}40,${config.accentColor}20)`,
                    border:     `1px solid ${config.accentColor}40`,
                    boxShadow:  `0 0 10px ${config.accentColor}25`,
                  }}
                >
                  <Bot size={14} style={{ color: config.accentColor }} />
                </div>
                <div>
                  <p className="text-[12px] font-semibold leading-none" style={{ color: t.text }}>
                    {config.name || "Agent"}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: isLoading ? config.accentColor : "#00ff94",
                        animation:  "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
                      }}
                    />
                    <p className="text-[10px]" style={{ color: t.subText }}>
                      {isLoading ? "Responding…" : "Online"}
                    </p>
                  </div>
                </div>
              </div>
              <MoreHorizontal size={16} style={{ color: t.subText }} />
            </div>

            {/* Messages — scrollable */}
            <div
              className="flex-1 overflow-y-auto px-3 py-3 space-y-3"
              style={{ minHeight: 0 }}
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.role === "user" ? "justify-end" : "items-end gap-2"
                  )}
                >
                  {msg.role === "assistant" && (
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: `${config.accentColor}20`,
                        border:     `1px solid ${config.accentColor}30`,
                      }}
                    >
                      <Bot size={10} style={{ color: config.accentColor }} />
                    </div>
                  )}

                  <div className={cn(msg.role === "user" ? "max-w-[85%]" : "max-w-[88%]")}>
                    {msg.role === "assistant" && (
                      <p className="text-[9px] mb-1 font-medium" style={{ color: t.subText }}>
                        {config.name}
                      </p>
                    )}
                    <div
                      className={cn(
                        "px-3.5 py-2.5 text-[12px] leading-relaxed whitespace-pre-wrap break-words",
                        msg.role === "user" ? "rounded-2xl rounded-tr-sm" : "rounded-2xl rounded-tl-sm"
                      )}
                      style={{
                        background: msg.role === "user" ? t.userBubbleBg    : t.agentBubbleBg,
                        color:      msg.role === "user" ? t.userBubbleText  : t.agentBubbleText,
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing indicator — shown while loading before first assistant chunk */}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <TypingIndicator t={t} accent={config.accentColor} name={config.name} />
              )}

              {/* Scroll anchor */}
              <div ref={endRef} />
            </div>

            {/* Input bar */}
            <form
              onSubmit={handleSubmit}
              className="shrink-0 flex items-center gap-2 px-3 py-2.5"
              style={{ borderTop: `1px solid ${t.widgetBorder}` }}
            >
              <input
                value={input}
                onChange={handleInputChange}
                placeholder={isLoading ? "Waiting for response…" : "Type a message…"}
                disabled={isLoading}
                className="flex-1 text-[11px] bg-transparent outline-none disabled:opacity-40"
                style={{ color: t.text }}
              />
              <button
                type="submit"
                disabled={!canSend}
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-35 disabled:scale-90"
                style={{
                  background: canSend ? config.accentColor : "rgba(255,255,255,0.08)",
                  boxShadow:  canSend ? `0 0 10px ${config.accentColor}40` : "none",
                }}
              >
                <Send size={10} style={{ color: canSend ? "#050505" : t.subText }} />
              </button>
            </form>
          </div>
        </div>
      </div>

    </div>
  );
}
