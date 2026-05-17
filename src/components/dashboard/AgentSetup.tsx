"use client";

import { useCallback, useState } from "react";
import { FileText, Upload, ChevronDown, Save, RefreshCw, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useAgentStore } from "@/store/agentStore";
import { cn } from "@/lib/utils";

const PERSONAS = [
  "Tech Support Expert",
  "Sales Assistant",
  "Customer Service Rep",
  "HR Assistant",
  "Medical Advisor",
  "Legal Consultant",
];

interface Props {
  onSaved?: () => void;
}

/* Reusable gradient section heading */
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

export function AgentSetup({ onSaved }: Props) {
  const { config, update, activeAgentId, setActiveAgentId, loadAgent } = useAgentStore();
  const { data: session } = useSession();

  const [dragging,     setDragging]     = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [personaOpen,  setPersonaOpen]  = useState(false);
  const [saving,       setSaving]       = useState(false);

  /* Only 1 PDF allowed */
  const handleFile = useCallback((file: File | undefined) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF files are accepted here.");
      return;
    }
    setUploadedFile(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 1) {
      toast.error("Only 1 PDF file is allowed per agent.");
      return;
    }
    handleFile(files[0]);
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    if (files.length > 1) {
      toast.error("Only 1 PDF file is allowed per agent.");
      return;
    }
    handleFile(files[0]);
    /* Reset input so the same file can be re-selected after removal */
    e.target.value = "";
  }, [handleFile]);

  const handleSave = async () => {
    if (!config.name.trim()) {
      toast.error("Agent name is required.");
      return;
    }
    setSaving(true);

    const isUpdate = !!activeAgentId;
    const url      = isUpdate ? `/api/agents/${activeAgentId}` : "/api/agents";
    const method   = isUpdate ? "PATCH" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:           config.name,
          persona:        config.persona,
          themeColor:     config.accentColor,
          welcomeMessage: config.welcomeMessage,
        }),
      });

      const data = await res.json() as {
        agent?: { _id: string; name: string; persona: string; themeColor: string };
        error?: string;
      };

      if (!res.ok) {
        toast.error(data.error ?? "Failed to save agent.");
      } else {
        toast.success(isUpdate ? `"${config.name}" updated.` : `"${config.name}" saved!`);
        if (!isUpdate && data.agent?._id) {
          /* Bind the new agent to the global store immediately so Knowledge Base,
             Analytics, and Embed Code pages are usable without a manual card click. */
          loadAgent({
            _id:        data.agent._id,
            name:       data.agent.name       ?? config.name,
            persona:    data.agent.persona    ?? config.persona,
            themeColor: data.agent.themeColor ?? config.accentColor,
          });
        }
        onSaved?.();
      }
    } catch {
      toast.error("Network error — please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-5">
      <style>{`
        @keyframes drop-pulse {
          0%,100% { border-color: rgba(0,242,255,0.22); box-shadow: none; }
          50%     { border-color: rgba(0,242,255,0.55); box-shadow: 0 0 22px rgba(0,242,255,0.12), 0 0 6px rgba(0,242,255,0.06) inset; }
        }
        @keyframes drop-active {
          0%,100% { box-shadow: 0 0 30px rgba(0,242,255,0.15) inset, 0 0 30px rgba(0,242,255,0.07); }
          50%     { box-shadow: 0 0 55px rgba(0,242,255,0.3)  inset, 0 0 55px rgba(0,242,255,0.15); }
        }
      `}</style>
      <SectionHeading>Agent Setup</SectionHeading>

      {/* Agent Name */}
      <div className="space-y-2">
        <label className="block text-[12px] font-medium text-[#94a3b8]">Agent Name</label>
        <input
          type="text"
          value={config.name}
          onChange={(e) => update({ name: e.target.value })}
          className={cn(
            "w-full px-3 py-2.5 rounded-lg text-[13px] text-[#e2e8f0] outline-none transition-all",
            "placeholder:text-[#334155] focus:ring-1 focus:ring-[rgba(0,242,255,0.4)]"
          )}
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          placeholder="e.g. Nexa"
        />
      </div>

      {/* Agent Persona */}
      <div className="space-y-2">
        <label className="block text-[12px] font-medium text-[#94a3b8]">Agent Persona</label>
        <div className="relative">
          <button
            onClick={() => setPersonaOpen((v) => !v)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[13px] text-[#e2e8f0] transition-all",
              personaOpen && "ring-1 ring-[rgba(0,242,255,0.4)]"
            )}
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <span>{config.persona}</span>
            <ChevronDown size={14} className={cn("text-[#64748b] transition-transform duration-200", personaOpen && "rotate-180")} />
          </button>

          {personaOpen && (
            <div
              className="absolute z-20 top-full mt-1.5 w-full rounded-lg overflow-hidden shadow-xl"
              style={{ background: "#0f0f14", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              {PERSONAS.map((p) => (
                <button
                  key={p}
                  onClick={() => { update({ persona: p }); setPersonaOpen(false); }}
                  className={cn(
                    "w-full text-left px-3 py-2.5 text-[13px] transition-colors",
                    config.persona === p
                      ? "text-[#00f2ff] bg-[rgba(0,242,255,0.06)]"
                      : "text-[#94a3b8] hover:bg-white/[0.04] hover:text-[#e2e8f0]"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Knowledge Base Upload */}
      <div className="space-y-2">
        <SectionHeading>Knowledge Base Upload</SectionHeading>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !uploadedFile && document.getElementById("kb-upload")?.click()}
          className={cn(
            "relative flex flex-col items-center justify-center gap-3 px-4 py-7 rounded-xl transition-all duration-300",
            !uploadedFile && "cursor-pointer",
          )}
          style={{
            background: dragging
              ? "rgba(0,242,255,0.06)"
              : uploadedFile
                ? "rgba(0,242,255,0.03)"
                : "rgba(255,255,255,0.02)",
            border: dragging
              ? "1.5px dashed rgba(0,242,255,0.75)"
              : uploadedFile
                ? "1px solid rgba(0,242,255,0.28)"
                : "1.5px dashed rgba(0,242,255,0.22)",
            boxShadow: dragging
              ? "0 0 50px rgba(0,242,255,0.18) inset, 0 0 40px rgba(0,242,255,0.09)"
              : "none",
            animation: !uploadedFile && !dragging
              ? "drop-pulse 2.6s ease-in-out infinite"
              : dragging
                ? "drop-active 1.1s ease-in-out infinite"
                : "none",
          }}
        >
          <input
            id="kb-upload"
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleInputChange}
          />

          {uploadedFile ? (
            <div className="flex items-center justify-between w-full px-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(0,242,255,0.1)", border: "1px solid rgba(0,242,255,0.25)" }}
                >
                  <FileText size={15} className="text-[#00f2ff]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[12px] font-medium text-[#00f2ff] truncate max-w-[160px]">
                    {uploadedFile.name}
                  </p>
                  <p className="text-[10px] text-[#334155]">
                    {(uploadedFile.size / 1024).toFixed(0)} KB · PDF
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setUploadedFile(null); }}
                className="shrink-0 ml-2 w-6 h-6 rounded-full flex items-center justify-center text-[#475569] hover:text-red-400 hover:bg-red-400/10 transition-all"
                title="Remove file"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(0,242,255,0.08)", border: "1px solid rgba(0,242,255,0.18)" }}
              >
                <Upload size={16} className="text-[#00f2ff]" />
              </div>
              <div className="text-center">
                <p className="text-[12px] text-[#64748b]">
                  Drag & drop your PDF here
                </p>
                <p className="text-[11px] text-[#334155] mt-0.5">
                  or <span className="text-[#00f2ff] underline decoration-dotted">click to browse</span>
                </p>
                <p
                  className="text-[10px] font-bold mt-1.5 tracking-wide"
                  style={{ color: "#f97316", textShadow: "0 0 10px rgba(249,115,22,0.35)" }}
                >
                  PDF only · Max 1 file per agent
                </p>
              </div>
            </>
          )}
        </div>

        {/* Instructional note — colorful card */}
        <div
          className="relative rounded-xl px-4 py-3.5 space-y-1.5 overflow-hidden"
          style={{
            background: "linear-gradient(135deg,rgba(0,242,255,0.05),rgba(168,85,247,0.05))",
            border:     "1px solid rgba(0,242,255,0.18)",
          }}
        >
          {/* Glow line top */}
          <div
            className="absolute top-0 left-4 right-4 h-px"
            style={{ background: "linear-gradient(90deg,rgba(0,242,255,0.5),rgba(168,85,247,0.4),transparent)" }}
          />

          {/* Badge row */}
          <div className="flex items-center gap-2">
            <span className="text-[10px]">📌</span>
            <span
              className="text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full"
              style={{
                background:           "linear-gradient(90deg,rgba(0,242,255,0.15),rgba(168,85,247,0.15))",
                border:               "1px solid rgba(0,242,255,0.3)",
                color:                "#00f2ff",
              }}
            >
              Note
            </span>
          </div>

          {/* Body text */}
          <p className="text-[11px] leading-relaxed" style={{ color: "#94a3b8" }}>
            <span className="italic">
              This PDF provides the agent&apos;s{" "}
              <span
                style={{
                  background:           "linear-gradient(90deg,#00f2ff,#a855f7)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor:  "transparent",
                  fontWeight:           600,
                  fontStyle:            "normal",
                }}
              >
                core context &amp; overview
              </span>
              .
            </span>{" "}
            <span className="text-[#64748b]">
              Comprehensive training happens in the
            </span>{" "}
            <span
              className="font-bold not-italic"
              style={{
                background:           "linear-gradient(90deg,#a855f7,#ec4899)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor:  "transparent",
              }}
            >
              Knowledge Base
            </span>{" "}
            <span className="text-[#64748b]">tab.</span>
          </p>
        </div>
      </div>

      {/* Save / Update button */}
      <div className="pt-1">
        {session?.user ? (
          <button
            onClick={handleSave}
            disabled={saving || !config.name.trim()}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg",
              "text-[13px] font-semibold tracking-wide transition-all duration-200",
              "active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            )}
            style={{
              background: saving
                ? "rgba(0,242,255,0.06)"
                : "linear-gradient(90deg,rgba(0,242,255,0.18),rgba(168,85,247,0.18))",
              border:    "1px solid rgba(0,242,255,0.28)",
              color:     "#00f2ff",
              boxShadow: saving ? "none" : "0 0 22px rgba(0,242,255,0.1)",
            }}
          >
            {saving
              ? <><RefreshCw size={13} className="animate-spin" />{activeAgentId ? "Updating…" : "Saving…"}</>
              : <><Save size={13} />{activeAgentId ? "Update Agent" : "Save Agent"}</>
            }
          </button>
        ) : (
          <p className="text-center text-[11px] text-[#334155] py-1">
            Sign in to save your agent
          </p>
        )}
      </div>
    </section>
  );
}
