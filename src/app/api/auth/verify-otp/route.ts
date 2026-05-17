import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import VerificationToken from "@/models/VerificationToken";
import User from "@/models/User";

/**
 * POST /api/auth/verify-otp
 * Body: { email, token }
 *
 * Validates the OTP and creates / updates the user record in MongoDB.
 * Returns { valid: true, user: { id, email, name, isVerified } } on success.
 *
 * This endpoint does NOT create a NextAuth session.
 * The session is created by signIn("otp", { email, token })
 * which calls CredentialsProvider.authorize() in lib/auth.ts.
 */
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

  /* ── DB operations ── */
  try {
    await connectDB();

    /* ── 1. Find a valid, unexpired OTP ── */
    const vt = await VerificationToken.findOne({
      email,
      token,
      expiresAt: { $gt: new Date() },
    });

    if (!vt) {
      console.log(`[verify-otp] Invalid/expired OTP for ${email}`);
      return NextResponse.json(
        { valid: false, error: "Invalid or expired verification code. Please request a new one." },
        { status: 400 }
      );
    }

    console.log(`[verify-otp] OTP valid for ${email}`);

    /* ── 2. Upsert user in MongoDB ──
       - New user  → create with authMethod: "email", isVerified: true
       - Existing  → mark isVerified: true (covers cases where they previously
                     failed verification)
    */
    const name = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") || "user";

    const dbUser = await User.findOneAndUpdate(
      { email },
      {
        $set:         { isVerified: true },
        $setOnInsert: {
          name,
          authMethod:   "email",
          role:         "user",
          subscription: "free",
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`[verify-otp] User upserted: ${dbUser._id} (${email})`);

    /* ── 3. Return success ── */
    return NextResponse.json({
      valid: true,
      user: {
        id:         dbUser._id.toString(),
        email:      dbUser.email,
        name:       dbUser.name,
        isVerified: dbUser.isVerified,
        authMethod: dbUser.authMethod,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[verify-otp] Error:", msg);
    return NextResponse.json(
      { error: "Verification failed. Please try again.", detail: msg },
      { status: 500 }
    );
  }
}
