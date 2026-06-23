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

/* Reusable clean section heading matching Image layout guidelines */
function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-1.5 pb-1">
      <h3 className="text-[11px] font-bold tracking-[0.05em] uppercase text-slate-400">
        {children}
      </h3>
      <div className="h-px bg-slate-100 w-full" />
    </div>
  );
}

export function AgentSetup({ onSaved }: Props) {
  const { config, update, activeAgentId, loadAgent } = useAgentStore();
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
          theme:          config.theme,
          welcomeMessage: config.welcomeMessage,
        }),
      });

      const data = await res.json() as {
        agent?: { _id: string; name: string; persona: string; themeColor: string; theme?: any; welcomeMessage?: string };
        error?: string;
      };

      if (!res.ok) {
        toast.error(data.error ?? "Failed to save agent.");
      } else {
        toast.success(isUpdate ? `"${config.name}" updated.` : `"${config.name}" saved!`);
        if (!isUpdate && data.agent?._id) {
          loadAgent({
            _id:        data.agent._id,
            name:       data.agent.name       ?? config.name,
            persona:    data.agent.persona    ?? config.persona,
            themeColor: data.agent.themeColor ?? config.accentColor,
            theme:      data.agent.theme      ?? config.theme,
            welcomeMessage: data.agent.welcomeMessage ?? config.welcomeMessage,
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
    <section className="space-y-5 bg-white p-1 rounded-xl">
      <SectionHeading>Agent Setup</SectionHeading>

      {/* Agent Name */}
      <div className="space-y-1.5">
        <label className="block text-[12px] font-semibold text-slate-700">Agent Name</label>
        <input
          type="text"
          value={config.name}
          onChange={(e) => update({ name: e.target.value })}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-white outline-none focus:border-blue-500 transition-all placeholder:text-slate-400"
          placeholder="e.g. Nexa"
        />
      </div>

      {/* Agent Persona */}
      <div className="space-y-1.5">
        <label className="block text-[12px] font-semibold text-slate-700">Agent Persona</label>
        <div className="relative">
          <button
            onClick={() => setPersonaOpen((v) => !v)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 border border-slate-200 rounded-lg text-[13px] text-slate-800 bg-white transition-all text-left",
              personaOpen && "border-blue-500 ring-1 ring-blue-500/10"
            )}
          >
            <span>{config.persona}</span>
            <ChevronDown size={14} className={cn("text-slate-400 transition-transform duration-200", personaOpen && "rotate-180")} />
          </button>

          {personaOpen && (
            <div className="absolute z-20 top-full mt-1 w-full rounded-lg bg-white border border-slate-200 shadow-lg max-h-60 overflow-y-auto">
              {PERSONAS.map((p) => (
                <button
                  key={p}
                  onClick={() => { update({ persona: p }); setPersonaOpen(false); }}
                  className={cn(
                    "w-full text-left px-3 py-2 text-[13px] transition-colors",
                    config.persona === p
                      ? "text-blue-600 bg-blue-50/50 font-medium"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
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
      <div className="space-y-3">
        <SectionHeading>Knowledge Base Upload</SectionHeading>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !uploadedFile && document.getElementById("kb-upload")?.click()}
          className={cn(
            "relative flex flex-col items-center justify-center gap-3 px-4 py-6 border border-dashed rounded-xl transition-all duration-200 bg-slate-50/50",
            dragging ? "border-blue-500 bg-blue-50/30" : "border-slate-200",
            !uploadedFile && "cursor-pointer hover:bg-slate-50"
          )}
        >
          <input
            id="kb-upload"
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={handleInputChange}
          />

          {uploadedFile ? (
            <div className="flex items-center justify-between w-full px-1">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-blue-50 border border-blue-100">
                  <FileText size={16} className="text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-slate-800 truncate max-w-[180px]">
                    {uploadedFile.name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {(uploadedFile.size / 1024).toFixed(0)} KB · PDF
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setUploadedFile(null); }}
                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                title="Remove file"
              >
                <X size={13} />
              </button>
            </div>
          ) : (
            <>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-white border border-slate-200 shadow-sm text-slate-500">
                <Upload size={15} />
              </div>
              <div className="text-center">
                <p className="text-[12px] font-medium text-slate-600">
                  Drag & drop your PDF here
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  or <span className="text-blue-600 font-medium hover:underline">click to browse</span>
                </p>
                <p className="text-[10px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full inline-block mt-2 border border-amber-100">
                  PDF only · Max 1 file per agent
                </p>
              </div>
            </>
          )}
        </div>

        {/* Informational Callout Card */}
        <div className="rounded-xl px-4 py-3 bg-slate-50 border border-slate-100 space-y-1">
          <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-[11px] tracking-wide uppercase">
            <span>📌</span>
            <span>Note</span>
          </div>
          <p className="text-[12px] text-slate-500 leading-relaxed">
            This PDF provides the agent's <span className="font-semibold text-slate-700">core context & overview</span>. Comprehensive training happens inside the <span className="font-semibold text-blue-600">Knowledge Base</span> tab.
          </p>
        </div>
      </div>

      {/* Save / Update Button (Matches Core Action Elements from Image) */}
      <div className="pt-2">
        {session?.user ? (
          <button
            onClick={handleSave}
            disabled={saving || !config.name.trim()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#2563eb] text-white hover:bg-[#1d4ed8] text-[13px] font-semibold transition-all duration-150 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 shadow-sm"
          >
            {saving ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                {activeAgentId ? "Updating…" : "Saving…"}
              </>
            ) : (
              <>
                <Save size={14} />
                {activeAgentId ? "Update Agent" : "Save Agent"}
              </>
            )}
          </button>
        ) : (
          <p className="text-center text-[12px] text-slate-400 bg-slate-50 border border-slate-100 rounded-lg py-2 font-medium">
            Sign in to save your agent
          </p>
        )}
      </div>
    </section>
  );
}