import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Agent from "@/models/Agent";
import Quota from "@/models/Quota";
import Message from "@/models/Message";

/**
 * GET /api/admin — returns dashboard-wide admin metrics.
 *
 * Access limited to the email specified in ADMIN_EMAIL env var.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // Must be logged in
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Must match the admin email whitelist
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    console.log("[admin] Session email:", session.user.email);
    console.log("[admin] Admin email from env:", adminEmail);
    if (!adminEmail || session.user.email.toLowerCase() !== adminEmail) {
      return NextResponse.json({ 
        error: "Forbidden — not an admin",
        details: `Logged in as: ${session.user.email}, Required: ${adminEmail}`
      }, { status: 403 });
    }

    await connectDB();

    const [totalUsers, verifiedUsers, totalAgents, activeAgents, inactiveAgents] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ isVerified: true }),
      Agent.countDocuments({}),
      Agent.countDocuments({ status: "active" }),
      Agent.countDocuments({ status: "inactive" }),
    ]);

    // Calculate total messages from quotas
    const totalMessages = await Quota.aggregate([
      { $group: { _id: null, total: { $sum: "$count" } } }
    ]).then(result => result[0]?.total || 0);

    const recentUsers = await User.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .select("name email isVerified role createdAt authMethod isBlocked subscription")
      .lean();

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const usage24h = await Message.aggregate([
      { $match: { createdAt: { $gte: twentyFourHoursAgo } } },
      { $group: { _id: "$agentId", count: { $sum: 1 } } }
    ]);
    const usageMap = new Map(usage24h.map(item => [item._id.toString(), item.count]));

    const dbAgents = await Agent.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .select("name persona status messageCount dailyLimit isUnlimited createdAt userId")
      .populate("userId", "email name")
      .lean();

    const agents = dbAgents.map(agent => ({
      ...agent,
      usage24h: usageMap.get(agent._id.toString()) || 0,
    }));

    // Generate user growth data (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" }
          },
          signups: { $sum: 1 }
        }
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 }
      },
      {
        $project: {
          month: {
            $concat: [
              { $toString: "$_id.year" },
              "-",
              {
                $cond: [
                  { $lt: ["$_id.month", 10] },
                  { $concat: ["0", { $toString: "$_id.month" }] },
                  { $toString: "$_id.month" }
                ]
              }
            ]
          },
          signups: 1
        }
      }
    ]);

    return NextResponse.json({
      metrics: {
        totalUsers,
        verifiedUsers,
        totalAgents,
        activeAgents,
        inactiveAgents,
        totalMessages,
      },
      analytics: {
        userGrowth: userGrowth || [],
        agentDistribution: {
          active: activeAgents,
          inactive: inactiveAgents
        }
      },
      recentUsers,
      agents,
    }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    console.error("[admin] GET error:", err);
    const errorMessage = err instanceof Error ? err.message : "Internal server error";
    console.error("[admin] Full error:", err);
    return NextResponse.json({ 
      error: errorMessage,
      stack: err instanceof Error ? err.stack : undefined,
      metrics: null,
      analytics: null,
      recentUsers: [],
      agents: []
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
