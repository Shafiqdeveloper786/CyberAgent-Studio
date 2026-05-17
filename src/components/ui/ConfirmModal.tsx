"use client";

import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

interface Props {
  open:          boolean;
  title:         string;
  description:   string;
  confirmLabel?: string;
  danger?:       boolean;
  onConfirm:     () => void;
  onCancel:      () => void;
}

/**
 * Glassmorphic confirmation modal.
 * Close on Escape, close on backdrop click.
 */
export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  danger       = true,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  const accent = danger ? "#f87171" : "#00f2ff";
  const accentHex = danger ? "248,113,113" : "0,242,255";

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">

      {/* Blurred backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)" }}
        onClick={onCancel}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-sm rounded-2xl p-6"
        style={{
          background:     "rgba(6,6,18,0.97)",
          border:         `1px solid rgba(${accentHex},0.18)`,
          boxShadow: [
            `0 0 0 1px rgba(${accentHex},0.08)`,
            `0 0 60px rgba(${accentHex},0.12)`,
            "0 24px 64px rgba(0,0,0,0.65)",
            `inset 0 1px 0 rgba(${accentHex},0.12)`,
          ].join(","),
          backdropFilter: "blur(24px)",
        }}
      >
        {/* Top shimmer */}
        <div
          className="absolute top-0 left-6 right-6 h-px rounded-full"
          style={{ background: `linear-gradient(90deg, transparent, rgba(${accentHex},0.6), transparent)` }}
        />

        {/* Close X */}
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: "#334155" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#64748b")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#334155")}
        >
          <X size={14} />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{
              background: `rgba(${accentHex},0.10)`,
              border:     `1px solid rgba(${accentHex},0.25)`,
              boxShadow:  `0 0 20px rgba(${accentHex},0.15)`,
            }}
          >
            <AlertTriangle size={22} style={{ color: accent }} />
          </div>
        </div>

        {/* Text */}
        <h3 className="text-[15px] font-bold text-[#e2e8f0] text-center mb-2 leading-snug">
          {title}
        </h3>
        <p className="text-[12px] text-[#64748b] text-center leading-relaxed mb-6">
          {description}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150"
            style={{
              background: "rgba(255,255,255,0.05)",
              border:     "1px solid rgba(255,255,255,0.08)",
              color:      "#64748b",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-150"
            style={{
              background: `rgba(${accentHex},0.12)`,
              border:     `1px solid rgba(${accentHex},0.35)`,
              color:      accent,
              boxShadow:  `0 0 16px rgba(${accentHex},0.12)`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `rgba(${accentHex},0.20)`;
              e.currentTarget.style.boxShadow  = `0 0 24px rgba(${accentHex},0.22)`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `rgba(${accentHex},0.12)`;
              e.currentTarget.style.boxShadow  = `0 0 16px rgba(${accentHex},0.12)`;
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
