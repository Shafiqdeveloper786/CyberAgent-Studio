import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Agent from "@/models/Agent";
import User from "@/models/User";
import { sendWeeklyReportEmail, WeeklyReportPayload } from "@/lib/mailer";

/* GET /api/weekly-report — trigger weekly report for current user */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const userId = session.user.id;
    const user = await User.findById(userId).lean();
    if (!user?.email) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    // Calculate last week's date range (Monday to Sunday)
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysToLastMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    const lastMonday = new Date(now);
    lastMonday.setUTCDate(now.getUTCDate() + daysToLastMonday - 7);
    lastMonday.setUTCHours(0, 0, 0, 0);
    
    const lastSunday = new Date(lastMonday);
    lastSunday.setUTCDate(lastMonday.getUTCDate() + 6);
    lastSunday.setUTCHours(23, 59, 59, 999);

    const weekStart = lastMonday.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const weekEnd = lastSunday.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    // Get user's agents
    const agents = await Agent.find({ userId }).lean();
    const activeAgents = agents.filter(a => a.status === "active").length;

    // Calculate total messages from last week
    // We'll use messageCount as a proxy (in production, you'd track weekly messages separately)
    const totalMessages = agents.reduce((sum, agent) => sum + (agent.messageCount || 0), 0);

    // Find top performing agent
    let topAgent: { name: string; messages: number } | null = null;
    if (agents.length > 0) {
      const sorted = agents
        .filter(a => a.messageCount > 0)
        .sort((a, b) => (b.messageCount || 0) - (a.messageCount || 0));
      
      if (sorted.length > 0) {
        topAgent = {
          name: sorted[0].name,
          messages: sorted[0].messageCount || 0,
        };
      }
    }

    const payload: WeeklyReportPayload = {
      toEmail: user.email,
      userName: user.name || "User",
      weekStart,
      weekEnd,
      totalMessages,
      activeAgents,
      topAgent,
    };

    // Send email (fire-and-forget)
    sendWeeklyReportEmail(payload).catch(err => {
      console.error("[weekly-report] Failed to send email:", err);
    });

    return NextResponse.json({
      ok: true,
      message: "Weekly report email sent successfully",
      data: {
        weekStart,
        weekEnd,
        totalMessages,
        activeAgents,
        topAgent,
      },
    });
  } catch (err) {
    console.error("[weekly-report] GET error:", err);
    return NextResponse.json(
      { error: "Failed to generate weekly report." },
      { status: 500 }
    );
  }
}

/* POST /api/weekly-report — trigger weekly report for all users (admin/cron) */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { adminKey } = body;

    // Simple admin authentication (use proper auth in production)
    const validAdminKey = process.env.ADMIN_KEY || "admin-secret-key";
    if (adminKey !== validAdminKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all users with agents
    const usersWithAgents = await Agent.aggregate([
      {
        $group: {
          _id: "$userId",
          agentCount: { $sum: 1 },
          totalMessages: { $sum: "$messageCount" },
          agents: {
            $push: {
              name: "$name",
              messageCount: "$messageCount",
              status: "$status",
            },
          },
        },
      },
    ]);

    const results = {
      total: usersWithAgents.length,
      sent: 0,
      failed: 0,
    };

    // Send report to each user
    for (const userData of usersWithAgents) {
      try {
        const user = await User.findById(userData._id).lean();
        if (!user?.email) {
          results.failed++;
          continue;
        }

        const now = new Date();
        const dayOfWeek = now.getUTCDay();
        const daysToLastMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        
        const lastMonday = new Date(now);
        lastMonday.setUTCDate(now.getUTCDate() + daysToLastMonday - 7);
        lastMonday.setUTCHours(0, 0, 0, 0);
        
        const lastSunday = new Date(lastMonday);
        lastSunday.setUTCDate(lastMonday.getUTCDate() + 6);
        lastSunday.setUTCHours(23, 59, 59, 999);

        const weekStart = lastMonday.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        const weekEnd = lastSunday.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        const activeAgents = userData.agents.filter((a: any) => a.status === "active").length;
        
        let topAgent: { name: string; messages: number } | null = null;
        const activeAgentList = userData.agents.filter((a: any) => a.messageCount > 0);
        if (activeAgentList.length > 0) {
          activeAgentList.sort((a: any, b: any) => b.messageCount - a.messageCount);
          topAgent = {
            name: activeAgentList[0].name,
            messages: activeAgentList[0].messageCount,
          };
        }

        const payload: WeeklyReportPayload = {
          toEmail: user.email,
          userName: user.name || "User",
          weekStart,
          weekEnd,
          totalMessages: userData.totalMessages,
          activeAgents,
          topAgent,
        };

        await sendWeeklyReportEmail(payload);
        results.sent++;
      } catch (err) {
        console.error(`[weekly-report] Failed for user ${userData._id}:`, err);
        results.failed++;
      }
    }

    return NextResponse.json({
      ok: true,
      message: "Weekly reports batch completed",
      results,
    });
  } catch (err) {
    console.error("[weekly-report] POST error:", err);
    return NextResponse.json(
      { error: "Failed to send weekly reports." },
      { status: 500 }
    );
  }
}