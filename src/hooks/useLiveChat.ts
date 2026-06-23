"use client";

import { useState, useCallback, useRef } from "react";

export interface ChatMessage {
  id:      string;
  role:    "user" | "assistant";
  content: string;
  /** Marks a synthetic message injected when the daily rate-limit is hit */
  type?:    "limit";
  /** ISO timestamp of the next daily reset — set on type="limit" messages */
  resetAt?: string;
}

interface Options {
  agentId?: string | null;
  initialMessages?: ChatMessage[];
}

/**
 * Minimal streaming chat hook — compatible with AI SDK v6's
 * toTextStreamResponse() which sends a plain text stream.
 *
 * Additions:
 *  - Handles 429 "DAILY_LIMIT_REACHED" responses
 *  - Exposes isLimitReached + limitResetAt for live countdown
 *  - Tracks ticketSubmitted + isTicketBookingInProgress for idempotency (TASK 2)
 */
export function useLiveChat({ agentId, initialMessages = [] }: Options) {
  const [messages,       setMessages]       = useState<ChatMessage[]>(initialMessages);
  const [input,          setInput]          = useState("");
  const [isLoading,      setIsLoading]      = useState(false);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [limitResetAt,   setLimitResetAt]   = useState<string | null>(null);
  const [limitMessage,   setLimitMessage]   = useState<string | null>(null);
  const [ticketSubmitted, setTicketSubmitted] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const ticketLockRef = useRef(false);
  /* ── TASK 2: Idempotency lock — prevents concurrent createTicket calls ── */
  const isBookingRef = useRef(false);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value),
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const text = input.trim();
      if (!text || isLoading || isLimitReached) return;

      setInput("");
      setIsLoading(true);

      const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: text };
      const assistantId = `a-${Date.now()}`;

      setMessages((prev) => [...prev, userMsg]);

      const history = [...messages, userMsg].map((m) => ({
        role:    m.role,
        content: m.content,
      }));

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      /* ── TASK 2: If ticket is locked, inject a "already submitted" message
         at the client level to avoid any server-side call. ── */
      if (ticketLockRef.current) {
        setIsLoading(false);
        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: "assistant", content: "I have already submitted your request. Our team will contact you shortly." },
        ]);
        return;
      }

      try {
        const res = await fetch("/api/chat", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            messages: history,
            agentId,
            ticketLocked: ticketLockRef.current,
          }),
          signal:  abortRef.current.signal,
        });

        /* ── Non-streaming error responses ── */
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({
            error: "Request failed.",
          })) as {
            error?:       string;
            code?:        string;
            message?:     string;
            resetAt?:     string;
            resetIn?:     string;
            resetsInMs?:  number;
            secondsLeft?: number;
          };

          const isLimitError =
            res.status === 429 ||
            res.status === 423 ||
            errBody.code === "LIMIT_EXCEEDED";

          if (isLimitError) {
            const limitMsg = errBody.message ?? "Daily message limit reached.";
            setMessages((prev) => [
              ...prev,
              {
                id:      assistantId,
                role:    "assistant",
                content: limitMsg,
                type:    "limit" as const,
                resetAt: errBody.resetAt,
              },
            ]);
            setIsLimitReached(true);
            setLimitResetAt(errBody.resetAt ?? null);
            setLimitMessage(limitMsg);
          } else {
            setMessages((prev) => [
              ...prev,
              {
                id:      assistantId,
                role:    "assistant",
                content: errBody.message ?? errBody.error ?? "Something went wrong. Please try again.",
              },
            ]);
          }
          return;
        }

        /* ── Plain text stream ── */
        const reader  = res.body!.getReader();
        const decoder = new TextDecoder();
        let   firstChunk = true;
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (!chunk) continue;

          fullContent += chunk;

          /* ── Detect ticket creation response → lock future calls ── */
          if (fullContent.includes("successfully submitted") ||
              fullContent.includes("being reviewed by our team") ||
              fullContent.includes("Thank you! Your support ticket")) {
            ticketLockRef.current = true;
            setTicketSubmitted(true);
          }

          if (firstChunk) {
            firstChunk = false;
            setMessages((prev) => [
              ...prev,
              { id: assistantId, role: "assistant", content: chunk },
            ]);
          } else {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + chunk } : m
              )
            );
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: "assistant", content: "Network error. Please try again." },
        ]);
      } finally {
        setIsLoading(false);
        isBookingRef.current = false;
      }
    },
    [input, isLoading, isLimitReached, messages, agentId]
  );

  const clearMessages = useCallback(() => {
    setMessages(initialMessages);
    setIsLimitReached(false);
    setLimitResetAt(null);
    setLimitMessage(null);
    setTicketSubmitted(false);
    ticketLockRef.current = false;
    isBookingRef.current = false;
  }, [initialMessages]);

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    isLimitReached,
    limitResetAt,
    limitMessage,
    ticketSubmitted,
    clearMessages,
  };
}