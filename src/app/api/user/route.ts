import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Agent from "@/models/Agent";
import Knowledge from "@/models/Knowledge";
import KnowledgeChunk from "@/models/KnowledgeChunk";
import Quota from "@/models/Quota";
import Inquiry from "@/models/Inquiry";
import VerificationToken from "@/models/VerificationToken";

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    // 1. Authentication Check
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const email = session.user.email.toLowerCase();

    const { searchParams } = new URL(req.url);
    const purgeOnly = searchParams.get("purge") === "true";

    await connectDB();

    // Find all agents owned by this user
    const agents = await Agent.find({ userId });
    const agentIds = agents.map((a) => a._id);

    // Phase 1: Wipe agents, quotas, and knowledge chunks (common to purge and delete)
    await Quota.deleteMany({ agentId: { $in: agentIds } });
    await Knowledge.deleteMany({ userId });
    await KnowledgeChunk.deleteMany({ userId });
    await Agent.deleteMany({ userId });

    if (purgeOnly) {
      console.log(`[user] Purged all agent & knowledge data for user ${userId} (${email})`);
      return NextResponse.json({
        ok: true,
        message: "All agents, knowledge files, vector embeddings, and quotas purged successfully.",
      });
    }

    // Phase 2: Complete Account Deletion (cascade delete user profile, tokens, and support inquiries)
    await Inquiry.deleteMany({ tenantId: userId });
    await VerificationToken.deleteMany({ email });
    await User.findByIdAndDelete(userId);

    console.log(`[user] Permanently deleted account and all associated data for user ${userId} (${email})`);

    return NextResponse.json({
      ok: true,
      message: "Account and all associated data permanently deleted.",
    });

  } catch (err) {
    console.error("[user] DELETE account error:", err);
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : "Internal server error",
    }, { status: 500 });
  }
}
