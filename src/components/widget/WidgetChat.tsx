"use client";

import { useEffect, useRef, useState } from "react";
import { Send, ChevronDown, X } from "lucide-react";
import { useLiveChat, type ChatMessage } from "@/hooks/useLiveChat";
import { cn } from "@/lib/utils";

interface Props {
  agentId:     string;
  agentName:   string;
  accentColor: string;
}

function BotIcon({ size = 17, color }: { size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <path d="M12 11V7" />
      <circle cx="12" cy="5" r="2" />
      <path d="M8 15h0M16 15h0" />
    </svg>
  );
}

/* ── Live countdown rendered inside the rate-limit bubble ── */
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

/* ── Special bubble for rate-limit messages ── */
function LimitBubble({ msg, agentName, accent }: {
  msg: ChatMessage; agentName: string; accent: string;
}) {
  return (
    <div className="flex items-end gap-2">
      {/* Bot avatar */}
      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
        style={{ background: `${accent}20`, border: `1px solid ${accent}30` }}>
        <BotIcon size={11} color={accent} />
      </div>

      <div className="max-w-[85%]">
        <p className="text-[10px] mb-1 font-semibold text-[#475569]">{agentName}</p>

        <div
          className="px-3.5 py-3 rounded-2xl rounded-tl-sm"
          style={{
            background: "rgba(248,113,113,0.07)",
            border:     "1px solid rgba(248,113,113,0.22)",
          }}
        >
          {/* Icon + heading */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <span style={{ fontSize: 13 }}>🚫</span>
            <p className="text-[12px] font-black text-[#f87171]">Daily Limit Reached</p>
          </div>

          {/* Body */}
          <p className="text-[11px] leading-relaxed text-[#94a3b8]">
            {msg.content}
          </p>

          {/* Live countdown */}
          {msg.resetAt && <LimitCountdown resetAt={msg.resetAt} accent="#f87171" />}
        </div>
      </div>
    </div>
  );
}

export function WidgetChat({ agentId, agentName, accentColor }: Props) {
  const accent = accentColor || "#00f2ff";
  const endRef = useRef<HTMLDivElement>(null);

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
      content: `Hello! I'm ${agentName}. How can I help you today?`,
    }],
  });

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);


  const canSend = input.trim().length > 0 && !isLoading && !isLimitReached;

  return (
    <div className="flex flex-col" style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(5,5,12,0.98)", touchAction: "auto", overflow: "hidden" }}>

      {/* ── Header ── */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 py-3"
        style={{ background: "rgba(0,0,0,0.5)", borderBottom: `1px solid ${accent}20`, boxShadow: `0 1px 0 ${accent}10` }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          style={{ background: `linear-gradient(135deg,${accent}35,${accent}15)`, border: `1px solid ${accent}40`, boxShadow: `0 0 14px ${accent}25` }}
        >
          <BotIcon size={17} color={accent} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#e2e8f0] leading-none truncate">{agentName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                background: isLimitReached ? "#f87171" : isLoading ? accent : "#00ff94",
                animation:  "pulse 2s cubic-bezier(.4,0,.6,1) infinite",
              }}
            />
            <p className="text-[10px] text-[#64748b]">
              {isLimitReached ? "Limit reached" : isLoading ? "Responding…" : "Online"}
            </p>
          </div>
        </div>

        {/* ── Inner close button — raw postMessage to embed.js, SES-safe ── */}
        <button
          onClick={() => { try { window.parent.postMessage({ channel: "nexa-agent", command: "CLOSE" }, "*"); } catch { /**/ } }}
          aria-label="Close chat"
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150"
          style={{
            background:   "rgba(255,255,255,0.06)",
            border:       `1px solid ${accent}20`,
            touchAction:  "manipulation",
            userSelect:   "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background   = `${accent}18`;
            e.currentTarget.style.borderColor  = `${accent}50`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background   = "rgba(255,255,255,0.06)";
            e.currentTarget.style.borderColor  = `${accent}20`;
          }}
        >
          <X size={13} style={{ color: accent }} />
        </button>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ minHeight: 0 }}>
        {messages.map((msg) => {
          /* Rate-limit bubble — special render */
          if (msg.type === "limit") {
            return (
              <LimitBubble key={msg.id} msg={msg} agentName={agentName} accent={accent} />
            );
          }

          return (
            <div key={msg.id} className={cn("flex", msg.role === "user" ? "justify-end" : "items-end gap-2")}>
              {msg.role === "assistant" && (
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: `${accent}20`, border: `1px solid ${accent}30` }}
                >
                  <BotIcon size={11} color={accent} />
                </div>
              )}

              <div className={cn(msg.role === "user" ? "max-w-[82%]" : "max-w-[85%]")}>
                {msg.role === "assistant" && (
                  <p className="text-[10px] mb-1 font-semibold text-[#475569]">{agentName}</p>
                )}
                <div
                  className={cn(
                    "px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap break-words",
                    msg.role === "user" ? "rounded-2xl rounded-tr-sm" : "rounded-2xl rounded-tl-sm"
                  )}
                  style={
                    msg.role === "user"
                      ? { background: accent, color: "#050505", fontWeight: 500 }
                      : { background: "rgba(255,255,255,0.07)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.08)" }
                  }
                >
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator — shown while loading before first assistant chunk */}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex items-end gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
              style={{ background: `${accent}20`, border: `1px solid ${accent}30` }}
            >
              <BotIcon size={11} color={accent} />
            </div>
            <div>
              <p className="text-[10px] mb-1 font-semibold text-[#475569]">{/* name injected via parent */}</p>
              <div
                className="flex items-center gap-1.5 px-3.5 py-3 rounded-2xl rounded-tl-sm"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border:     `1px solid ${accent}18`,
                  boxShadow:  `0 0 12px ${accent}0a`,
                }}
              >
                {[0, 160, 320].map((d) => (
                  <span
                    key={d}
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{
                      background:     accent,
                      opacity:        0.75,
                      animationDelay: `${d}ms`,
                      boxShadow:      `0 0 6px ${accent}90`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* ── Limit System Bar ── */}
      {isLimitReached && (
        <div
          className="shrink-0 mx-4 mb-3 px-4 py-3 rounded-xl"
          style={{
            background:     "rgba(127,29,29,0.28)",
            border:         "1px solid rgba(248,113,113,0.38)",
            backdropFilter: "blur(12px)",
            boxShadow:      "0 0 32px rgba(248,113,113,0.12), inset 0 1px 0 rgba(248,113,113,0.10)",
          }}
        >
          <div className="flex items-start gap-2.5">
            <span style={{ fontSize: 15, lineHeight: "1.4", flexShrink: 0 }}>🚫</span>
            <div className="flex-1 min-w-0">
              <p
                className="text-[10px] font-black tracking-widest uppercase mb-1"
                style={{ color: "#f87171" }}
              >
                Daily Limit Reached
              </p>
              <p className="text-[11px] leading-relaxed break-words" style={{ color: "#fca5a5" }}>
                {limitMessage ?? `You've reached the daily limit. Only 50 messages per day on the Free Plan.`}
              </p>
              {limitResetAt && (
                <LimitCountdown resetAt={limitResetAt} accent="#f87171" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Input ── */}
      <form
        onSubmit={handleSubmit}
        className="shrink-0 flex items-center gap-2.5 px-4 py-3"
        style={{
          borderTop:  `1px solid ${isLimitReached ? "rgba(248,113,113,0.2)" : `${accent}18`}`,
          background: "rgba(0,0,0,0.3)",
        }}
      >
        <input
          value={input}
          onChange={handleInputChange}
          placeholder={
            isLimitReached ? "Daily limit reached — upgrade to continue" :
            isLoading      ? "Waiting…" :
                             "Type a message…"
          }
          disabled={isLoading || isLimitReached}
          className="flex-1 bg-transparent text-[13px] text-[#e2e8f0] outline-none placeholder:text-[#334155] disabled:opacity-50"
          style={{ touchAction: "auto" }}
        />
        <button
          type="submit"
          disabled={!canSend}
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-35"
          style={{
            background: canSend ? accent : "rgba(255,255,255,0.08)",
            boxShadow:  canSend ? `0 0 12px ${accent}50` : "none",
          }}
        >
          <Send size={13} style={{ color: canSend ? "#050505" : "#475569" }} />
        </button>
      </form>

      {/* ── "Powered by" footer ── */}
      <div
        className="shrink-0 flex items-center justify-center gap-1.5 py-2"
        style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
      >
        <BotIcon size={10} color="#475569" />
        <span
          className="text-[9px] font-bold tracking-[0.08em] uppercase"
          style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
        >
          Developed by CyberAgent
        </span>
      </div>
    </div>
  );
}
