import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import VerificationToken from "@/models/VerificationToken";
import { sendOtpEmail, verifySmtp, SmtpError } from "@/lib/email";

const EMAIL_RE      = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT_MS = 60_000;      // 60 s between requests per email
const OTP_EXPIRY_MS = 10 * 60_000; // OTP valid for 10 min

/* ── Classify a DB error string into a short user-facing message ── */
function dbErrorMessage(raw: string): { message: string; code: string } {
  if (/DB_UNREACHABLE|querysrv|econnrefused|enotfound/i.test(raw)) {
    return {
      code:    "DB_UNREACHABLE",
      message:
        "Cannot reach MongoDB Atlas. Possible causes: " +
        "(1) Cluster is paused — resume it at atlas.mongodb.com. " +
        "(2) ISP is blocking DNS — change to Google DNS (8.8.8.8 / 8.8.4.4) or use a VPN.",
    };
  }
  if (/DB_AUTH_FAILED|auth failed|scram/i.test(raw)) {
    return {
      code:    "DB_AUTH_FAILED",
      message: "Database authentication failed. Check the username and password in your connection string.",
    };
  }
  if (/DB_TIMEOUT|timed out|etimedout/i.test(raw)) {
    return {
      code:    "DB_TIMEOUT",
      message: "Database connection timed out. The cluster may still be resuming — wait 30 s and try again.",
    };
  }
  if (/DB_NO_SERVER|no servers/i.test(raw)) {
    return {
      code:    "DB_NO_SERVER",
      message: "No database server found. Your Atlas cluster may be paused — click Resume in the Atlas dashboard.",
    };
  }
  if (/DB_PARSE_ERROR|mongoparse|invalid connection string|invalid scheme/i.test(raw)) {
    return {
      code:    "DB_PARSE_ERROR",
      message: "MongoDB URI could not be parsed. Check MONGODB_URI in .env.local for typos.",
    };
  }
  return {
    code:    "DB_ERROR",
    message: "A database error occurred. Check the server logs for details.",
  };
}

export async function POST(req: Request) {

  /* ════════════════════════════════════════════════
     Guard 1 — environment variables must be present
  ════════════════════════════════════════════════ */
  if (!process.env.MONGODB_URI) {
    console.error("[send-otp] ✗ MONGODB_URI is not defined in .env.local");
    return NextResponse.json(
      {
        error: "Server configuration error: MONGODB_URI is missing.",
        code:  "CONFIG_ERROR",
      },
      { status: 500 }
    );
  }

  /* ════════════════════════════════════════════════
     Guard 2 — parse & validate the request body
  ════════════════════════════════════════════════ */
  let email: string;
  try {
    const body = await req.json();
    email = String(body?.email ?? "").toLowerCase().trim();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body. Expected JSON with an email field.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  if (!email) {
    return NextResponse.json(
      { error: "Email address is required.", code: "MISSING_EMAIL" },
      { status: 400 }
    );
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Invalid email format. Please enter a valid email address.", code: "INVALID_EMAIL" },
      { status: 400 }
    );
  }

  /* ════════════════════════════════════════════════
     Step 1 — connect to MongoDB and create the OTP
             (isolated try-catch so DB vs email
              failures return different error codes)
  ════════════════════════════════════════════════ */
  let otp: string;

  try {
    await connectDB();

    /* Rate-limit: one OTP request per 60 s per email */
    const recent = await VerificationToken.findOne({
      email,
      createdAt: { $gt: new Date(Date.now() - RATE_LIMIT_MS) },
    });

    if (recent) {
      const retryIn = Math.ceil(
        (recent.createdAt.getTime() + RATE_LIMIT_MS - Date.now()) / 1000
      );
      return NextResponse.json(
        {
          error: `Too many requests. Please wait ${retryIn}s before requesting another code.`,
          code:  "RATE_LIMITED",
        },
        { status: 429 }
      );
    }

    /* Delete any existing tokens for this address */
    await VerificationToken.deleteMany({ email });

    /* Generate a 6-digit OTP */
    otp = Math.floor(100_000 + Math.random() * 900_000).toString();

    await VerificationToken.create({
      email,
      token:     otp,
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    });

    console.log(`[send-otp] ✓ OTP stored for ${email}`);
  } catch (dbErr) {
    const isErr  = dbErr instanceof Error;
    const raw    = isErr ? dbErr.message : String(dbErr);
    const name   = isErr ? dbErr.name   : "UnknownError";
    const stack  = isErr ? (dbErr.stack ?? raw) : raw;
    const syscode = isErr ? ((dbErr as NodeJS.ErrnoException).code ?? "n/a") : "n/a";

    console.error("[send-otp] ✗ DB connection failed");
    console.error("  Error name  :", name);
    console.error("  Error code  :", syscode);
    console.error("  Message     :", raw);
    console.error("  Stack trace :\n", stack);

    const { message, code } = dbErrorMessage(raw);
    return NextResponse.json({ error: message, code, detail: raw }, { status: 500 });
  }

  /* ════════════════════════════════════════════════
     Step 2 — verify SMTP config first, then send.
             Verifying first separates "Gmail not
             configured" from "delivery failed".
  ════════════════════════════════════════════════ */
  try {
    /* Verify SMTP credentials before attempting to send */
    await verifySmtp();

    /* Send the branded email */
    await sendOtpEmail(email, otp);

    console.log(`[send-otp] ✓ Email dispatched to ${email}`);

    return NextResponse.json({
      success: true,
      message: "Verification code sent. Check your inbox (and spam folder).",
    });
  } catch (emailErr) {
    /* Roll back the stored OTP so the user can retry cleanly */
    await VerificationToken.deleteMany({ email }).catch(() => {});

    if (emailErr instanceof SmtpError) {
      console.error(`[send-otp] SMTP error (${emailErr.code}): ${emailErr.raw}`);
      return NextResponse.json(
        {
          error:  emailErr.message,
          code:   emailErr.code,
          detail: emailErr.raw,
        },
        { status: 502 }
      );
    }

    const raw = emailErr instanceof Error ? emailErr.message : String(emailErr);
    console.error(`[send-otp] Unknown email error: ${raw}`);
    return NextResponse.json(
      {
        error:  "Failed to send verification email. Please try again.",
        code:   "EMAIL_ERROR",
        detail: raw,
      },
      { status: 502 }
    );
  }
}
