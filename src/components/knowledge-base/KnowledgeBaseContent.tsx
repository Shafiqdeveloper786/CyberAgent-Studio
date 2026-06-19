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
  pdf:  { bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.2)",   color: "#ef4444" },
  docx: { bg: "rgba(37,99,235,0.08)",   border: "rgba(37,99,235,0.2)",   color: "#3b82f6" },
  doc:  { bg: "rgba(37,99,235,0.08)",   border: "rgba(37,99,235,0.2)",   color: "#3b82f6" },
  txt:  { bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.2)", color: "#64748b" },
  md:   { bg: "rgba(234,179,8,0.08)",   border: "rgba(234,179,8,0.2)",   color: "#eab308" },
  url:  { bg: "rgba(168,85,247,0.08)",  border: "rgba(168,85,247,0.2)",  color: "#a855f7" },
};

function fmtSize(b: number): string {
  if (!b) return "—";
  return b >= 1_048_576 ? `${(b / 1_048_576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`;
}

/* ── Progress bar ── */
function ProgressBar({ value }: { value: number }) {
  return (
    <div className="w-full h-1 rounded-full overflow-hidden bg-slate-100">
      <motion.div
        className="h-full rounded-full bg-blue-500"
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ ease: "easeOut", duration: 0.25 }}
      />
    </div>
  );
}

/* ── No-agent banner ── */
function NoAgentBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-4 py-20 text-center"
    >
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-slate-50 border border-slate-200">
        <Bot size={26} className="text-slate-400" />
      </div>
      <p className="text-[15px] font-semibold text-slate-700">No agent found</p>
      <p className="text-[12px] text-slate-500 max-w-[300px] leading-relaxed">
        Go to{" "}
        <span className="font-semibold text-blue-600">Agent Space</span>
        {" "}and create your agent. It will be automatically selected and ready for knowledge upload.
      </p>
    </motion.div>
  );
}

