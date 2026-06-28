/**
 * Centralized logging utility with environment-based gating.
 *
 * Rules:
 *   - log / info / warn  →  development only (never emitted in production)
 *   - error              →  always emitted, but detail args are suppressed in
 *                           production to prevent PII / sensitive-data exposure
 *
 * Usage:
 *   import { logger } from "@/lib/logger";
 *   logger.log("[chat] slot claimed");           // dev only
 *   logger.error("[auth] DB failure", err);      // prod: label only; dev: full
 */

const isProd = process.env.NODE_ENV === "production";

export const logger = {
  /** Verbose debug — development only */
  log: (...args: unknown[]): void => {
    if (!isProd) console.log(...args);
  },

  /** Informational — development only */
  info: (...args: unknown[]): void => {
    if (!isProd) console.log(...args);
  },

  /** Warnings — development only */
  warn: (...args: unknown[]): void => {
    if (!isProd) console.warn(...args);
  },

  /**
   * Errors — always emitted.
   *
   * In production only the `label` (first arg) is written so that PII-heavy
   * detail (user emails, raw query text, stack traces) never appears in
   * Vercel / production log streams.
   */
  error: (label: string, ...rest: unknown[]): void => {
    if (isProd) {
      console.error(label); // label only — no PII detail
    } else {
      console.error(label, ...rest);
    }
  },
};
