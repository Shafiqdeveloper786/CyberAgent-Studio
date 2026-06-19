"use client";

import { useCallback, useRef } from "react";
import { useAgentStore, type Theme } from "@/store/agentStore";
import { cn } from "@/lib/utils";

const ACCENT_COLORS = [
  "#2563eb", // Corporate Blue
  "#0ea5e9", // Sky Blue
  "#0284c7", // Deep Water Blue
  "#4f46e5", // Indigo
  "#0d9488", // Teal
];

const THEMES: { id: Theme; label: string; bg: string; border: string; preview: string }[] = [
  {
    id:      "cyberpunk",
    label:   "Cyberpunk",
    bg:      "linear-gradient(135deg, #0f172a, #1e293b)",
    border:  "#334155",
    preview: "#38bdf8",
  },
  {
    id:      "minimal-dark",
    label:   "Minimal Dark",
    bg:      "linear-gradient(135deg, #18181b, #27272a)",
    border:  "#3f3f46",
    preview: "#a1a1aa",
  },
  {
    id:      "corporate-light",
    label:   "Corporate Light",
    bg:      "linear-gradient(135deg, #f8fafc, #e2e8f0)",
    border:  "#cbd5e1",
    preview: "#0f172a",
  },
];

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-[11px] font-bold tracking-[0.06em] uppercase text-slate-400">
        {children}
      </h3>
      <div className="h-px bg-slate-100 w-full" />
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
    <section className="space-y-4">
      <SectionHeading>Widget Interface Customization</SectionHeading>

      {/* Accent Color Selection Section */}
      <div className="space-y-2">
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Accent Color</label>
        <div className="flex items-center gap-2">
          {ACCENT_COLORS.map((color) => {
            const isSelected = config.accentColor === color;
            return (
              <button
                key={color}
                onClick={() => setColor(color)}
                title={color}
                className={cn(
                  "w-7 h-7 rounded-lg transition-all duration-150 active:scale-95 focus:outline-none border shadow-sm cursor-pointer",
                  isSelected ? "border-slate-800 scale-105" : "border-transparent hover:scale-105"
                )}
                style={{
                  backgroundColor: color,
                  boxShadow: isSelected ? `0 0 0 2px #white, 0 0 0 3px ${color}` : undefined
                }}
                aria-label={`Accent color ${color}`}
              />
            );
          })}

          {/* Custom Native Color Picker Block */}
          <div className="relative w-7 h-7">
            <input
              type="color"
              value={config.accentColor}
              onChange={(e) => setColor(e.target.value)}
              className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            />
            <div className="w-7 h-7 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-[13px] text-slate-500 font-bold shadow-sm transition-colors cursor-pointer">
              +
            </div>
          </div>
        </div>

        {/* Selected Accent Status Meta Matrix */}
        <div className="flex items-center gap-2 pt-0.5">
          <div
            className="w-3.5 h-3.5 rounded border border-slate-200 shadow-sm"
            style={{ backgroundColor: config.accentColor }}
          />
          <code className="text-[10px] font-mono text-slate-500 font-semibold uppercase tracking-wider">{config.accentColor}</code>
          {activeAgentId && (
            <span className="text-[10px] text-emerald-600 font-medium ml-1">✓ Cloud Synchronized</span>
          )}
        </div>
      </div>

      {/* Interface Layout Theme Grid Selection Section */}
      <div className="space-y-2">
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Theme Engine</label>
        <div className="grid grid-cols-3 gap-2.5">
          {THEMES.map(({ id, label, bg, border, preview }) => {
            const isSelected = config.theme === id;
            return (
              <button
                key={id}
                onClick={() => setTheme(id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-2.5 rounded-xl transition-all border outline-none bg-white text-left cursor-pointer",
                  isSelected 
                    ? "border-slate-800 bg-slate-50/50 shadow-sm" 
                    : "border-slate-200 hover:border-slate-300"
                )}
              >
                {/* Visual Canvas Mock-up Preview Structure */}
                <div
                  className="w-full h-10 rounded-lg border shadow-inner overflow-hidden relative"
                  style={{ background: bg, borderColor: border }}
                >
                  <div className="flex flex-col h-full p-1.5 gap-1 justify-end">
                    <div className="h-1 w-3/4 rounded-full self-end" style={{ backgroundColor: preview }} />
                    <div className="h-1 w-1/2 rounded-full" style={{ backgroundColor: id === "corporate-light" ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.1)" }} />
                  </div>
                </div>
                <span className={cn(
                  "text-[11px] font-semibold tracking-tight transition-colors",
                  isSelected ? "text-slate-800" : "text-slate-500"
                )}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Corporate Notification Information Message Box */}
      <div className="flex items-start gap-3 px-3.5 py-3 rounded-xl bg-amber-50/70 border border-amber-100">
        <span className="text-sm leading-none shrink-0 text-amber-600">ⓘ</span>
        <p className="text-[11px] leading-relaxed text-amber-800">
          <span className="font-bold">Deployment Notice:</span> Please remember to dispatch execution via the{" "}
          <span className="font-bold text-slate-900">&quot;Update Agent&quot;</span> interaction window pipeline control matrix to push configuration schema revisions live down to embedded instances immediately.
        </p>
      </div>
    </section>
  );
}