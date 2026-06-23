/**
 * src/lib/cron.ts
 *
 * Node-cron scheduler for background jobs.
 *
 * Jobs:
 *  1. Weekly Performance Reports — Every Monday at 08:00 (UTC)
 *
 * This module is imported once by src/lib/mongodb.ts so that the scheduler
 * starts only after the DB connection is ready.
 *
 * NOTE: node-cron runs inside the same Node.js process as the Next.js server.
 *       In serverless deployments (Vercel etc.) this will NOT run automatically.
 *       In those cases, use Upstash QStash and call GET /api/admin/weekly-report
 *       with Authorization: Bearer <CRON_SECRET>.
 */

import cron from "node-cron";

let schedulerStarted = false;

/**
 * Call this once after the DB connection is established.
 * Idempotent — additional calls are no-ops.
 */
export function startScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;

  // ──────────────────────────────────────────────────────────────────
  // Job 1: Weekly Performance Report
  // Runs every Monday at 08:00 UTC
  // Cron expression: minute hour day-of-month month day-of-week
  // ──────────────────────────────────────────────────────────────────
  cron.schedule(
    "0 8 * * 1", // 08:00 UTC on Mondays
    async () => {
      console.log("[cron] 🔔 Triggering weekly performance report job…");
      try {
        const baseUrl =
          process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
        const secret = process.env.CRON_SECRET || "";

        const res = await fetch(`${baseUrl}/api/admin/weekly-report`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${secret}`,
          },
        });

        const data = (await res.json()) as {
          ok?: boolean;
          sent?: number;
          errors?: number;
          message?: string;
          error?: string;
        };

        if (data.ok) {
          console.log(`[cron] ✓ Weekly report complete — ${data.message}`);
        } else {
          console.error("[cron] ✗ Weekly report API error:", data.error);
        }
      } catch (err) {
        console.error("[cron] ✗ Weekly report job failed:", err);
      }
    },
    {
      timezone: "UTC",
    }
  );

  console.log("[cron] ✓ Scheduler started — weekly report: every Monday 08:00 UTC");
}
