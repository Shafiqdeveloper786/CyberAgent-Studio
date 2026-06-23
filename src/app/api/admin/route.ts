import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Agent from "@/models/Agent";

/**
 * GET /api/admin — returns dashboard-wide admin metrics + analytics.
 *
 * Access limited to the email specified in ADMIN_EMAIL env var.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    if (!adminEmail || session.user.email.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Forbidden — not an admin" }, { status: 403 });
    }

    await dbConnect();

    const [totalUsers, verifiedUsers, totalAgents, activeAgents, inactiveAgents] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ isVerified: true }),
      Agent.countDocuments({}),
      Agent.countDocuments({ status: "active" }),
      Agent.countDocuments({ status: "inactive" }),
    ]);

    /* ── User growth: signups per month for last 6 months ── */
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const userGrowthRaw = await User.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const userGrowth = userGrowthRaw.map((g) => ({
      month: `${g._id.year}-${String(g._id.month).padStart(2, "0")}`,
      signups: g.count,
    }));

    /* ── Message throughput: total messages across all agents ── */
    const messageThroughputRaw = await Agent.aggregate([
      {
        $group: {
          _id: null,
          totalMessages: { $sum: "$messageCount" },
        },
      },
    ]);
    const totalMessages = messageThroughputRaw[0]?.totalMessages ?? 0;

    /* ── Recent users (with isBlocked) ── */
    const recentUsers = await User.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .select("name email isVerified isBlocked role createdAt authMethod subscription")
      .lean();

    /* ── Agents list ── */
    const agents = await Agent.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .select("name persona status messageCount createdAt userId")
      .populate("userId", "email name")
      .lean();

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
        userGrowth,
        agentDistribution: {
          active: activeAgents,
          inactive: inactiveAgents,
        },
      },
      recentUsers,
      agents,
    });
  } catch (err) {
    console.error("[admin] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}