"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Clock, AlertCircle, RefreshCw, Send, Mail, Inbox, Globe, XCircle, Search, Trash2, Plus, Loader2
} from "lucide-react";

interface SupportTicket {
  _id:          string;
  type:         "internal" | "external";
  tenantId?:    string;
  contactEmail: string;
  contactName:  string;
  subject:      string;
  chatContext:  { role: string; content: string; timestamp: string }[];
  status:       "pending" | "in-progress" | "resolved";
  isInternal?:  boolean;
  replies:      { sender: "admin" | "user" | "visitor"; message: string; timestamp: string }[];
  createdAt:    string;
  updatedAt:    string;
}

export default function CustomerInquiriesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const tabFilter = "support" as const;
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [toast, setToast] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  /* ── New inquiry modal state ── */
  const [showNewForm, setShowNewForm] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [newMessage, setNewMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* ── Admin check for status update visibility ── */
  const isAdmin = session?.user?.role === "admin";

  const knownTicketIdsRef = useRef<Set<string>>(new Set());

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/inquiries?search=${encodeURIComponent(search)}&status=${statusFilter}&isInternal=false`
      );
      const data = await res.json();
      if (data.ok) {
        setTickets(data.tickets || []);
      } else {
        showToast(data.error ?? "Failed to fetch inquiries");
      }
    } catch (err) {
      console.error("Failed to fetch customer inquiries", err);
      showToast("Error loading inquiries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/dashboard");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchTickets();
    }
  }, [status, search, statusFilter]);

  // Polling for new customer support tickets to show a toast notification
  useEffect(() => {
    if (status !== "authenticated") return;

    // Fetch initial tickets once to populate known list
    const initKnown = async () => {
      try {
        const res = await fetch(`/api/inquiries?isInternal=false`);
        const data = await res.json();
        if (data.ok && data.tickets) {
          data.tickets.forEach((t: any) => knownTicketIdsRef.current.add(t._id));
        }
      } catch (err) {
        console.error("Failed to fetch initial support tickets for polling:", err);
      }
    };
    initKnown();

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/inquiries?isInternal=false`);
        const data = await res.json();
        if (data.ok && data.tickets) {
          const currentTickets = data.tickets;
          const newTickets = currentTickets.filter((t: any) => !knownTicketIdsRef.current.has(t._id));

          if (newTickets.length > 0) {
            newTickets.forEach((t: any) => {
              knownTicketIdsRef.current.add(t._id);
              // Trigger notification toast (triggers only when a new isInternal: false ticket is created)
              showToast(`🔔 New Support Inquiry: "${t.subject}" from ${t.contactName}`);
            });
            fetchTickets();
          }
        }
      } catch (err) {
        console.error("Polling for support tickets failed:", err);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [status]);

  const handleCreateInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: newSubject.trim(),
          category: newCategory,
          message: newMessage.trim(),
        }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast("Inquiry submitted successfully");
        setShowNewForm(false);
        setNewSubject("");
        setNewCategory("general");
        setNewMessage("");
        fetchTickets();
      } else {
        showToast(data.error ?? "Failed to submit inquiry");
      }
    } catch {
      showToast("An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCycleStatus = async (id: string, currentStatus: string) => {
    const cycle: Record<string, string> = {
      "pending":     "in-progress",
      "in-progress": "resolved",
      "resolved":    "pending",
    };
    const nextStatus = cycle[currentStatus] ?? "pending";
    try {
      const res = await fetch(`/api/inquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast(`Status updated to ${nextStatus}`);
        if (selectedTicket && selectedTicket._id === id) {
          setSelectedTicket(data.ticket);
        }
        fetchTickets();
      } else {
        showToast(data.error ?? "Failed to update status");
      }
    } catch {
      showToast("An error occurred");
    }
  };

  const handleReplySubmit = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setSendingReply(true);
    try {
      const res = await fetch(`/api/inquiries/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText }),
      });
      const data = await res.json();
      if (data.ok) {
        showToast("Reply sent to visitor email");
        setReplyText("");
        setSelectedTicket(data.ticket);
        fetchTickets();
      } else {
        showToast(data.error ?? "Failed to send reply");
      }
    } catch {
      showToast("An error occurred sending reply");
    } finally {
      setSendingReply(false);
    }
  };

  const handleDeleteTicket = async (id: string) => {
    if (deletingId) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/inquiries/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        showToast("Inquiry deleted");
        setTickets((prev) => prev.filter((t) => t._id !== id));
        if (selectedTicket?._id === id) setSelectedTicket(null);
      } else {
        showToast(data.error ?? "Failed to delete inquiry");
      }
    } catch {
      showToast("An error occurred");
    } finally {
      setDeletingId(null);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="animate-spin text-blue-600" size={32} />
          <p className="text-sm font-medium text-slate-500">Checking session...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  return (
    <DashboardShell title="Customer Inquiries">
      <div className="p-6 space-y-6 max-w-7xl mx-auto pb-12 relative h-full flex flex-col">
        {/* Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-lg max-w-sm"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Customer Inquiries</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage inquiries and internal test feedback from your NexCore agents.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all active:scale-95 shadow-md shadow-blue-500/10"
            >
              <Plus size={12} /> New Inquiry
            </button>
            <button
              onClick={fetchTickets}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        {/* Customer Support — unified */}
        <div className="flex gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200/60 w-fit">
          <div className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-white border border-slate-200/50 text-slate-800 shadow-sm">
            <Globe size={12} />
            Customer Support
          </div>
        </div>

        {/* Filters Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
          {/* Status Filters */}
          <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            {["all", "pending", "in-progress", "resolved"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all whitespace-nowrap ${
                  statusFilter === st
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/10"
                    : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                }`}
              >
                {st === "in-progress" ? "In Progress" : st}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Search by name, email, or subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs outline-none bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
        </div>

        {/* Content Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-1 min-h-[480px]">
          {/* Ticket List Panel */}
          <div className="lg:col-span-2 space-y-3 max-h-[620px] overflow-y-auto pr-1">
            {loading && tickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                <RefreshCw size={24} className="animate-spin text-blue-500" />
                <span className="text-xs">Loading inquiries...</span>
              </div>
            ) : tickets.length === 0 ? (
              <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center shadow-sm">
                <Inbox size={32} className="text-slate-300 mx-auto mb-3" />
                <p className="text-xs text-slate-400 font-medium">No inquiries found matching criteria.</p>
              </div>
            ) : (
              tickets.map((tk) => (
                <div
                  key={tk._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedTicket(tk);
                    setReplyText("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setSelectedTicket(tk);
                      setReplyText("");
                    }
                  }}
                  className={`w-full text-left rounded-2xl border p-5 transition-all duration-200 relative cursor-pointer outline-none ${
                    selectedTicket?._id === tk._id
                      ? "border-slate-300 bg-slate-50/60 shadow-sm ring-1 ring-slate-300"
                      : "border-slate-100 bg-white hover:border-slate-200 hover:shadow-md hover:shadow-slate-100/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-xs font-bold text-slate-800 leading-tight line-clamp-1 flex-1">
                      {tk.subject}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border ${
                          tk.status === "resolved"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : tk.status === "in-progress"
                            ? "bg-amber-50 text-amber-600 border-amber-100"
                            : "bg-rose-50 text-rose-600 border-rose-100"
                        }`}
                      >
                        {tk.status === "in-progress" ? "in progress" : tk.status}
                      </span>
                      {/* Delete button (Tenant panel delete action) */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete "${tk.subject}"? This cannot be undone.`)) {
                            handleDeleteTicket(tk._id);
                          }
                        }}
                        disabled={deletingId === tk._id}
                        title="Delete inquiry"
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-colors disabled:opacity-40"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                    <span className="font-semibold text-slate-700">{tk.contactName || "Visitor"}</span>
                    <span className="text-slate-300">•</span>
                    <span>{tk.contactEmail}</span>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100/60 text-[9.5px] text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                      {tk.isInternal ? (
                        <><AlertCircle size={10} className="text-indigo-500" /> Internal Feedback</>
                      ) : (
                        <><Globe size={10} className="text-emerald-500" /> Customer Support</>
                      )}
                    </span>
                    <span>{new Date(tk.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Ticket Detail Panel */}
          <div className="lg:col-span-3 h-full">
            {!selectedTicket ? (
              <div className="rounded-2xl border border-slate-100 bg-white h-full min-h-[400px] flex items-center justify-center shadow-sm">
                <div className="text-center">
                  <MessageSquare size={32} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-xs text-slate-400 font-semibold">Select an inquiry to view details</p>
                  <p className="text-[10px] text-slate-400/80 mt-1 max-w-[240px]">
                    See visitor transcripts, reply by email, or update the resolution status.
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden flex flex-col shadow-sm max-h-[620px] h-full">
                {/* Header */}
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                          selectedTicket.status === "resolved" ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                          : selectedTicket.status === "in-progress" ? "bg-amber-50 text-amber-600 border border-amber-200"
                          : "bg-rose-50 text-rose-600 border border-rose-200"
                        }`}>{selectedTicket.status}</span>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {selectedTicket._id}</span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-800 line-clamp-1">{selectedTicket.subject}</h3>
                      <p className="text-[11px] text-slate-500 mt-1">
                        <span className="font-semibold text-slate-700">{selectedTicket.contactName}</span> ({selectedTicket.contactEmail})
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isAdmin && (
                        <button
                          onClick={() => handleCycleStatus(selectedTicket._id, selectedTicket.status)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
                        >
                          <Clock size={12} />
                          {selectedTicket.status === "pending" ? "Start Progress" : selectedTicket.status === "in-progress" ? "Resolve Inquiry" : "Reopen Inquiry"}
                        </button>
                      )}
                      {!isAdmin && (
                        <span className={`px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider border ${
                          selectedTicket.status === "resolved"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : selectedTicket.status === "in-progress"
                            ? "bg-amber-50 text-amber-600 border-amber-100"
                            : "bg-rose-50 text-rose-600 border-rose-100"
                        }`}>
                          {selectedTicket.status === "in-progress" ? "In Progress" : selectedTicket.status}
                        </span>
                      )}
                      <button
                        onClick={() => setSelectedTicket(null)}
                        className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <XCircle size={18} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Scroller Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-slate-50/20">
                  {/* Chat context (NexCore AI Conversation transcript) */}
                  {selectedTicket.chatContext && selectedTicket.chatContext.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Original AI Chat Transcript
                      </p>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-3 max-h-48 overflow-y-auto shadow-inner">
                        {selectedTicket.chatContext.map((msg, i) => (
                          <div
                            key={i}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`px-3 py-2 rounded-2xl text-xs leading-relaxed max-w-[85%] shadow-sm ${
                                msg.role === "user"
                                  ? "bg-blue-600 text-white rounded-tr-none"
                                  : "bg-white border border-slate-100 text-slate-800 rounded-tl-none"
                              }`}
                            >
                              <div className="text-[9px] opacity-75 mb-0.5 font-semibold">
                                {msg.role === "user" ? "Visitor" : "AI Agent"}
                              </div>
                              <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Replies Thread */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Conversation History (Email gateway)
                    </p>
                    {selectedTicket.replies && selectedTicket.replies.length > 0 ? (
                      <div className="space-y-3">
                        {selectedTicket.replies.map((r, i) => (
                          <div
                            key={i}
                            className={`flex ${
                              r.sender === "visitor" ? "justify-start" : "justify-end"
                            }`}
                          >
                            <div
                              className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed max-w-[80%] shadow-sm ${
                                r.sender === "visitor"
                                  ? "bg-slate-100 border border-slate-200 text-slate-800 rounded-tl-none"
                                  : r.sender === "admin"
                                  ? "bg-slate-800 text-white rounded-tr-none"
                                  : "bg-blue-600 text-white rounded-tr-none"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-4 text-[9px] font-semibold opacity-80 uppercase tracking-wider mb-1">
                                <span>
                                  {r.sender === "visitor"
                                    ? "Visitor (Email)"
                                    : r.sender === "admin"
                                    ? "Admin"
                                    : "You (Tenant)"}
                                </span>
                                <span className="opacity-60 font-medium">
                                  {new Date(r.timestamp).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="whitespace-pre-wrap">{r.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400 bg-white">
                        No reply history yet. Send a message below to start the thread.
                      </div>
                    )}
                  </div>
                </div>

                {/* Reply Compose Footer */}
                <div className="border-t border-slate-100 p-4 bg-white">
                  <form
                    onSubmit={(e) => handleReplySubmit(e, selectedTicket._id)}
                    className="flex items-end gap-2"
                  >
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a message to send to the visitor via email..."
                      rows={2}
                      className="flex-1 resize-none px-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                    />
                    <button
                      type="submit"
                      disabled={!replyText.trim() || sendingReply}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-40 transition-all active:scale-95 shrink-0 shadow-md shadow-blue-500/10"
                    >
                      <Send size={12} />
                      {sendingReply ? "Sending..." : "Send"}
                    </button>
                  </form>
                  <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1.5">
                    <Mail size={10} className="text-slate-400" />
                    Visitor will be notified by email and receive a link to view/reply to the thread online.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
         New Inquiry Modal
      ═══════════════════════════════════════════════ */}
      <AnimatePresence>
        {showNewForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setShowNewForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">New Support Inquiry</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Submit a new support ticket to our team.
                  </p>
                </div>
                <button
                  onClick={() => setShowNewForm(false)}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <XCircle size={18} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleCreateInquiry} className="p-5 space-y-4">
                {/* Subject */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Subject <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    placeholder="Brief summary of your issue..."
                    required
                    className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white transition-all placeholder:text-slate-400"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white transition-all"
                  >
                    <option value="general">General</option>
                    <option value="billing">Billing</option>
                    <option value="technical">Technical</option>
                    <option value="feature">Feature Request</option>
                    <option value="bug">Bug Report</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Message <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Describe your issue in detail..."
                    required
                    rows={4}
                    className="w-full resize-none px-3 py-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white transition-all placeholder:text-slate-400"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewForm(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newSubject.trim() || !newMessage.trim() || submitting}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 transition-all active:scale-95 shadow-md shadow-blue-500/10"
                  >
                    {submitting ? (
                      <><Loader2 size={12} className="animate-spin" /> Submitting...</>
                    ) : (
                      <><Send size={12} /> Submit Inquiry</>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </DashboardShell>
  );
}
