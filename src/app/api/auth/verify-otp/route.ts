import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import VerificationToken from "@/models/VerificationToken";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/verify-otp
 * Body: { email, token }
 *
 * Pre-validates the OTP and marks the user record.
 * NOTE: This endpoint does NOT create a NextAuth session.
 * The session is created by signIn("otp", { email, token })
 * which calls CredentialsProvider.authorize() in lib/auth.ts.
 *
 * Security:
 *  - Brute-force lockout: 5 wrong attempts → 15-minute lockout.
 *  - Token is NOT consumed here (auth.ts authorize() owns that).
 *    The endpoint is therefore idempotent and does not interfere with
 *    the NextAuth sign-in flow that runs immediately after.
 */

const MAX_OTP_ATTEMPTS = 5;
const OTP_LOCKOUT_MS   = 15 * 60 * 1_000; // 15 minutes

export async function POST(req: Request) {
  /* ── Parse ── */
  const body  = await req.json().catch(() => ({})) as Record<string, unknown>;
  const email = String(body?.email ?? "").toLowerCase().trim();
  const token = String(body?.token ?? "").trim();

  if (!email || !token) {
    return NextResponse.json(
      { error: "Email and verification code are required." },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    /* ── 1. Find token by email only (not value yet) ── */
    const vt = await VerificationToken.findOne({
      email,
      expiresAt: { $gt: new Date() },
    });

    if (!vt) {
      logger.log("[verify-otp] No valid token found");
      return NextResponse.json(
        { valid: false, error: "Invalid or expired verification code. Please request a new one." },
        { status: 400 }
      );
    }

    /* ── 2. Brute-force lockout check ── */
    if (vt.lockedUntil && vt.lockedUntil > new Date()) {
      const remainingMs  = vt.lockedUntil.getTime() - Date.now();
      const remainingMin = Math.ceil(remainingMs / 60_000);
      return NextResponse.json(
        {
          valid: false,
          error: `Too many failed attempts. Please try again in ${remainingMin} minute${remainingMin === 1 ? "" : "s"}, or request a new code.`,
          lockedUntil: vt.lockedUntil.toISOString(),
        },
        { status: 429 }
      );
    }

    /* ── 3. Validate token value ── */
    if (vt.token !== token) {
      const newAttempts = (vt.attempts ?? 0) + 1;
      const shouldLock  = newAttempts >= MAX_OTP_ATTEMPTS;

      await VerificationToken.updateOne(
        { _id: vt._id },
        {
          $set: {
            attempts: newAttempts,
            ...(shouldLock
              ? { lockedUntil: new Date(Date.now() + OTP_LOCKOUT_MS) }
              : {}),
          },
        }
      );

      logger.log(`[verify-otp] Wrong OTP — attempt ${newAttempts}/${MAX_OTP_ATTEMPTS}`);

      const attemptsLeft = MAX_OTP_ATTEMPTS - newAttempts;
      return NextResponse.json(
        {
          valid: false,
          error: shouldLock
            ? "Too many failed attempts. This code has been locked for 15 minutes."
            : `Invalid verification code. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} remaining.`,
          ...(shouldLock ? { lockedForMinutes: 15 } : { attemptsLeft }),
        },
        { status: 400 }
      );
    }

    /* ── 4. Token is valid — return success (auth.ts will consume the token) ── */
    logger.log(`[verify-otp] OTP validated OK`);

    return NextResponse.json({ valid: true });

  } catch (err) {
    logger.error("[verify-otp] Error", err);
    return NextResponse.json(
      { error: "Verification failed. Please try again." },
      { status: 500 }
    );
  }
}
