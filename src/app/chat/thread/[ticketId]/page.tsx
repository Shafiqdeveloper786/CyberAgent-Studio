"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, Send, Mail, RefreshCw, CheckCircle, ShieldAlert, Clock, ArrowLeft, Lock
} from "lucide-react";

interface SupportTicket {
  _id:          string;
  type:         "internal" | "external";
  contactEmail: string;
  contactName:  string;
  subject:      string;
  chatContext:  { role: string; content: string; timestamp: string }[];
  status:       "pending" | "in-progress" | "resolved";
  replies:      { sender: "admin" | "user" | "visitor"; message: string; timestamp: string }[];
  createdAt:    string;
  updatedAt:    string;
}

export default function VisitorThreadPage() {
  const params = useParams();
  const ticketId = params.ticketId as string;
  const router = useRouter();

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailInput, setEmailInput] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  // Load verified email from session storage if exists
  useEffect(() => {
    const cached = sessionStorage.getItem(`thread_auth_${ticketId}`);
    if (cached) {
      setVerifiedEmail(cached);
    }
  }, [ticketId]);

  const fetchThread = async (authEmail?: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/chat/thread/${ticketId}`);
      const data = await res.json();
      
      if (data.ok) {
        const tk: SupportTicket = data.ticket;
        const checkEmail = authEmail || verifiedEmail;
        
        if (checkEmail) {
          if (tk.contactEmail.toLowerCase() === checkEmail.toLowerCase()) {
            setTicket(tk);
          } else {
            setError("Email verification failed. Email does not match this thread.");
            setVerifiedEmail("");
            sessionStorage.removeItem(`thread_auth_${ticketId}`);
          }
        } else {
          // Store ticket metadata to display subject/name but not replies yet
          setTicket(tk);
        }
      } else {
        setError(data.error ?? "Failed to load support thread.");
      }
    } catch (err) {
      console.error("Fetch thread error:", err);
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ticketId) {
      fetchThread();
    }
  }, [ticketId, verifiedEmail]);

  const handleVerify = (e: FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail) return;

    if (ticket && ticket.contactEmail.toLowerCase() === cleanEmail) {
      setVerifiedEmail(cleanEmail);
      sessionStorage.setItem(`thread_auth_${ticketId}`, cleanEmail);
      setError("");
      showToast("Access granted");
    } else {
      setError("Email address does not match this support thread.");
    }
  };

  const handleReplySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !verifiedEmail) return;
    setSendingReply(true);

    try {
      const res = await fetch(`/api/chat/thread/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: replyText,
          email: verifiedEmail
        }),
      });

      const data = await res.json();
      if (data.ok) {
        showToast("Message sent");
        setReplyText("");
        setTicket(data.ticket);
      } else {
        showToast(data.error ?? "Failed to send message");
      }
    } catch {
      showToast("Error sending reply");
    } finally {
      setSendingReply(false);
    }
  };

  const handleSignOut = () => {
    setVerifiedEmail("");
    sessionStorage.removeItem(`thread_auth_${ticketId}`);
    setEmailInput("");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold shadow-lg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Container */}
      <main className="flex-1 flex flex-col justify-center items-center p-4 md:p-6 w-full max-w-3xl mx-auto">
        
        {/* Verification Screen */}
        {!verifiedEmail ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white border border-slate-200/60 rounded-3xl p-6 shadow-xl shadow-slate-100 flex flex-col gap-6"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
                <Lock className="text-blue-600 animate-pulse" size={20} />
              </div>
              <h1 className="text-lg font-bold text-slate-950">Unlock Conversation</h1>
              <p className="text-xs text-slate-500 mt-1 max-w-[280px]">
                Please enter the email address associated with this support inquiry to view messages.
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Your Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-xs outline-none bg-slate-50/50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs leading-relaxed">
                  <ShieldAlert size={14} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading && !ticket}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/10 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
              >
                {loading && !ticket ? (
                  <RefreshCw className="animate-spin" size={12} />
                ) : (
                  <>Continue to Thread</>
                )}
              </button>
            </form>
          </motion.div>
        ) : (
          /* Conversation Thread View */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full bg-white border border-slate-200/60 rounded-3xl shadow-xl shadow-slate-100 flex flex-col overflow-hidden max-h-[82vh] h-full"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/40">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider shrink-0 border ${
                      ticket?.status === "resolved" ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                      : ticket?.status === "in-progress" ? "bg-amber-50 text-amber-600 border-amber-100"
                      : "bg-rose-50 text-rose-600 border-rose-100"
                    }`}>{ticket?.status || "pending"}</span>
                    <span className="text-[10px] text-slate-400 font-medium">Support Thread</span>
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 line-clamp-1">
                    {ticket?.subject || "Support Inquiry"}
                  </h2>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    For {ticket?.contactName} ({ticket?.contactEmail})
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fetchThread()}
                    className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                    title="Refresh thread"
                  >
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-[10px] font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-all shadow-sm"
                  >
                    Lock Thread
                  </button>
                </div>
              </div>
            </div>

            {/* Message Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/30">
              {/* Original Chat context */}
              {ticket?.chatContext && ticket.chatContext.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Original Conversation
                  </span>
                  <div className="rounded-2xl border border-slate-200/50 bg-slate-50/60 p-4 space-y-3 max-h-48 overflow-y-auto shadow-inner">
                    {ticket.chatContext.map((msg, i) => (
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
                            {msg.role === "user" ? "You" : "AI Assistant"}
                          </div>
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Replies Gate */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Support Reply Stream
                </span>
                {ticket?.replies && ticket.replies.length > 0 ? (
                  <div className="space-y-3">
                    {ticket.replies.map((r, i) => (
                      <div
                        key={i}
                        className={`flex ${
                          r.sender === "visitor" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`px-4 py-2.5 rounded-2xl text-xs leading-relaxed max-w-[80%] shadow-sm ${
                            r.sender === "visitor"
                              ? "bg-blue-600 text-white rounded-tr-none"
                              : r.sender === "admin"
                              ? "bg-slate-800 text-white rounded-tl-none"
                              : "bg-slate-100 border border-slate-200 text-slate-800 rounded-tl-none"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4 text-[9px] font-semibold opacity-85 uppercase tracking-wider mb-1">
                            <span>
                              {r.sender === "visitor"
                                ? "You (Visitor)"
                                : r.sender === "admin"
                                ? "System Admin"
                                : "Support Agent"}
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
                  <div className="text-center py-8 border border-dashed border-slate-200 bg-white rounded-2xl text-xs text-slate-400">
                    No active replies yet. The support team will respond shortly.
                  </div>
                )}
              </div>
            </div>

            {/* Reply Footer */}
            <div className="border-t border-slate-100 p-4 bg-white">
              {ticket?.status === "resolved" ? (
                <div className="text-center py-2 px-4 rounded-xl bg-slate-50 border border-slate-100 text-slate-500 text-xs font-semibold flex items-center justify-center gap-2">
                  <CheckCircle className="text-emerald-500" size={14} />
                  <span>This thread has been resolved. You can send a message below to reopen it.</span>
                </div>
              ) : null}

              <form onSubmit={handleReplySubmit} className="flex items-end gap-2 mt-2">
                <textarea
                  required
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your message here..."
                  rows={2}
                  className="flex-1 resize-none px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all placeholder:text-slate-400"
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
              <p className="text-[10px] text-slate-400 mt-2 text-center">
                Your replies are sent directly to the support team inbox. Keep this page open or use the link from your email to follow up.
              </p>
            </div>
          </motion.div>
        )}
      </main>
    </div>
  );
}
