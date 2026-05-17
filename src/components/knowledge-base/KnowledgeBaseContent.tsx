"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Link2, Upload, Trash2,
  CheckCircle2, Search, Plus, RefreshCw, Bot,
  Sparkles, Globe, Zap,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useAgentStore } from "@/store/agentStore";
import { cn } from "@/lib/utils";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

/* ── Types ─────────────────────────────────────── */
interface KBSource {
  _id:       string;
  fileName:  string;
  fileType:  "pdf" | "docx" | "doc" | "txt" | "md" | "url";
  fileSize:  number;
  fileUrl:   string;
  createdAt: string;
}

const FILE_STYLE: Record<string, { bg: string; border: string; color: string }> = {
  pdf:  { bg: "rgba(239,68,68,0.1)",   border: "rgba(239,68,68,0.3)",   color: "#f87171" },
  docx: { bg: "rgba(37,99,235,0.1)",   border: "rgba(37,99,235,0.3)",   color: "#60a5fa" },
  doc:  { bg: "rgba(37,99,235,0.1)",   border: "rgba(37,99,235,0.3)",   color: "#60a5fa" },
  txt:  { bg: "rgba(59,130,246,0.1)",  border: "rgba(59,130,246,0.3)",  color: "#93c5fd" },
  md:   { bg: "rgba(234,179,8,0.1)",   border: "rgba(234,179,8,0.3)",   color: "#facc15" },
  url:  { bg: "rgba(168,85,247,0.1)",  border: "rgba(168,85,247,0.3)",  color: "#c084fc" },
};

function fmtSize(b: number): string {
  if (!b) return "—";
  return b >= 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;
}

/* ── Gradient Heading ────────────────────────────── */
function GradientHeading({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        background:           "linear-gradient(90deg,#00f2ff 0%,#a855f7 60%,#ec4899 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor:  "transparent",
        filter:               "drop-shadow(0 0 12px rgba(0,242,255,0.3))",
      }}
    >
      {children}
    </span>
  );
}

/* ── Progress bar ────────────────────────────────── */
function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7)", boxShadow: "0 0 8px rgba(0,242,255,0.6)" }}
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ ease: "easeOut", duration: 0.25 }}
      />
    </div>
  );
}

/* ── No-agent banner ─────────────────────────────── */
function NoAgentBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-4 py-20 text-center"
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: "rgba(0,242,255,0.07)", border: "1px solid rgba(0,242,255,0.15)", boxShadow: "0 0 30px rgba(0,242,255,0.08)" }}
      >
        <Bot size={26} className="text-[#00f2ff] opacity-60" />
      </div>
      <p className="text-[15px] font-semibold text-[#475569]">No agent found</p>
      <p className="text-[12px] text-[#334155] max-w-[300px] leading-relaxed">
        Go to{" "}
        <span
          style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 600 }}
        >
          Agent Space
        </span>
        {" "}and create your agent. It will be automatically selected and ready for knowledge upload.
      </p>
    </motion.div>
  );
}

/* ── Allowed upload types — extension + MIME, OR-gated.
   Browsers sometimes return file.type="" for .docx when the OOXML MIME
   type is not registered in the OS MIME database.  The OR gate means a
   file named "report.docx" with an empty type still passes via extension. ── */
const ALLOWED_EXTENSIONS = ["pdf", "docx", "doc", "txt", "md"] as const;
const ALLOWED_MIME_TYPES  = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
  "text/markdown",
  "application/octet-stream", // fallback MIME some OSes emit for .docx
]);

