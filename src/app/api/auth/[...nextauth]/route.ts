/* ─────────────────────────────────────────────────────────────
   force-dynamic is CRITICAL for NextAuth in Next.js 15 / 16.
   Without it the App Router may statically pre-render this
   segment and return an HTML page instead of JSON, causing:
     • 404 on /api/auth/* routes
     • CLIENT_FETCH_ERROR
     • SyntaxError: Unexpected token '<'
───────────────────────────────────────────────────────────── */
export const dynamic = "force-dynamic";

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
