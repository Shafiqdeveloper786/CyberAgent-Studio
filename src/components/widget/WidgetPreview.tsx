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

/* Build CSS custom properties object from config + theme styles */
function buildCssVars(config: { accentColor: string; theme: Theme }, t: ThemeStyles) {
  const accent = config.accentColor;
  return {
    "--accent-color":         accent,
    "--accent-color-alpha40": `${accent}66`,   // 40% opacity
    "--accent-color-alpha20": `${accent}33`,   // 20%
    "--accent-color-alpha25": `${accent}40`,   // 25%
    "--accent-color-alpha10": `${accent}1A`,   // 10%
    "--accent-color-alpha18": `${accent}2E`,   // 18%
    "--widget-bg":           t.widgetBg,
    "--widget-border":       t.widgetBorder,
    "--header-bg":           t.headerBg,
    "--text-color":          t.text,
    "--subtext-color":       t.subText,
    "--user-bubble-bg":      t.userBubbleBg,
    "--user-bubble-text":    t.userBubbleText,
    "--agent-bubble-bg":     t.agentBubbleBg,
    "--agent-bubble-text":   t.agentBubbleText,
  } as React.CSSProperties;
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
        style={{
          background: `var(--accent-color-alpha20, ${accent}20)`,
          border:     `1px solid var(--accent-color-alpha25, ${accent}30)`,
        }}
      >
        <Bot size={10} style={{ color: `var(--accent-color, ${accent})` }} />
      </div>
      <div>
        <p className="text-[9px] mb-1 font-medium" style={{ color: `var(--subtext-color, ${t.subText})` }}>
          {name} is typing…
        </p>
        <div
          className="flex items-center gap-1 px-3 py-2.5 rounded-2xl rounded-tl-sm"
          style={{ background: `var(--agent-bubble-bg, ${t.agentBubbleBg})` }}
        >
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{
                background:     `var(--agent-bubble-text, ${t.agentBubbleText})`,
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

  /* Build CSS vars object for real-time theme sync */
  const cssVars = useMemo(() => buildCssVars(config, t), [config, t]);

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
        className="flex-1 rounded-xl overflow-hidden flex flex-col bg-white/90 backdrop-blur-md border border-slate-200/60 shadow-xl"
        style={{
          minHeight:  0,
        }}
      >
        {/* Tab bar */}
        <div
          className="shrink-0 flex items-center gap-2 px-4 py-3 bg-slate-100/80 border-b border-slate-200/60"
        >
          <div className="flex items-center gap-1.5">
            {t.browserDotColors.map((c, i) => (
              <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
            ))}
          </div>
          <div
            className="mx-2 px-3 py-1 rounded-t text-[11px] font-semibold text-slate-900 flex-1 max-w-[180px] bg-white/95 border-t border-x border-slate-200/60"
          >
            Live Preview
          </div>
          <div
            className="flex-1 h-6 max-w-[220px] rounded px-2 flex items-center text-[11px] text-slate-600 bg-slate-200/40 border border-slate-200/60"
          >
            cyberagent-studio.com
          </div>
        </div>

        {/* Browser content */}
        <div
          className="flex-1 flex items-center justify-center overflow-hidden p-4 bg-slate-50/50"
          style={{ minHeight: 0 }}
        >
          {/* ── Chat Widget ── */}
          <div
            className="w-full rounded-2xl overflow-hidden flex flex-col shadow-2xl"
            style={{
              ...cssVars,
              background: `var(--widget-bg, ${t.widgetBg})`,
              border:     `1px solid var(--widget-border, ${t.widgetBorder})`,
              maxWidth:   "min(360px, 100%)",
              height:     "min(520px, 100%)",
              boxShadow:  config.theme === "corporate-light"
                ? `0 0 40px var(--accent-color-alpha10, ${config.accentColor}10), 0 24px 64px rgba(0,0,0,0.12)`
                : config.theme === "cyberpunk"
                ? `0 0 40px var(--accent-color-alpha18, ${config.accentColor}18), 0 24px 64px rgba(0,0,0,0.6)`
                : "0 24px 64px rgba(0,0,0,0.4)",
            }}
          >
            {/* Widget header */}
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{
                background: `var(--header-bg, ${t.headerBg})`,
                borderBottom: `1px solid var(--widget-border, ${t.widgetBorder})`,
              }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, var(--accent-color-alpha40, ${config.accentColor}40), var(--accent-color-alpha20, ${config.accentColor}20))`,
                    border:     `1px solid var(--accent-color-alpha40, ${config.accentColor}40)`,
                    boxShadow:  `0 0 10px var(--accent-color-alpha25, ${config.accentColor}25)`,
                  }}
                >
                  <Bot size={14} style={{ color: `var(--accent-color, ${config.accentColor})` }} />
                </div>
                <div>
                  <p className="text-[12px] font-semibold leading-none" style={{ color: `var(--text-color, ${t.text})` }}>
                    {config.name || "Agent"}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        background: isLoading ? `var(--accent-color, ${config.accentColor})` : "#00ff94",
                        animation:  "pulse 2s cubic-bezier(0.4,0,0.6,1) infinite",
                      }}
                    />
                    <p className="text-[10px]" style={{ color: `var(--subtext-color, ${t.subText})` }}>
                      {isLoading ? "Responding…" : "Online"}
                    </p>
                  </div>
                </div>
              </div>
              <MoreHorizontal size={16} style={{ color: `var(--subtext-color, ${t.subText})` }} />
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
                        background: `var(--accent-color-alpha20, ${config.accentColor}20)`,
                        border:     `1px solid var(--accent-color-alpha25, ${config.accentColor}30)`,
                      }}
                    >
                      <Bot size={10} style={{ color: `var(--accent-color, ${config.accentColor})` }} />
                    </div>
                  )}

                  <div className={cn(msg.role === "user" ? "max-w-[85%]" : "max-w-[88%]")}>
                    {msg.role === "assistant" && (
                      <p className="text-[9px] mb-1 font-medium" style={{ color: `var(--subtext-color, ${t.subText})` }}>
                        {config.name}
                      </p>
                    )}
                    <div
                      className={cn(
                        "px-3.5 py-2.5 text-[12px] leading-relaxed whitespace-pre-wrap break-words",
                        msg.role === "user" ? "rounded-2xl rounded-tr-sm" : "rounded-2xl rounded-tl-sm"
                      )}
                      style={{
                        background: msg.role === "user"
                          ? `var(--user-bubble-bg, ${t.userBubbleBg})`
                          : `var(--agent-bubble-bg, ${t.agentBubbleBg})`,
                        color: msg.role === "user"
                          ? `var(--user-bubble-text, ${t.userBubbleText})`
                          : `var(--agent-bubble-text, ${t.agentBubbleText})`,
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
              style={{ borderTop: `1px solid var(--widget-border, ${t.widgetBorder})` }}
            >
              <input
                value={input}
                onChange={handleInputChange}
                placeholder={isLoading ? "Waiting for response…" : "Type a message…"}
                disabled={isLoading}
                className="flex-1 text-[11px] bg-transparent outline-none disabled:opacity-40"
                style={{ color: `var(--text-color, ${t.text})` }}
              />
              <button
                type="submit"
                disabled={!canSend}
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-35 disabled:scale-90"
                style={{
                  background: canSend
                    ? `var(--accent-color, ${config.accentColor})`
                    : "rgba(255,255,255,0.08)",
                  boxShadow:  canSend
                    ? `0 0 10px var(--accent-color-alpha40, ${config.accentColor}40)`
                    : "none",
                }}
              >
                <Send size={10} style={{ color: canSend ? "#050505" : `var(--subtext-color, ${t.subText})` }} />
              </button>
            </form>

            {/* Powered by CyberAgent Studio branding */}
            <div
              className="shrink-0 flex items-center justify-center gap-1.5 py-1.5"
              style={{ borderTop: `1px solid var(--widget-border, ${t.widgetBorder})` }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ opacity: 0.5 }}>
                <circle cx="12" cy="12" r="3" fill={`var(--subtext-color, ${t.subText})`}/>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15v-4H7l5-8v4h4l-5 8z" fill={`var(--subtext-color, ${t.subText})`}/>
              </svg>
              <span style={{ color: `var(--subtext-color, ${t.subText})`, fontSize: '9px', fontWeight: 600, letterSpacing: '0.02em', opacity: 0.6 }}>
                Powered by CyberAgent Studio
              </span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}