import { type NextAuthOptions } from "next-auth";
import GoogleProvider      from "next-auth/providers/google";
import CredentialsProvider  from "next-auth/providers/credentials";
import connectDB from "./mongodb";
import User from "@/models/User";
import VerificationToken from "@/models/VerificationToken";
import { logger } from "@/lib/logger";

/** Maximum wrong-OTP attempts before the token is locked */
const MAX_OTP_ATTEMPTS  = 5;
/** How long a locked token stays locked (15 minutes in ms) */
const OTP_LOCKOUT_MS    = 15 * 60 * 1_000;

export const authOptions: NextAuthOptions = {
  providers: [
    /* ══════════════════════════════════════
       1. Google OAuth
    ══════════════════════════════════════ */
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),

    /* ══════════════════════════════════════
       2. Email OTP (via CredentialsProvider)
       Called by: signIn("otp", { email, token })
    ══════════════════════════════════════ */
    CredentialsProvider({
      id:   "otp",
      name: "Email OTP",
      credentials: {
        email: { label: "Email", type: "email" },
        token: { label: "Code",  type: "text"  },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.token) return null;

        const email = credentials.email.toLowerCase().trim();
        const token = credentials.token.trim();

        try {
          await connectDB();

          /* ── 1. Find token by email (without checking token value yet) ── */
          const vt = await VerificationToken.findOne({
            email,
            expiresAt: { $gt: new Date() },
          });

          if (!vt) {
            logger.log("[auth] OTP not found or expired");
            return null;
          }

          /* ── 2. Brute-force lockout check ── */
          if (vt.lockedUntil && vt.lockedUntil > new Date()) {
            const remainingMs  = vt.lockedUntil.getTime() - Date.now();
            const remainingMin = Math.ceil(remainingMs / 60_000);
            logger.warn(`[auth] OTP locked — ${remainingMin}m remaining`);
            return null;
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
            logger.log(`[auth] OTP wrong — attempt ${newAttempts}/${MAX_OTP_ATTEMPTS}`);
            return null;
          }

          /* ── 4. Correct OTP — check blocked BEFORE consuming token ── */
          const dbUser = await User.findOneAndUpdate(
            { email },
            {
              $set:         { isVerified: true },
              $setOnInsert: {
                name:         email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") || "user",
                authMethod:   "email",
                role:         "user",
                subscription: "free",
              },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );

          if (dbUser.isBlocked) {
            logger.log("[auth] Blocked user sign-in rejected");
            return null;
          }

          /* ── 5. Consume token (one-time use) ── */
          await VerificationToken.deleteOne({ _id: vt._id });

          logger.log(`[auth] OTP sign-in OK: ${dbUser._id}`);

          return {
            id:    dbUser._id.toString(),
            email: dbUser.email,
            name:  dbUser.name,
            image: dbUser.image ?? null,
          };
        } catch (err) {
          logger.error("[auth] OTP authorize error", err);
          return null;
        }
      },
    }),
  ],

  session: { strategy: "jwt" },
  secret:  process.env.NEXTAUTH_SECRET,

  pages: {
    signIn: "/auth",
    error:  "/auth",
  },

  callbacks: {
    /* ══════════════════════════════════════
       signIn: upsert Google users in MongoDB.
       Credentials users are already upserted in authorize().
    ══════════════════════════════════════ */
    async signIn({ user, account }) {
      if (!user.email) return false;

      /* Credentials: already handled in authorize() */
      if (account?.type === "credentials") return true;

      /* Google OAuth: upsert with latest profile data */
      try {
        await connectDB();

        // Check if user is blocked before logging them in
        const existingUser = await User.findOne({ email: user.email.toLowerCase() });
        if (existingUser?.isBlocked) {
          console.log(`[auth] Google sign-in rejected for blocked user ${user.email}`);
          return false;
        }

        await User.findOneAndUpdate(
          { email: user.email.toLowerCase() },
          {
            $set: {
              name:       user.name  ?? "",
              image:      user.image ?? "",
              isVerified: true,   // Google verifies email identity
            },
            $setOnInsert: {
              authMethod:   "google",
              role:         "user",
              subscription: "free",
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        console.log(`[auth] Google sign-in OK: ${user.email}`);
        return true;
      } catch (err) {
        console.error("[auth] Google signIn callback error:", err);
        return false;
      }
    },

    /* ══════════════════════════════════════
       jwt: embed MongoDB fields into token
       (only runs when `user` is populated,
       i.e. on the first sign-in of a session)
    ══════════════════════════════════════ */
    async jwt({ token, user }) {
      if (user?.email) {
        try {
          await connectDB();

          const dbUser = await User.findOne({
            email: user.email.toLowerCase(),
          }).lean<{
            _id:          object;
            role:         string;
            subscription: string;
            authMethod:   string;
            isVerified:   boolean;
            isBlocked?:   boolean;
          }>();

          if (dbUser) {
            if (dbUser.isBlocked) {
              console.log(`[auth] Session invalidated for blocked user: ${user.email}`);
              return {}; // Return empty token to invalidate session
            }
            token.userId       = dbUser._id.toString();
            token.role         = dbUser.role;
            token.subscription = dbUser.subscription;
            token.authMethod   = dbUser.authMethod;
            token.isVerified   = dbUser.isVerified;
          }
        } catch (err) {
          console.error("[auth] jwt callback error:", err);
        }
      }
      return token;
    },

    /* ══════════════════════════════════════
       session: expose fields to the client
    ══════════════════════════════════════ */
    async session({ session, token }) {
      if (session.user) {
        session.user.id           = (token.userId       as string)  ?? "";
        session.user.role         = (token.role         as string)  ?? "user";
        session.user.subscription = (token.subscription as string)  ?? "free";
      }
      return session;
    },
  },
};
