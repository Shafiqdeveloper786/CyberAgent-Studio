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
 * Additions over the original:
 *  - Handles 429 "DAILY_LIMIT_REACHED" responses from /api/chat
 *  - Exposes isLimitReached + limitResetAt so WidgetChat can render a
 *    live countdown without full page context
 */
export function useLiveChat({ agentId, initialMessages = [] }: Options) {
  const [messages,       setMessages]       = useState<ChatMessage[]>(initialMessages);
  const [input,          setInput]          = useState("");
  const [isLoading,      setIsLoading]      = useState(false);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [limitResetAt,   setLimitResetAt]   = useState<string | null>(null);
  const [limitMessage,   setLimitMessage]   = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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

      /* Push ONLY the user message — the assistant bubble is added lazily
         when the first stream chunk arrives, eliminating the empty ghost bubble. */
      setMessages((prev) => [...prev, userMsg]);

      const history = [...messages, userMsg].map((m) => ({
        role:    m.role,
        content: m.content,
      }));

      abortRef.current?.abort();
      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/chat", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ messages: history, agentId }),
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
            /* No placeholder exists — push the limit bubble directly. */
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
            /* No placeholder — push the error message directly. */
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

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (!chunk) continue;

          if (firstChunk) {
            /* First real content — create the assistant bubble now (no ghost) */
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
        /* No placeholder to update — push the error message directly. */
        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: "assistant", content: "Network error. Please try again." },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, isLimitReached, messages, agentId]
  );

  const clearMessages = useCallback(() => {
    setMessages(initialMessages);
    setIsLimitReached(false);
    setLimitResetAt(null);
    setLimitMessage(null);
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
    clearMessages,
  };
}
