import crypto from "crypto";

/**
 * Generates a secure prefixed API key.
 * Format: 4u_live_<48 random hex chars>  (56 chars total)
 * Uses Node.js crypto — safe to call from server-side code only.
 */
export function generateApiKey(): string {
  return "4u_live_" + crypto.randomBytes(24).toString("hex");
}