/* ── Allowed upload types ── */
const ALLOWED_EXTENSIONS = ["pdf", "docx", "doc", "txt", "md"] as const;
const ALLOWED_MIME_TYPES  = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "text/plain",
  "text/markdown",
  "application/octet-stream",
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

  /* ── Delete ── */
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
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Knowledge Base
            </h1>
            <p className="text-[13px] text-slate-500">
              Build the custom brain of your AI agent.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {activeAgentId ? (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-semibold bg-white border border-slate-200 shadow-sm"
                style={{ color: config.accentColor }}
              >
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: config.accentColor }} />
                {config.name}
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium text-slate-500 bg-white border border-slate-200">
                No agent selected
              </div>
            )}

            <div className="flex items-center gap-1.5 text-[12px] font-medium text-emerald-600">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-sm" />
              {readyCount} indexed
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════
            INFO CARD — light theme
        ════════════════════════════════════ */}
        <div className="relative rounded-2xl px-5 py-4 overflow-hidden bg-blue-50 border border-blue-100">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-blue-100 border border-blue-200">
              <Sparkles size={15} className="text-blue-600" />
            </div>
            <div className="space-y-0.5">
              <p className="text-[12px] font-bold tracking-wide uppercase text-blue-800">
                Train Your AI
              </p>
              <p className="text-[12px] text-slate-600 leading-relaxed">
                Upload documents or scrape URLs to build a custom brain for your agent.{" "}
                <span className="font-semibold text-blue-700">All data is vector-indexed</span>{" "}
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
          <div className="relative rounded-2xl p-4 overflow-hidden bg-white border border-slate-200 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-purple-50 border border-purple-200">
                <Bot size={14} className="text-purple-600" />
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-purple-700">
                  🧠 AI Brain
                </p>
                <p className="text-[12px] text-slate-600 leading-relaxed">
                  Every document becomes{" "}
                  <span className="font-bold text-purple-700">searchable intelligence</span>
                  . Vectors are stored in Atlas for{" "}
                  <span className="font-semibold text-purple-600">instant semantic retrieval</span>.
                </p>
              </div>
            </div>
          </div>

          {/* ── Training Status ── */}
          <div className="relative rounded-2xl p-4 overflow-hidden bg-white border border-slate-200 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-blue-50 border border-blue-200">
                <Sparkles size={14} className="text-blue-600" />
              </div>
              <div className="space-y-1.5 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-blue-700">
                  📊 Training Status
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[26px] font-black leading-none text-blue-600">
                    {readyCount}
                  </span>
                  <span className="text-[12px] text-slate-500">sources indexed</span>
                </div>
                <p className="text-[11px] text-slate-500">
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
                  !hasActiveUploads && "cursor-pointer",
                  "bg-white border-2 border-dashed",
                  dragging ? "border-blue-500 bg-blue-50/30" : "border-slate-200 hover:border-slate-300"
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,text/plain,text/markdown"
                  className="hidden"
                  onChange={(e) => Array.from(e.target.files ?? []).forEach(uploadFile)}
                />

                {/* Upload icon */}
                <motion.div
                  animate={{ y: dragging ? -10 : 0, scale: dragging ? 1.1 : 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 18 }}
                  className="relative w-16 h-16 rounded-2xl flex items-center justify-center bg-slate-50 border border-slate-200 shadow-sm"
                >
                  {hasActiveUploads ? (
                    <RefreshCw size={26} className="text-blue-500 animate-spin" />
                  ) : (
                    <Upload size={26} className="text-slate-500" />
                  )}
                </motion.div>

                <div className="text-center space-y-1 z-10">
                  {hasActiveUploads ? (
                    <>
                      <p className="text-[14px] font-bold text-blue-700">Processing your document…</p>
                      <p className="text-[12px] text-slate-500">Vector indexing in progress</p>
                    </>
                  ) : dragging ? (
                    <>
                      <p className="text-[14px] font-bold text-blue-600">Release to upload</p>
                      <p className="text-[12px] text-slate-500">Files will be indexed instantly</p>
                    </>
                  ) : (
                    <>
                      <p className="text-[14px] font-medium text-slate-600">
                        Drop files here or{" "}
                        <span className="text-blue-600 font-bold">browse</span>
                      </p>
                      <p className="text-[12px] text-slate-400">Supports PDF, DOCX, or DOC up to 10 MB</p>
                    </>
                  )}
                </div>
              </div>

              {/* ── URL Scraper — light theme ── */}
              <div className="flex flex-col gap-5 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
                {/* Header */}
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-purple-50 border border-purple-200">
                    <Globe size={14} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold tracking-wide text-slate-800">URL Scraper</p>
                    <p className="text-[11px] text-slate-500">Index any public web page</p>
                  </div>
                </div>

                {/* Description */}
                <div className="rounded-xl px-3.5 py-2.5 text-[11px] bg-slate-50 border border-slate-200 text-slate-500">
                  {" > "}Supports docs, wikis, help centers {"&"} landing pages.
                </div>

                {/* URL Input */}
                <div className="flex gap-2">
                  <div className="flex-1 relative rounded-xl">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addUrl()}
                      onFocus={() => setUrlFocused(true)}
                      onBlur={() => setUrlFocused(false)}
                      placeholder="https://docs.example.com/page"
                      className={cn(
                        "w-full px-3 py-2.5 rounded-xl text-[13px] text-slate-800 outline-none placeholder:text-slate-400 transition-all bg-white border",
                        urlFocused ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-200"
                      )}
                    />
                  </div>
                  <button
                    onClick={addUrl}
                    className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 transition-all hover:scale-105 active:scale-95 bg-blue-600 text-white hover:bg-blue-500 shadow-sm"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Quick Add chips */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Quick Add</p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_URLS.map(({ label, url: u }) => (
                      <button
                        key={u}
                        onClick={() => setUrl(u)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all hover:scale-[1.03] active:scale-95 bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
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
            <div className="h-px bg-slate-100" />

            {/* ════════════════════════════════════
                INDEXED SOURCES TABLE — light
            ════════════════════════════════════ */}
            <div className="space-y-4">

              {/* Table header row */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <h3 className="text-[13px] font-bold tracking-wide uppercase text-slate-800">Indexed Sources</h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
                    {sources.length}
                  </span>
                  {loading && <RefreshCw size={12} className="animate-spin text-slate-400" />}
                </div>

                {/* Search */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200">
                  <Search size={13} className="text-slate-400 shrink-0" />
                  <input
                    type="text" value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search sources…"
                    className="bg-transparent text-[13px] text-slate-600 outline-none w-36 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Column headers */}
              <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <span className="w-8" />
                <span>File / URL</span>
                <span className="w-16 text-right">Size</span>
                <span className="w-24 text-center">Status</span>
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
                      className="relative overflow-hidden rounded-xl group bg-white border border-slate-200 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 px-4 py-3">
                        {/* File type icon */}
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: style.bg, border: `1px solid ${style.border}` }}>
                          {src.fileType === "url"
                            ? <Link2 size={13} style={{ color: style.color }} />
                            : <FileText size={13} style={{ color: style.color }} />}
                        </div>

                        {/* Name + date */}
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium text-slate-800 truncate">{src.fileName}</p>
                          <p className="text-[11px] text-slate-400">
                            {new Date(src.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>

                        {/* Size */}
                        <span className="hidden sm:block text-[12px] text-slate-500 text-right w-16 tabular-nums">
                          {fmtSize(src.fileSize)}
                        </span>

                        {/* Status indicator */}
                        <div className="hidden sm:flex items-center justify-center w-24">
                          {isUploading ? (
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full shrink-0 bg-amber-500 animate-pulse" />
                              <span className="text-[11px] font-medium text-amber-600">Indexing</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full shrink-0 bg-emerald-500 shadow-sm" />
                              <span className="text-[11px] font-medium text-emerald-600">Indexed</span>
                            </div>
                          )}
                        </div>

                        {/* Delete */}
                        <button
                          onClick={() => removeSource(src._id, src.fileName)}
                          disabled={deleting === src._id || isUploading}
                          className="opacity-0 group-hover:opacity-100 w-8 flex items-center justify-center rounded-lg transition-all disabled:opacity-30 hover:bg-red-50 text-slate-400 hover:text-red-500"
                        >
                          {deleting === src._id
                            ? <RefreshCw size={13} className="animate-spin" />
                            : <Trash2 size={14} />}
                        </button>
                      </div>

                      {/* Progress bar */}
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
                  className="flex flex-col items-center gap-3 py-16 rounded-2xl bg-white border border-dashed border-slate-200"
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-50 border border-slate-200">
                    <FileText size={20} className="text-slate-400" />
                  </div>
                  <p className="text-[13px] font-medium text-slate-600">No sources yet</p>
                  <p className="text-[11px] text-slate-400">Upload a file or add a URL to get started</p>
                </motion.div>
              )}

              {!loading && visible.length === 0 && sources.length > 0 && (
                <div className="text-center py-12 text-slate-500 text-[13px]">
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