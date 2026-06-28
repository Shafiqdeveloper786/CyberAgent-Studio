import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Agent from "@/models/Agent";
import Message from "@/models/Message";
import { sendAgentWeeklyPerformanceReport } from "@/lib/mailer";
import { logger } from "@/lib/logger";
import type { Types } from "mongoose";

const STOP_WORDS = new Set([
  "the", "is", "at", "which", "on", "a", "an", "and", "to", "of", "for", "in", "that",
  "it", "you", "was", "or", "this", "with", "i", "how", "what", "can", "do", "your",
  "me", "my", "we", "he", "she", "they", "them", "us", "are", "but", "not", "by", "as"
]);

interface AgentLean {
  _id:    Types.ObjectId;
  name:   string;
  userId: { _id: Types.ObjectId; email: string; name: string } | null;
}

export async function GET(req: Request) {
  try {
    // 1. Secret authorization check
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const url = new URL(req.url);
    const querySecret = url.searchParams.get("secret");

    // Allow auth header "Bearer <secret>" or query param "?secret=<secret>"
    const isAuthorized =
      (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
      (cronSecret && querySecret === cronSecret) ||
      process.env.NODE_ENV !== "production"; // allow local manual triggers in dev

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    // 2. Fetch all agents with owner population
    const agents = await Agent.find({})
      .select("name userId")
      .populate("userId", "email name")
      .lean<AgentLean[]>();

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const reportsSent: { agentId: string; agentName: string; toEmail: string }[] = [];

    // 3. Process each agent
    for (const agent of agents) {
      if (!agent.userId?.email) continue;

      // Aggregate messages in the last 7 days
      const weeklyMessages = await Message.find({
        agentId:   agent._id,
        createdAt: { $gte: sevenDaysAgo },
      }).select("text").lean<{ text?: string }[]>();

      const totalMessages = weeklyMessages.length;
      const dailyAverage  = totalMessages / 7;

      // Extract top 3 keywords from text queries
      const wordCounts: Record<string, number> = {};
      for (const msg of weeklyMessages) {
        if (!msg.text) continue;
        const words = msg.text
          .toLowerCase()
          .replace(/[^\w\s]/g, "") // strip punctuation
          .split(/\s+/);

        for (const word of words) {
          const cleanWord = word.trim();
          if (cleanWord.length > 2 && !STOP_WORDS.has(cleanWord)) {
            wordCounts[cleanWord] = (wordCounts[cleanWord] || 0) + 1;
          }
        }
      }

      // Sort and pick top 3
      const topKeywords = Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([word]) => word);

      const weekEndStr   = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const weekStartStr = new Date(sevenDaysAgo).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

      const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/analytics`;

      // Dispatch report email (errors are isolated per-agent — one failure won't stop the rest)
      try {
        await sendAgentWeeklyPerformanceReport({
          toEmail:       agent.userId.email,
          ownerName:     agent.userId.name || "Owner",
          agentName:     agent.name,
          weekStart:     weekStartStr,
          weekEnd:       weekEndStr,
          totalMessages,
          dailyAverage,
          topKeywords,
          dashboardUrl,
        });

        reportsSent.push({
          agentId:   agent._id.toString(),
          agentName: agent.name,
          toEmail:   agent.userId.email,
        });
      } catch (err) {
        logger.error(`[cron] Failed to send report for agent ${agent._id}`, err);
      }
    }

    return NextResponse.json({
      status:    "success",
      processed: reportsSent.length,
      reports:   reportsSent,
    });

  } catch (err) {
    logger.error("[cron] Weekly performance report cron failed", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
