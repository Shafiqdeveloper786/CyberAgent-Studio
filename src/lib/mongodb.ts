/**
 * lib/mongodb.ts — Network-Resilient MongoDB Connection Singleton
 *
 * Hardened layers:
 *  • new URL() credential sanitiser — re-encodes user/pass before connect
 *  • SRV format detection + direct-format hint when SRV fails
 *  • family:4 + dns ipv4first — dual IPv4 enforcement (ISP/VPN safe)
 *  • 60 s timeouts — survives Atlas M0 cold-start resume (15–25 s)
 *  • ping + test upsert — proves full TCP round-trip AND write path
 *  • err.name / err.code / err.stack in debug block — exact error class
 */

import mongoose from "mongoose";
import dns       from "dns";

import User              from "@/models/User";
import VerificationToken from "@/models/VerificationToken";
import Quota             from "@/models/Quota";

/* ════════════════════════════════════════════════════
   Boot-time snapshot
════════════════════════════════════════════════════ */
console.log(`[mongodb] Node.js  : ${process.version}`);
console.log(`[mongodb] Mongoose : v${mongoose.version}`);

/* Force all Node.js DNS queries through Google's public resolvers.
   This bypasses the local/ISP DNS server that is actively refusing
   SRV-type queries (ECONNREFUSED on _mongodb._tcp.* lookups).
   Must be called before any DNS resolution happens. */
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
dns.setDefaultResultOrder("ipv4first");

/* ════════════════════════════════════════════════════
   1.  Validate raw URI
════════════════════════════════════════════════════ */
const RAW_URI = (process.env.MONGODB_URI ?? "").trim();

if (!RAW_URI) {
  throw new Error(
    "\n[mongodb] ✗ MONGODB_URI is missing from .env.local\n" +
    "  Expected: mongodb+srv://<user>:<pass>@cluster0.xxxx.mongodb.net/cyberagent" +
    "?retryWrites=true&w=majority"
  );
}
if (!RAW_URI.startsWith("mongodb://") && !RAW_URI.startsWith("mongodb+srv://")) {
  throw new Error(
    `\n[mongodb] ✗ MONGODB_URI is not a valid connection string.\n` +
    `  Got: ${RAW_URI.slice(0, 60)}…`
  );
}

/* ════════════════════════════════════════════════════
   2.  URI sanitiser — parses with WHATWG URL, re-encodes
       credentials, and hands back a clean string.
       Falls back to the raw URI if the parser chokes
       (e.g. a truly malformed string).
════════════════════════════════════════════════════ */
function sanitizeUri(raw: string): string {
  try {
    const url      = new URL(raw);
    /* decodeURIComponent first so we don't double-encode an already-encoded value */
    url.username   = encodeURIComponent(decodeURIComponent(url.username));
    url.password   = encodeURIComponent(decodeURIComponent(url.password));
    const clean    = url.toString();
    if (clean !== raw) {
      console.log("[mongodb] URI credentials were re-encoded by sanitiser.");
    } else {
      console.log("[mongodb] ✓ URI parsed cleanly — no re-encoding needed.");
    }
    return clean;
  } catch (e) {
    console.warn(
      "[mongodb] ⚠ new URL() could not parse the URI — using raw string.\n" +
      "  Parser error:", e instanceof Error ? e.message : e
    );
    return raw;
  }
}

const MONGODB_URI = sanitizeUri(RAW_URI);

