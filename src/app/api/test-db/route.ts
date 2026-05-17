/**
 * GET /api/test-db
 * Diagnostic endpoint — tests MongoDB connectivity with full status report.
 * ⚠ Remove or protect this route before deploying to production.
 */
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";

const STATE_LABELS: Record<number, string> = {
  0: "disconnected",
  1: "connected",
  2: "connecting",
  3: "disconnecting",
};

function parseError(err: Error): { code: string; hint: string } {
  const msg = err.message;

  if (/DNS_SRV_FAILED/i.test(msg)) {
    return {
      code: "DNS_SRV_FAILED",
      hint:
        "The MongoDB Atlas SRV DNS record cannot be resolved. " +
        "This is almost always one of:\n\n" +
        "  ① CLUSTER IS PAUSED  ← most likely\n" +
        "      → Open atlas.mongodb.com\n" +
        "      → Find your cluster and click RESUME\n" +
        "      → Free M0 clusters pause after 7 days idle\n\n" +
        "  ② Wrong hostname in MONGODB_URI\n" +
        "      → In Atlas, click Connect → Drivers → copy the connection string\n" +
        "      → Replace MONGODB_URI in .env.local with that string\n" +
        "      → Append /cyberagent before the ?\n\n" +
        "  ③ ISP/network blocks SRV DNS queries\n" +
        "      → Try on a mobile hotspot\n" +
        "      → PowerShell: Resolve-DnsName -Type SRV _mongodb._tcp.cluster0.iyq6mvn.mongodb.net",
    };
  }
  if (/ATLAS_AUTH|auth failed|SCRAM/i.test(msg)) {
    return {
      code: "AUTH_FAILED",
      hint: "Username or password is wrong.\n→ Atlas → Database Access → verify the db user credentials.\n→ Check MONGODB_URI in .env.local for typos.",
    };
  }
  if (/ATLAS_TIMEOUT|timed out/i.test(msg)) {
    return {
      code: "TIMEOUT",
      hint: "Connection timed out.\n→ Atlas → Network Access → ensure 0.0.0.0/0 is saved.\n→ Cluster may still be resuming — wait 30 s and retry.",
    };
  }
  return {
    code: "UNKNOWN",
    hint: "Check terminal logs for the raw error.",
  };
}

export async function GET() {
  const start = Date.now();

  const rawUri  = process.env.MONGODB_URI ?? "";
  const maskedUri = rawUri
    .replace(/\/\/([^:]+):([^@]+)@/, "//$1:****@")
    .replace(/\?.*$/, "?…");

  try {
    await connectDB();

    return NextResponse.json({
      ok:        true,
      status:    STATE_LABELS[mongoose.connection.readyState] ?? "unknown",
      host:      mongoose.connection.host,
      database:  mongoose.connection.name,
      latencyMs: Date.now() - start,
      uri:       maskedUri || "(not set)",
    });
  } catch (err) {
    const error   = err instanceof Error ? err : new Error(String(err));
    const { code, hint } = parseError(error);

    return NextResponse.json(
      {
        ok:        false,
        errorCode: code,
        error:     error.message.split("\n")[0], // first line only — rest is in hint
        hint,
        latencyMs: Date.now() - start,
        uri:       maskedUri || "(not set)",
        actions: [
          "atlas.mongodb.com → Clusters → Is the cluster RUNNING? (green dot)",
          "atlas.mongodb.com → Network Access → Is 0.0.0.0/0 listed?",
          "atlas.mongodb.com → Database Access → Does the user have readWriteAnyDatabase?",
          ".env.local → MONGODB_URI ends with /cyberagent?retryWrites=true&w=majority",
        ],
      },
      { status: 502 }
    );
  }
}