/* ═══════════════════════════════════════════════════
   Main Component
═══════════════════════════════════════════════════ */
export function KnowledgeBaseContent() {
  const { data: session }         = useSession();
  const { activeAgentId, config } = useAgentStore();

  const [sources,  setSources]  = useState<KBSource[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [dragging, setDragging] = useState(false);
  const [url,      setUrl]      = useState("");
  const [search,   setSearch]   = useState("");
  const [deleting,       setDeleting]       = useState<string | null>(null);
  const [pendingDelete,  setPendingDelete]  = useState<{ id: string; name: string } | null>(null);
  const [urlFocused, setUrlFocused] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasActiveUploads = Object.values(uploadProgress).some((v) => v < 100);

  /* ── Fetch sources ── */
  const fetchSources = useCallback(async () => {
    if (!activeAgentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/knowledge?agentId=${activeAgentId}`);
      if (res.ok) {
        const data = await res.json() as { sources: KBSource[] };
        setSources(data.sources ?? []);
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [activeAgentId]);

  useEffect(() => { setSources([]); fetchSources(); }, [fetchSources]);

  /* ── Upload file ── */
  const uploadFile = useCallback(async (file: File) => {
    if (!activeAgentId) { toast.error("Select an agent first."); return; }

    /* ── Extension + MIME validation (OR-gated)
       Browsers sometimes return file.type="" for .docx files when the
       OOXML MIME type is not registered in the OS MIME database.
       Using OR means the upload proceeds if EITHER check passes —
       a file named "report.docx" with type="" will clear the ext gate. ── */
    const fileExtension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const extAllowed  = ALLOWED_EXTENSIONS.includes(fileExtension as typeof ALLOWED_EXTENSIONS[number]);
    const mimeAllowed = file.type === "" || ALLOWED_MIME_TYPES.has(file.type);

    if (!extAllowed && !mimeAllowed) {
      console.error("[KnowledgeBase] Rejected file — unsupported type:", file.type, "ext:", fileExtension);
      toast.error(`Unsupported format ".${fileExtension || file.type}". Please upload PDF, DOCX, DOC, TXT, or MD files.`);
      return;
    }

    if (file.size > 10 * 1_048_576) { toast.error(`"${file.name}" exceeds 10 MB.`); return; }

    const tmpId = `tmp-${Math.random().toString(36).slice(2)}`;
    const optimistic: KBSource = {
      _id: tmpId, fileName: file.name,
      fileType: (ALLOWED_EXTENSIONS.includes(fileExtension as typeof ALLOWED_EXTENSIONS[number]) ? fileExtension : "txt") as KBSource["fileType"],
      fileSize: file.size, fileUrl: "", createdAt: new Date().toISOString(),
    };
    setSources((p) => [optimistic, ...p]);
    setUploadProgress((p) => ({ ...p, [tmpId]: 0 }));

    const tick = setInterval(() => {
      setUploadProgress((p) => ({ ...p, [tmpId]: Math.min((p[tmpId] ?? 0) + 10, 82) }));
    }, 200);

    try {
      const fd = new FormData();
      fd.append("agentId", activeAgentId);
      fd.append("file", file);
      const res = await fetch("/api/knowledge", { method: "POST", body: fd });
      clearInterval(tick);

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        toast.error(err.error ?? "Upload failed.");
        setSources((p) => p.filter((s) => s._id !== tmpId));
      } else {
        const data = await res.json() as { doc: KBSource };
        setUploadProgress((p) => ({ ...p, [tmpId]: 100 }));
        setSources((p) => p.map((s) => s._id === tmpId ? data.doc : s));
        toast.success("Knowledge Integrated Successfully! Your agent is getting smarter. 🧠");
      }
    } catch {
      clearInterval(tick);
      toast.error("Network error during upload.");
      setSources((p) => p.filter((s) => s._id !== tmpId));
    } finally {
      setTimeout(() => setUploadProgress((p) => { const n = { ...p }; delete n[tmpId]; return n; }), 1200);
    }
  }, [activeAgentId]);

  /* ── Add URL ── */
  const addUrl = useCallback(async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    if (!activeAgentId) { toast.error("Select an agent first."); return; }

    setUrl("");
    const tmpId = `tmp-${Math.random().toString(36).slice(2)}`;
    const optimistic: KBSource = {
      _id: tmpId, fileName: trimmed, fileType: "url",
      fileSize: 0, fileUrl: trimmed, createdAt: new Date().toISOString(),
    };
    setSources((p) => [optimistic, ...p]);
    setUploadProgress((p) => ({ ...p, [tmpId]: 40 }));

    try {
      const fd = new FormData();
      fd.append("agentId", activeAgentId);
      fd.append("url", trimmed);
      const res = await fetch("/api/knowledge", { method: "POST", body: fd });
      setUploadProgress((p) => ({ ...p, [tmpId]: 100 }));

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        toast.error(err.error ?? "Failed to add URL.");
        setSources((p) => p.filter((s) => s._id !== tmpId));
      } else {
        const data = await res.json() as { doc: KBSource };
        setSources((p) => p.map((s) => s._id === tmpId ? data.doc : s));
        toast.success("Knowledge Integrated Successfully! Your agent is getting smarter. 🧠");
      }
    } catch {
      toast.error("Network error.");
      setSources((p) => p.filter((s) => s._id !== tmpId));
    } finally {
      setTimeout(() => setUploadProgress((p) => { const n = { ...p }; delete n[tmpId]; return n; }), 1200);
    }
  }, [url, activeAgentId]);

  /* ── Delete — opens confirmation modal ── */
  const removeSource = useCallback((id: string, name: string) => {
    if (id.startsWith("tmp-")) return;
    setPendingDelete({ id, name });
  }, []);

  /* ── Confirmed delete ── */
  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    const { id, name } = pendingDelete;
    setPendingDelete(null);
    setDeleting(id);
    setSources((p) => p.filter((s) => s._id !== id));
    try {
      const res = await fetch(`/api/knowledge/${id}`, { method: "DELETE" });
      if (!res.ok) { fetchSources(); toast.error("Delete failed."); }
      else toast.success(`"${name}" removed.`);
    } catch { fetchSources(); toast.error("Network error."); }
    finally { setDeleting(null); }
  }, [pendingDelete, fetchSources]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    Array.from(e.dataTransfer.files).forEach(uploadFile);
  }, [uploadFile]);

  const visible    = sources.filter((s) => s.fileName.toLowerCase().includes(search.toLowerCase()));
  const readyCount = sources.filter((s) => !s._id.startsWith("tmp-")).length;

  const QUICK_URLS = [
    { label: "OpenAI Docs",   url: "https://docs.openai.com" },
    { label: "Your FAQ",      url: "https://your-helpdesk.com/faq" },
  ];

  return (
    <>
    <div className="h-full overflow-y-auto">
      <div className="px-4 sm:px-6 lg:px-10 py-6 space-y-7 w-full max-w-7xl mx-auto">

        {/* ════════════════════════════════════
            PAGE HEADER
        ════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight">
              <GradientHeading>Knowledge Base</GradientHeading>
            </h1>
            <p className="text-[13px] text-[#64748b]">
              Build the custom brain of your AI agent.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {activeAgentId ? (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-semibold"
                style={{
                  background: `${config.accentColor}12`,
                  border:     `1px solid ${config.accentColor}35`,
                  color:       config.accentColor,
                  boxShadow:  `0 0 14px ${config.accentColor}10`,
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: config.accentColor }} />
                {config.name}
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium text-[#475569]"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                No agent selected
              </div>
            )}

            <div className="flex items-center gap-1.5 text-[12px] font-medium"
              style={{ color: "#00ff94" }}>
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "#00ff94", boxShadow: "0 0 6px #00ff94", animation: "pulse 2s infinite" }}
              />
              {readyCount} indexed
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════
            GLASSMORPHISM INTRO CARD
        ════════════════════════════════════ */}
        <div
          className="relative rounded-2xl px-5 py-4 overflow-hidden"
          style={{
            background:   "linear-gradient(135deg,rgba(0,242,255,0.06),rgba(168,85,247,0.06))",
            border:       "1px solid rgba(0,242,255,0.18)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Top glow line */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7,#ec4899)" }}
          />
          {/* Corner glow */}
          <div
            className="absolute -top-8 -left-8 w-24 h-24 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle,rgba(0,242,255,0.12),transparent 70%)" }}
          />

          <div className="flex items-start gap-3.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: "rgba(0,242,255,0.1)", border: "1px solid rgba(0,242,255,0.25)" }}
            >
              <Sparkles size={15} className="text-[#00f2ff]" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[12px] font-black tracking-wide uppercase"
                style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                Train Your AI
              </p>
              <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                Upload documents or scrape URLs to build a custom brain for your agent.{" "}
                <span
                  className="font-semibold"
                  style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                >
                  All data is vector-indexed
                </span>{" "}
                for instant retrieval.
              </p>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════
            AI BRAIN + TRAINING STATUS CARDS
        ════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* ── AI Brain ── */}
          <div
            className="relative rounded-2xl p-4 overflow-hidden"
            style={{
              background:     "linear-gradient(135deg,rgba(168,85,247,0.07),rgba(236,72,153,0.04))",
              border:         "1px solid rgba(168,85,247,0.22)",
              backdropFilter: "blur(16px)",
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg,transparent,rgba(168,85,247,0.7),rgba(236,72,153,0.4),transparent)" }} />
            <div className="absolute -top-7 -right-7 w-24 h-24 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle,rgba(168,85,247,0.14),transparent 70%)" }} />

            <div className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{
                  background: "rgba(168,85,247,0.12)",
                  border:     "1px solid rgba(168,85,247,0.3)",
                  boxShadow:  "0 0 14px rgba(168,85,247,0.12)",
                }}
              >
                <Bot size={14} className="text-[#a855f7]" />
              </div>
              <div className="space-y-1.5">
                <p
                  className="text-[10px] font-black uppercase tracking-widest"
                  style={{ background: "linear-gradient(90deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                >
                  🧠 AI Brain
                </p>
                <p className="text-[12px] text-[#94a3b8] leading-relaxed">
                  Every document becomes{" "}
                  <span
                    className="font-bold"
                    style={{ background: "linear-gradient(90deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                  >
                    searchable intelligence
                  </span>
                  . Vectors are stored in Atlas for{" "}
                  <span style={{ color: "#a855f7", fontWeight: 600 }}>instant semantic retrieval</span>.
                </p>
              </div>
            </div>
          </div>

          {/* ── Training Status ── */}
          <div
            className="relative rounded-2xl p-4 overflow-hidden"
            style={{
              background:     "linear-gradient(135deg,rgba(168,85,247,0.06),rgba(0,242,255,0.04))",
              border:         "1px solid rgba(168,85,247,0.18)",
              backdropFilter: "blur(16px)",
            }}
          >
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg,transparent,rgba(168,85,247,0.5),rgba(0,242,255,0.3),transparent)" }} />

            <div className="flex items-start gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)" }}
              >
                <Sparkles size={14} className="text-[#a855f7]" />
              </div>
              <div className="space-y-1.5 flex-1">
                <p
                  className="text-[10px] font-black uppercase tracking-widest"
                  style={{ background: "linear-gradient(90deg,#a855f7,#00f2ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                >
                  📊 Training Status
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span
                    className="text-[26px] font-black leading-none"
                    style={{ background: "linear-gradient(90deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                  >
                    {readyCount}
                  </span>
                  <span className="text-[12px] text-[#64748b]">sources indexed</span>
                </div>
                <p className="text-[11px] text-[#475569]">
                  {readyCount === 0
                    ? "Add your first source to begin training."
                    : `Your agent has ${readyCount} knowledge source${readyCount !== 1 ? "s" : ""} to draw from.`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── No agent ── */}
        {!activeAgentId && <NoAgentBanner />}

        {/* ════════════════════════════════════
            MAIN CONTENT
        ════════════════════════════════════ */}
        {activeAgentId && (
          <>
            {/* Upload + URL row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* ── Drop Zone ── */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => !hasActiveUploads && fileInputRef.current?.click()}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-5 py-14 px-6",
                  "rounded-2xl transition-all duration-300 overflow-hidden",
                  !hasActiveUploads && "cursor-pointer"
                )}
                style={{
                  background: dragging
                    ? "rgba(0,242,255,0.06)"
                    : hasActiveUploads
                      ? "rgba(0,242,255,0.04)"
                      : "rgba(255,255,255,0.02)",
                  border: dragging
                    ? "2px dashed rgba(0,242,255,0.7)"
                    : hasActiveUploads
                      ? "2px dashed rgba(0,242,255,0.4)"
                      : "2px dashed rgba(255,255,255,0.1)",
                  boxShadow: dragging
                    ? "0 0 50px rgba(0,242,255,0.12) inset, 0 0 50px rgba(0,242,255,0.06)"
                    : "none",
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain,text/markdown"
                  className="hidden"
                  onChange={(e) => Array.from(e.target.files ?? []).forEach(uploadFile)}
                />

                {/* Ambient corner glow when dragging */}
                {dragging && (
                  <>
                    <div className="absolute top-0 left-0 w-24 h-24 rounded-full pointer-events-none"
                      style={{ background: "radial-gradient(circle,rgba(0,242,255,0.15),transparent 70%)" }} />
                    <div className="absolute bottom-0 right-0 w-24 h-24 rounded-full pointer-events-none"
                      style={{ background: "radial-gradient(circle,rgba(168,85,247,0.15),transparent 70%)" }} />
                  </>
                )}

                {/* Upload icon */}
                <motion.div
                  animate={{ y: dragging ? -10 : 0, scale: dragging ? 1.1 : 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  className="relative w-16 h-16 rounded-2xl flex items-center justify-center"
                  style={{
                    background: hasActiveUploads
                      ? "rgba(0,242,255,0.1)"
                      : dragging
                        ? "rgba(0,242,255,0.12)"
                        : "rgba(0,242,255,0.07)",
                    border: `1px solid rgba(0,242,255,${dragging ? "0.5" : "0.2"})`,
                    boxShadow: `0 0 ${dragging ? "40px" : "16px"} rgba(0,242,255,${dragging ? "0.35" : "0.1"})`,
                  }}
                >
                  {hasActiveUploads ? (
                    <RefreshCw size={26} className="text-[#00f2ff] animate-spin" />
                  ) : (
                    <Upload size={26} className="text-[#00f2ff]" />
                  )}

                  {/* Ping ring when uploading */}
                  {hasActiveUploads && (
                    <span
                      className="absolute inset-0 rounded-2xl animate-ping opacity-30"
                      style={{ border: "2px solid #00f2ff" }}
                    />
                  )}
                </motion.div>

                <div className="text-center space-y-1 z-10">
                  {hasActiveUploads ? (
                    <>
                      <p className="text-[14px] font-bold"
                        style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                        Processing your document…
                      </p>
                      <p className="text-[12px] text-[#475569]">Vector indexing in progress</p>
                    </>
                  ) : dragging ? (
                    <>
                      <p className="text-[14px] font-bold text-[#00f2ff]">Release to upload</p>
                      <p className="text-[12px] text-[#64748b]">Files will be indexed instantly</p>
                    </>
                  ) : (
                    <>
                      <p className="text-[14px] font-medium text-[#94a3b8]">
                        Drop files here or{" "}
                        <span
                          style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 700 }}
                        >
                          browse
                        </span>
                      </p>
                      <p className="text-[12px] text-[#334155]">Supports PDF, DOCX, or DOC up to 10 MB</p>
                    </>
                  )}
                </div>
              </div>

              {/* ── URL Scraper ── */}
              <div
                className="flex flex-col gap-5 p-5 rounded-2xl relative overflow-hidden"
                style={{
                  background: "rgba(8,8,18,0.8)",
                  border:     "1px solid rgba(168,85,247,0.2)",
                  boxShadow:  "0 0 30px rgba(168,85,247,0.05) inset",
                }}
              >
                {/* Top glow line */}
                <div
                  className="absolute top-0 left-0 right-0 h-px"
                  style={{ background: "linear-gradient(90deg,transparent,rgba(168,85,247,0.6),rgba(0,242,255,0.3),transparent)" }}
                />

                {/* Header */}
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)" }}
                  >
                    <Globe size={14} className="text-[#a855f7]" />
                  </div>
                  <div>
                    <p
                      className="text-[13px] font-bold tracking-wide"
                      style={{ background: "linear-gradient(90deg,#a855f7,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                    >
                      URL Scraper
                    </p>
                    <p className="text-[11px] text-[#334155]">Index any public web page</p>
                  </div>
                </div>

                {/* Console-style description */}
                <div
                  className="rounded-xl px-3.5 py-2.5 font-mono text-[11px]"
                  style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <span className="text-[#475569]">&gt; </span>
                  <span className="text-[#64748b]">Supports docs, wikis, help centers &amp; landing pages.</span>
                  <span className="text-[#00f2ff] ml-1 animate-pulse">▋</span>
                </div>

                {/* URL Input — pulsing border on focus */}
                <div className="flex gap-2">
                  <div
                    className="flex-1 relative rounded-xl transition-all duration-200"
                    style={{
                      boxShadow: urlFocused
                        ? "0 0 0 2px rgba(168,85,247,0.4), 0 0 20px rgba(168,85,247,0.15)"
                        : "none",
                    }}
                  >
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addUrl()}
                      onFocus={() => setUrlFocused(true)}
                      onBlur={() => setUrlFocused(false)}
                      placeholder="https://docs.example.com/page"
                      className="w-full px-3 py-2.5 rounded-xl text-[13px] text-[#e2e8f0] outline-none placeholder:text-[#334155]"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border:     `1px solid ${urlFocused ? "rgba(168,85,247,0.5)" : "rgba(255,255,255,0.08)"}`,
                        transition: "border-color 0.2s",
                      }}
                    />
                  </div>
                  <button
                    onClick={addUrl}
                    className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: "linear-gradient(135deg,rgba(168,85,247,0.2),rgba(236,72,153,0.15))",
                      border:     "1px solid rgba(168,85,247,0.4)",
                      boxShadow:  "0 0 14px rgba(168,85,247,0.15)",
                    }}
                  >
                    <Plus size={16} className="text-[#a855f7]" />
                  </button>
                </div>

                {/* Quick Add chips */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#334155]">
                    Quick Add
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_URLS.map(({ label, url: u }) => (
                      <button
                        key={u}
                        onClick={() => setUrl(u)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all hover:scale-[1.03] active:scale-95 group"
                        style={{
                          background: "rgba(168,85,247,0.07)",
                          border:     "1px solid rgba(168,85,247,0.2)",
                          color:      "#94a3b8",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.background = "rgba(168,85,247,0.15)";
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(168,85,247,0.45)";
                          (e.currentTarget as HTMLButtonElement).style.color = "#c084fc";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.background = "rgba(168,85,247,0.07)";
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(168,85,247,0.2)";
                          (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8";
                        }}
                      >
                        <Zap size={9} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="relative h-px">
              <div className="absolute inset-0" style={{ background: "linear-gradient(90deg,transparent,rgba(0,242,255,0.2),rgba(168,85,247,0.1),transparent)" }} />
            </div>

            {/* ════════════════════════════════════
                INDEXED SOURCES TABLE
            ════════════════════════════════════ */}
            <div className="space-y-4">

              {/* Table header row */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <h3
                    className="text-[13px] font-black tracking-wide uppercase"
                    style={{ background: "linear-gradient(90deg,#00f2ff,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
                  >
                    Indexed Sources
                  </h3>
                  <span
                    className="px-2 py-0.5 rounded-full text-[11px] font-black"
                    style={{
                      background: "rgba(0,242,255,0.1)",
                      border:     "1px solid rgba(0,242,255,0.25)",
                      color:      "#00f2ff",
                    }}
                  >
                    {sources.length}
                  </span>
                  {loading && <RefreshCw size={12} className="animate-spin text-[#334155]" />}
                </div>

                {/* Search */}
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border:     "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <Search size={13} className="text-[#334155] shrink-0" />
                  <input
                    type="text" value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search sources…"
                    className="bg-transparent text-[13px] text-[#94a3b8] outline-none w-36 placeholder:text-[#334155]"
                  />
                </div>
              </div>

              {/* Column headers */}
              <div
                className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-4 py-2.5 rounded-xl text-[10px] uppercase tracking-widest"
                style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.05)" }}
              >
                <span className="w-8" />
                <span
                  style={{ background: "linear-gradient(90deg,#94a3b8,#64748b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontWeight: 700 }}
                >File / URL</span>
                <span className="w-16 text-right text-[#334155] font-semibold">Size</span>
                <span className="w-24 text-center text-[#334155] font-semibold">Status</span>
                <span className="w-8" />
              </div>

              {/* Source rows */}
              <AnimatePresence initial={false}>
                {visible.map((src) => {
                  const style      = FILE_STYLE[src.fileType] ?? FILE_STYLE.txt;
                  const progress   = uploadProgress[src._id];
                  const isUploading = progress !== undefined && progress < 100;

                  return (
                    <motion.div
                      key={src._id}
                      initial={{ opacity: 0, y: -10, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 24, transition: { duration: 0.15 } }}
                      transition={{ duration: 0.22 }}
                      className="relative overflow-hidden rounded-xl group"
                      style={{
                        background: isUploading
                          ? "rgba(0,242,255,0.03)"
                          : "rgba(255,255,255,0.025)",
                        border: isUploading
                          ? "1px solid rgba(0,242,255,0.3)"
                          : "1px solid rgba(255,255,255,0.06)",
                        boxShadow: isUploading
                          ? "0 0 20px rgba(0,242,255,0.05) inset"
                          : "none",
                        transition: "background 0.2s, border-color 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isUploading)
                          (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)";
                      }}
                      onMouseLeave={(e) => {
                        if (!isUploading)
                          (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.025)";
                      }}
                    >
                      <div className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-4 py-3">

                        {/* File type icon */}
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: style.bg, border: `1px solid ${style.border}`, boxShadow: `0 0 8px ${style.border}` }}
                        >
                          {src.fileType === "url"
                            ? <Link2 size={13} style={{ color: style.color }} />
                            : <FileText size={13} style={{ color: style.color }} />}
                        </div>

                        {/* Name + date */}
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-[#e2e8f0] truncate">{src.fileName}</p>
                          <p className="text-[11px] text-[#334155]">
                            {new Date(src.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>

                        {/* Size */}
                        <span className="hidden sm:block text-[12px] text-[#475569] text-right w-16 tabular-nums">
                          {fmtSize(src.fileSize)}
                        </span>

                        {/* Status indicator */}
                        <div className="hidden sm:flex items-center justify-center w-24">
                          {isUploading ? (
                            <div className="flex items-center gap-1.5">
                              {/* Pulsing orange dot */}
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{
                                  background: "#f59e0b",
                                  boxShadow:  "0 0 6px #f59e0b",
                                  animation:  "pulse 1s cubic-bezier(.4,0,.6,1) infinite",
                                }}
                              />
                              <span className="text-[11px] font-medium text-[#f59e0b]">Indexing</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              {/* Glowing green dot */}
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{
                                  background: "#00ff94",
                                  boxShadow:  "0 0 8px #00ff94, 0 0 16px rgba(0,255,148,0.4)",
                                }}
                              />
                              <span className="text-[11px] font-medium text-[#00ff94]">Indexed</span>
                            </div>
                          )}
                        </div>

                        {/* Delete */}
                        <button
                          onClick={() => removeSource(src._id, src.fileName)}
                          disabled={deleting === src._id || isUploading}
                          className="opacity-0 group-hover:opacity-100 w-8 flex items-center justify-center rounded-lg transition-all disabled:opacity-30 hover:bg-red-500/10"
                          style={{ color: "#475569" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#f87171"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#475569"; }}
                        >
                          {deleting === src._id
                            ? <RefreshCw size={13} className="animate-spin" />
                            : <Trash2 size={14} />}
                        </button>
                      </div>

                      {/* Progress bar at bottom of row */}
                      {isUploading && (
                        <div className="px-4 pb-2">
                          <ProgressBar value={progress ?? 0} />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Empty state */}
              {!loading && visible.length === 0 && sources.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-3 py-16 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.015)", border: "1px dashed rgba(255,255,255,0.07)" }}
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: "rgba(0,242,255,0.06)", border: "1px solid rgba(0,242,255,0.12)" }}
                  >
                    <FileText size={20} className="text-[#1e293b]" />
                  </div>
                  <p className="text-[13px] font-medium text-[#334155]">No sources yet</p>
                  <p className="text-[11px] text-[#1e293b]">Upload a file or add a URL to get started</p>
                </motion.div>
              )}

              {!loading && visible.length === 0 && sources.length > 0 && (
                <div className="text-center py-12 text-[#334155] text-[13px]">
                  No sources match your search.
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>

    <ConfirmModal
      open={!!pendingDelete}
      title={`Delete "${pendingDelete?.name}"?`}
      description="This will permanently remove the file and all its indexed knowledge chunks. Your agent will no longer be able to answer questions from this source."
      confirmLabel="Delete File"
      danger
      onConfirm={confirmDelete}
      onCancel={() => setPendingDelete(null)}
    />
    </>
  );
}
