/**
 * src/lib/internalToken.ts
 *
 * Server-side utility for generating and verifying the internal-preview HMAC
 * token. Used by:
 *   - Dashboard/admin widget preview (sender)  → getInternalPreviewToken()
 *   - /api/chat route (verifier)               → detectInternalTraffic()
 *
 * The token is HMAC-SHA256(NEXTAUTH_SECRET, "internal-preview").
 * Only callers with knowledge of NEXTAUTH_SECRET can produce a valid token,
 * making it impossible for external clients to spoof internal traffic.
 *
 * ⚠  Server-side ONLY — never import this in client components.
 */

import { createHmac } from "crypto";

/**
 * Returns the HMAC token for the x-internal-preview header.
 * Call this on the server (API route or Server Component) and pass the
 * result as a header when making chat requests from admin/preview contexts.
 */
export function getInternalPreviewToken(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) throw new Error("[internalToken] NEXTAUTH_SECRET is not set.");
  return createHmac("sha256", secret).update("internal-preview").digest("hex");
}
