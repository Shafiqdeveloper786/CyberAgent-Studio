/**
 * src/lib/sessionMiddleware.ts
 *
 * Shared session resolution helper for all API routes.
 * Returns a clean result object — never throws — so every
 * route handler can fail gracefully without unhandled rejections.
 */

import { getServerSession } from "next-auth";
import { authOptions }     from "@/lib/auth";
import connectDB           from "@/lib/mongodb";
import User                from "@/models/User";

export interface TenantSession {
  tenantId: string;
  email:    string;
  name:     string;
  role:     string;
}

export type SessionResult =
  | { ok: true;  tenant: TenantSession }
  | { ok: false; status: 401 | 403; error: string };

/**
 * Resolve the current Next-Auth session and return structured tenant info.
 * Also hydrates `email` and `name` directly from MongoDB to avoid partial
 * session objects that can cause Mongoose validation failures.
 */
export async function getTenantFromSession(): Promise<SessionResult> {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return { ok: false, status: 401, error: "Unauthorized — no active session." };
    }

    const tenantId = session.user.id;

    /* Hydrate real user details from DB to guarantee non-empty strings */
    await connectDB();
    const dbUser = await User.findById(tenantId)
      .select("email name role")
      .lean<{ email: string; name: string; role: string }>();

    if (!dbUser) {
      return { ok: false, status: 401, error: "Unauthorized — user not found." };
    }

    return {
      ok: true,
      tenant: {
        tenantId,
        email: dbUser.email || session.user.email || "user@cyberagent.studio",
        name:  dbUser.name  || session.user.name  || "User",
        role:  dbUser.role  || "user",
      },
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[sessionMiddleware] Error resolving session:", msg);
    return { ok: false, status: 401, error: "Session resolution failed." };
  }
}
