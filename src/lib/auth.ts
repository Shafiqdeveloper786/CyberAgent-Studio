import { type NextAuthOptions } from "next-auth";
import GoogleProvider      from "next-auth/providers/google";
import CredentialsProvider  from "next-auth/providers/credentials";
import connectDB from "./mongodb";
import User from "@/models/User";
import VerificationToken from "@/models/VerificationToken";
import Notification from "@/models/Notification";


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

          /* ── Validate OTP ── */
          const vt = await VerificationToken.findOne({
            email,
            token,
            expiresAt: { $gt: new Date() },
          });

          if (!vt) {
            console.log(`[auth] OTP invalid/expired for ${email}`);
            return null;
          }

          /* ── Consume token (one-time use) ── */
          await VerificationToken.deleteOne({ _id: vt._id });

          /* ── Upsert user — set isVerified: true on every successful OTP ── */
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

          console.log(`[auth] OTP sign-in OK: ${dbUser._id} (${email})`);

          return {
            id:    dbUser._id.toString(),
            email: dbUser.email,
            name:  dbUser.name,
            image: dbUser.image ?? null,
          };
        } catch (err) {
          console.error("[auth] OTP authorize error:", err);
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

      try {
        await connectDB();
        const email = user.email.toLowerCase();

        // 1. Check if user is blocked
        let dbUser = await User.findOne({ email });
        if (dbUser && dbUser.isBlocked) {
          console.log(`[auth] Sign-in blocked for user: ${email}`);
          return false;
        }

        // 2. For Google provider, perform the upsert here
        if (account?.provider === "google") {
          dbUser = await User.findOneAndUpdate(
            { email },
            {
              $set: {
                name:       user.name  ?? "",
                image:      user.image ?? "",
                isVerified: true,
              },
              $setOnInsert: {
                authMethod:   "google",
                role:         "user",
                subscription: "free",
              },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
          console.log(`[auth] Google sign-in OK: ${email}`);
        }

        // 3. Trigger welcome notification if not already sent
        if (dbUser) {
          const welcomeNotif = await Notification.findOne({
            userId: dbUser._id,
            type: "welcome",
          });
          if (!welcomeNotif) {
            await Notification.create({
              userId: dbUser._id,
              type: "welcome",
              message: "Welcome to CyberAgent Studio! Start building your customized AI agents now.",
              isRead: false,
            });
            console.log(`[auth] Sent welcome notification to user: ${dbUser._id}`);
          }
        }

        return true;
      } catch (err) {
        console.error("[auth] signIn callback error:", err);
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
          }>();

          if (dbUser) {
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
