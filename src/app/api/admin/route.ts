import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Agent from "@/models/Agent";

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
    if (!adminEmail || session.user.email.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Forbidden — not an admin" }, { status: 403 });
    }

    await connectDB();

    const [totalUsers, verifiedUsers, totalAgents, activeAgents] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ isVerified: true }),
      Agent.countDocuments({}),
      Agent.countDocuments({ status: "active" }),
    ]);

    const recentUsers = await User.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .select("name email isVerified role createdAt authMethod")
      .lean();

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
      },
      recentUsers,
      agents,
    });
  } catch (err) {
    console.error("[admin] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