/* ════════════════════════════════════════════════════
   3.  Password special-character check (belt & suspenders)
════════════════════════════════════════════════════ */
(function warnOnUnsafePassword(uri: string) {
  const m = uri.match(/\/\/([^:]+):([^@]+)@/);
  if (!m) return;
  const rawPass     = m[2];
  const needsEncode = /[@#:/=?&+ ]/.test(rawPass);
  if (needsEncode) {
    console.warn(
      "[mongodb] ⚠ PASSWORD still contains special characters after sanitisation.\n" +
      `  Encoded form: ${encodeURIComponent(rawPass)}\n` +
      "  Update MONGODB_URI in .env.local with the encoded password."
    );
  } else {
    console.log("[mongodb] ✓ Password is URL-safe.");
  }
})(MONGODB_URI);

/* Masked URI — safe for logs */
const maskedUri  = MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@");
const isSrvUri   = MONGODB_URI.startsWith("mongodb+srv://");
const dbNameInUri = /mongodb(\+srv)?:\/\/[^/]+\/[^?#]+/.test(MONGODB_URI);

console.log(`[mongodb] URI    : ${maskedUri}`);
console.log(`[mongodb] Format : ${isSrvUri ? "mongodb+srv (DNS SRV)" : "mongodb:// (direct)"}`);

if (!dbNameInUri) {
  console.warn(
    "[mongodb] ⚠ No database name in URI — defaulting to 'test'.\n" +
    "  Fix: …mongodb.net/cyberagent?retryWrites=true&w=majority"
  );
}
if (isSrvUri) {
  console.log(
    "[mongodb] ℹ SRV format requires a working DNS SRV lookup.\n" +
    "  If you hit DB_UNREACHABLE with VPN ON, switch to the direct format:\n" +
    "  Atlas → Connect → Drivers → select driver version '3.11 or earlier' → copy URI"
  );
}

/* ════════════════════════════════════════════════════
   4.  Post-connection initialiser
       • admin ping   — full TCP/TLS round-trip proof
       • test upsert  — proves the write path is open
       • createCollection — materialises collections in Atlas UI
════════════════════════════════════════════════════ */
async function initCollections(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) {
    console.warn("[mongodb] ⚠ initCollections: db handle is null — skipping.");
    return;
  }

  /* ── Admin ping ── */
  try {
    await db.admin().command({ ping: 1 });
    console.log("[mongodb] ✓ Atlas ping successful");
  } catch (pingErr) {
    console.warn("[mongodb] ⚠ Admin ping failed (non-fatal):", pingErr instanceof Error ? pingErr.message : pingErr);
  }

  /* ── Test write — proves DB is writable ── */
  try {
    const result = await db.collection("users").updateOne(
      { email: "test@nexus.com" },
      { $set: { email: "test@nexus.com", name: "Test User", isVerified: true } },
      { upsert: true }
    );
    console.log(
      "[mongodb] ✓ TEST USER SYNC SUCCESSFUL" +
      (result.upsertedId ? ` — upsertedId: ${result.upsertedId}` : " — document already existed, updated in place")
    );
  } catch (writeErr) {
    console.error("[mongodb] ✗ Test write FAILED:", writeErr instanceof Error ? writeErr.message : writeErr);
  }

  /* ── Ensure collections + indexes exist ── */
  try {
    await Promise.all([
      User.createCollection(),
      VerificationToken.createCollection(),
      Quota.createCollection(),
    ]);
    console.log("[mongodb] ✓ Collections ensured: users, verificationtokens, quotas");
  } catch (colErr) {
    const msg = colErr instanceof Error ? colErr.message : String(colErr);
    console.warn("[mongodb] ⚠ createCollection warning (non-fatal):", msg);
  }

  /* ── Ensure Quota compound unique index exists on Atlas ──
     This runs on every cold-start and is idempotent — if the index
     already exists MongoDB is a no-op. Without this call the index
     defined in the schema is not guaranteed to be built before the
     first write, allowing duplicate (agentId, date) documents.       */
  try {
    await Quota.createIndexes();
    console.log("[mongodb] ✓ Quota indexes synced: { agentId, date } unique");
  } catch (idxErr) {
    const msg = idxErr instanceof Error ? idxErr.message : String(idxErr);
    console.warn("[mongodb] ⚠ Quota index sync warning (non-fatal):", msg);
  }
}

/* ════════════════════════════════════════════════════
   5.  Singleton cache (survives Next.js HMR reloads)
════════════════════════════════════════════════════ */
interface MongooseCache {
  conn:    typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}
declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: MongooseCache | undefined;
}
const cache: MongooseCache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cache;

