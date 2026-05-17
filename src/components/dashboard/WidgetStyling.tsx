"use client";

import { useCallback, useRef } from "react";
import { useAgentStore, type Theme } from "@/store/agentStore";
import { cn } from "@/lib/utils";

const ACCENT_COLORS = [
  "#00f2ff",
  "#06b6d4",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
];

const THEMES: { id: Theme; label: string; bg: string; border: string; preview: string }[] = [
  {
    id:      "cyberpunk",
    label:   "Cyberpunk",
    bg:      "linear-gradient(135deg, #0a0a1a, #0d1117)",
    border:  "rgba(0,242,255,0.4)",
    preview: "#00f2ff",
  },
  {
    id:      "minimal-dark",
    label:   "Minimal Dark",
    bg:      "linear-gradient(135deg, #18181b, #27272a)",
    border:  "rgba(255,255,255,0.12)",
    preview: "#71717a",
  },
  {
    id:      "corporate-light",
    label:   "Corporate Light",
    bg:      "linear-gradient(135deg, #f8fafc, #e2e8f0)",
    border:  "rgba(0,0,0,0.12)",
    preview: "#0f172a",
  },
];

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
      <div
        style={{
          height:     1,
          background: "linear-gradient(90deg,rgba(0,242,255,0.45),rgba(168,85,247,0.2),transparent)",
        }}
      />
    </div>
  );
}

export function WidgetStyling() {
  const { config, update, activeAgentId } = useAgentStore();

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(
    (patch: { themeColor?: string; theme?: string }) => {
      if (!activeAgentId) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        fetch(`/api/agents/${activeAgentId}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(patch),
        }).catch(() => { /* persist failed — silently ignored in production */ });
      }, 400);
    },
    [activeAgentId]
  );

  const setColor = (color: string) => {
    update({ accentColor: color });
    persist({ themeColor: color });
  };

  const setTheme = (theme: Theme) => {
    update({ theme });
    persist({ theme });
  };

  return (
    <section className="space-y-5">
      <SectionHeading>Widget Styling</SectionHeading>

      {/* Accent Color */}
      <div className="space-y-2">
        <label className="block text-[12px] font-medium text-[#94a3b8]">Accent Color</label>
        <div className="flex items-center gap-2">
          {ACCENT_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setColor(color)}
              title={color}
              className="w-7 h-7 rounded-md transition-all duration-150 hover:scale-110 focus:outline-none"
              style={{
                background: color,
                boxShadow:  config.accentColor === color
                  ? `0 0 0 2px #050505, 0 0 0 4px ${color}, 0 0 12px ${color}60`
                  : `0 0 8px ${color}30`,
              }}
              aria-label={`Accent color ${color}`}
            />
          ))}

          {/* Custom color picker */}
          <div className="relative w-7 h-7">
            <input
              type="color"
              value={config.accentColor}
              onChange={(e) => setColor(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
            <div
              className="w-7 h-7 rounded-md border border-white/10 flex items-center justify-center text-[10px] text-[#64748b] hover:border-white/20 transition-colors"
              style={{ background: `${config.accentColor}20` }}
            >
              +
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ background: config.accentColor, boxShadow: `0 0 8px ${config.accentColor}50` }}
          />
          <code className="text-[10px] text-[#475569]">{config.accentColor}</code>
          {activeAgentId && (
            <span className="text-[10px] text-[#00ff94]">✓ saved to agent</span>
          )}
        </div>
      </div>

      {/* Theme */}
      <div className="space-y-2">
        <label className="block text-[12px] font-medium text-[#94a3b8]">Theme</label>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map(({ id, label, bg, border, preview }) => (
            <button
              key={id}
              onClick={() => setTheme(id)}
              className={cn(
                "flex flex-col items-center gap-2 p-3 rounded-lg transition-all duration-150",
                config.theme === id ? "ring-1" : "hover:bg-white/[0.03]"
              )}
              style={{
                border:     config.theme === id
                  ? `1px solid ${border}`
                  : "1px solid rgba(255,255,255,0.06)",
                background: config.theme === id
                  ? `${border.replace("0.4", "0.05")}`
                  : "transparent",
                boxShadow:  config.theme === id
                  ? `0 0 12px ${border.replace("0.4", "0.15")}`
                  : "none",
              }}
            >
              <div
                className="w-full h-9 rounded"
                style={{ background: bg, border: `1px solid ${border.replace("0.4", "0.2")}` }}
              >
                <div className="flex flex-col h-full p-1 gap-0.5 justify-end">
                  <div className="h-1.5 w-3/4 rounded-full self-end" style={{ background: preview, opacity: 0.8 }} />
                  <div className="h-1.5 w-1/2 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
                </div>
              </div>
              <span className="text-[11px] text-[#64748b]">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ⚠️ Red alert note */}
      <div
        className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl"
        style={{
          background: "rgba(239,68,68,0.06)",
          border:     "1px solid rgba(239,68,68,0.22)",
        }}
      >
        <span className="text-base leading-none mt-0.5 shrink-0">⚠️</span>
        <p className="text-[11px] leading-relaxed" style={{ color: "#fca5a5" }}>
          <span className="font-bold">Important:</span> Click{" "}
          <span
            className="font-semibold"
            style={{
              background:           "linear-gradient(90deg,#00f2ff,#a855f7)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor:  "transparent",
            }}
          >
            &quot;Update Agent&quot;
          </span>{" "}
          to apply and sync these styling changes to your live widget.
        </p>
      </div>
    </section>
  );
}
