"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Sparkles, Send, Bot } from "lucide-react";
import Image from "next/image";
import { useLiveChat } from "@/hooks/useLiveChat";
import { cn } from "@/lib/utils";

export function FloatingChatButton() {
  const [chatOpen, setChatOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const persisted = localStorage.getItem("cyberagent_chat_open") === "true";
    setChatOpen(persisted);
  }, []);

  const handleOpen = () => {
    setChatOpen(true);
    localStorage.setItem("cyberagent_chat_open", "true");
  };

  const handleClose = () => {
    setChatOpen(false);
    localStorage.setItem("cyberagent_chat_open", "false");
  };

  const initialMessages = useMemo(() => [{
    id: "welcome-support",
    role: "assistant" as const,
    content: "Welcome to CyberAgent Studio Support! How can I assist you with building, configuring, or deploying your AI agents today?",
  }], []);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useLiveChat({
    agentId: "nexcore-support",
    initialMessages,
  });

  useEffect(() => {
    if (chatOpen) {
      const timer = setTimeout(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages, isLoading, chatOpen]);

  if (!mounted) return null;

  const canSend = input.trim().length > 0 && !isLoading;

  return (
    <>
      {/* ─── Chat Window ─── */}
      {/* Positioned at bottom-6 right-6 (same anchor as button).
          Uses max-h so it never clips on short screens.
          The window replaces the button visually — button is hidden when open. */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            key="chat-window"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed bottom-6 right-6 z-[9999] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
            style={{
              width: "min(380px, calc(100vw - 24px))",
              height: "min(560px, calc(100vh - 80px))",
              maxHeight: "85vh",
            }}
          >
            {/* ── Header (shrink-0, always visible at top) ── */}
            <div
              className="shrink-0 flex items-center justify-between px-4 py-3 bg-slate-50"
              style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}
            >
              {/* Left: avatar + name + status */}
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-50 border border-blue-100"
                  style={{ boxShadow: "0 2px 8px rgba(37,99,235,0.15)" }}
                >
                  <Bot size={14} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-[12.5px] font-semibold leading-none text-slate-800">
                    NexCore AI
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <p className="text-[10px] text-slate-500">Online</p>
                  </div>
                </div>
              </div>

              {/* Right: logo + close button */}
              <div className="flex items-center gap-2">
                <Image
                  src="/assets/logo_final.png"
                  alt="CyberAgent Studio"
                  width={80}
                  height={24}
                  className="h-5 w-auto object-contain opacity-80"
                />
                <button
                  onClick={handleClose}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
                  title="Close support chat"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* ── Chat Body (flex-1, scrollable) ── */}
            <div
              className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-white"
              style={{ minHeight: 0 }}
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.role === "user" ? "justify-end" : "items-end gap-2"
                  )}
                >
                  {msg.role === "assistant" && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-blue-50 border border-blue-100">
                      <Bot size={10} className="text-blue-600" />
                    </div>
                  )}
                  <div className={cn(msg.role === "user" ? "max-w-[85%]" : "max-w-[88%]")}>
                    {msg.role === "assistant" && (
                      <p className="text-[9px] mb-1 font-medium text-slate-400">NexCore AI</p>
                    )}
                    <div
                      className={cn(
                        "px-3.5 py-2.5 text-[12px] leading-relaxed whitespace-pre-wrap break-words",
                        msg.role === "user"
                          ? "rounded-2xl rounded-tr-sm"
                          : "rounded-2xl rounded-tl-sm"
                      )}
                      style={{
                        background: msg.role === "user" ? "#2563eb" : "#f1f5f9",
                        color:      msg.role === "user" ? "#ffffff" : "#1e293b",
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex items-end gap-2">
                  <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-blue-50 border border-blue-100">
                    <Bot size={10} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-[9px] mb-1 font-medium text-slate-400">Thinking…</p>
                    <div className="flex items-center gap-1 px-3 py-2.5 rounded-2xl rounded-tl-sm bg-slate-100">
                      {[0, 150, 300].map((delay) => (
                        <span
                          key={delay}
                          className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                          style={{ animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div ref={endRef} />
            </div>

            {/* ── Input Bar (shrink-0) ── */}
            <form
              onSubmit={handleSubmit}
              className="shrink-0 flex items-center gap-2 px-3.5 py-3 bg-white"
              style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
            >
              <input
                value={input}
                onChange={handleInputChange}
                placeholder={isLoading ? "Waiting for response…" : "Type a message…"}
                disabled={isLoading}
                className="flex-1 text-[11.5px] bg-transparent outline-none disabled:opacity-40 text-slate-800 placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!canSend}
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all disabled:opacity-30 disabled:scale-90"
                style={{
                  background: canSend ? "#2563eb" : "#e2e8f0",
                  boxShadow:  canSend ? "0 0 10px rgba(37,99,235,0.35)" : "none",
                }}
              >
                <Send size={11} style={{ color: canSend ? "#fff" : "#94a3b8" }} />
              </button>
            </form>

            {/* ── Powered-by Footer (shrink-0) ── */}
            <div
              className="shrink-0 flex items-center justify-center gap-1.5 py-2 bg-slate-50"
              style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
            >
              <span className="text-[9px] font-semibold text-slate-400">Powered by</span>
              <Image
                src="/assets/logo_final.png"
                alt="CyberAgent Studio"
                width={60}
                height={16}
                className="h-3 w-auto object-contain opacity-70"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Floating Trigger Button (hidden when chat is open) ─── */}
      <AnimatePresence>
        {!chatOpen && (
          <motion.div
            key="trigger"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            className="fixed bottom-6 right-6 z-[9999] flex flex-col items-center gap-3 select-none"
          >
            {/* "Let's Talk" tooltip */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.2 }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-[11px] font-bold text-slate-800 shadow-lg border border-slate-200/60 pointer-events-none relative"
            >
              <Sparkles size={11} className="text-blue-600 animate-pulse" />
              <span>Let&apos;s Talk</span>
              <div className="absolute w-2 h-2 bg-white border-r border-b border-slate-200/60 rotate-45 -bottom-[5px] left-1/2 -translate-x-1/2" />
            </motion.div>

            {/* Main button */}
            <motion.button
              onClick={handleOpen}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.93 }}
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-700 via-indigo-700 to-indigo-900 text-white shadow-xl flex items-center justify-center relative group overflow-hidden border border-blue-500/30"
              title="Open support chat"
            >
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              <MessageSquare size={20} strokeWidth={2.5} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