/* ════════════════════════════════════════════════════
   6.  connectDB
════════════════════════════════════════════════════ */
export async function connectDB(): Promise<typeof mongoose> {

  if (cache.conn && mongoose.connection.readyState === 1) {
    return cache.conn;
  }

  if (!cache.promise) {
    console.log("[mongodb] Connecting to MongoDB Atlas…");

    cache.promise = mongoose
      .connect(MONGODB_URI, {
        dbName:                   "CyberAgentStudio",
        bufferCommands:           false,
        maxPoolSize:              10,
        minPoolSize:              1,
        connectTimeoutMS:         60_000,
        serverSelectionTimeoutMS: 60_000,
        socketTimeoutMS:          60_000,
        heartbeatFrequencyMS:     10_000,
        maxIdleTimeMS:            60_000,
        family:                   4,   // AF_INET only — skip IPv6 entirely
      })
      .then(async (m) => {
        console.log(
          `[mongodb] ✓ Successfully connected to MongoDB Atlas\n` +
          `  Host : ${mongoose.connection.host}\n` +
          `  DB   : ${mongoose.connection.name}`
        );
        await initCollections();
        return m;
      })
      .catch((err: Error) => {
        cache.promise = null;
        cache.conn    = null;

        const raw     = err.message ?? String(err);
        const lower   = raw.toLowerCase();
        const errCode = (err as NodeJS.ErrnoException).code ?? "n/a";

        /* ── Full diagnostic dump ── */
        console.log("--- MONGODB DEBUG START ---");
        console.log("Error name          :", err.name);
        console.log("Error code          :", errCode);
        console.log("Error message       :", raw);
        console.log("URI present         :", !!process.env.MONGODB_URI);
        console.log("URI format          :", isSrvUri ? "mongodb+srv" : "mongodb://");
        console.log("DB name in URI      :", dbNameInUri);
        console.log("Mongoose readyState :", mongoose.connection.readyState);
        console.log("Full stack          :\n", err.stack ?? "(no stack)");
        console.log("--- MONGODB DEBUG END ---");

        console.error(`[mongodb] MongoDB Connection Error: ${raw}`);

        /* DNS / network */
        if (/querysrv|econnrefused|enotfound|eai_again|nxdomain/i.test(lower)) {
          const srvHint = isSrvUri
            ? " If VPN is ON and still failing, switch to the direct (non-SRV) connection string: Atlas → Connect → Drivers → 3.11 or earlier."
            : "";
          throw new Error(
            "DB_UNREACHABLE: Cannot resolve MongoDB Atlas hostname." +
            " Check: (1) Cluster is RUNNING at atlas.mongodb.com, (2) Network Access has 0.0.0.0/0," +
            " (3) DNS is set to 8.8.8.8 / 8.8.4.4." +
            srvHint + `\nRaw: ${raw}`
          );
        }

        /* Auth */
        if (/auth failed|scram|bad auth|authentication/i.test(lower)) {
          throw new Error(
            `DB_AUTH_FAILED: MongoDB authentication failed (${errCode}).\n` +
            `  Verify MONGODB_URI username & password.\nRaw: ${raw}`
          );
        }

        /* Timeout */
        if (/timed out|etimedout|timeout/i.test(lower)) {
          throw new Error(
            `DB_TIMEOUT: MongoDB connection timed out (${errCode}).\n` +
            `  Cluster may still be resuming — wait 30 s and retry.\nRaw: ${raw}`
          );
        }

        /* No server */
        if (/serverselectionerror|no servers/i.test(lower)) {
          throw new Error(
            `DB_NO_SERVER: No MongoDB server available (${errCode}).\n` +
            `  Cluster may be paused — open Atlas and click Resume.\nRaw: ${raw}`
          );
        }

        /* Parse error */
        if (/mongoparse|invalid connection string|invalid scheme/i.test(lower)) {
          throw new Error(
            `DB_PARSE_ERROR: MongoDB URI could not be parsed (${errCode}).\n` +
            `  Check MONGODB_URI in .env.local for typos.\nRaw: ${raw}`
          );
        }

        throw new Error(`DB_ERROR (${errCode}): ${raw}`);
      });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}

export default connectDB;
