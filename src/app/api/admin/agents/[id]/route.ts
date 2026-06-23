import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Agent from "@/models/Agent";
import Knowledge from "@/models/Knowledge";

/**
 * PATCH /api/admin/agents/[id] — Toggle agent status, update quota, or purge knowledge.
 * Body: { action: "toggle" } | { action: "quota", messageCount: number } | { action: "purge" }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    if (!adminEmail || session.user.email.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { action } = body;

    await dbConnect();

    if (action === "toggle") {
      const agent = await Agent.findById(id).select("status");
      if (!agent) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }

      const newStatus = agent.status === "active" ? "inactive" : "active";
      await Agent.findByIdAndUpdate(id, { status: newStatus });

      return NextResponse.json({ status: newStatus });
    }

    if (action === "quota") {
      const { messageCount } = body;
      if (typeof messageCount !== "number" || messageCount < 0) {
        return NextResponse.json({ error: "Invalid messageCount" }, { status: 400 });
      }

      await Agent.findByIdAndUpdate(id, { messageCount });

      return NextResponse.json({ success: true, messageCount });
    }

    if (action === "purge") {
      const deleted = await Knowledge.deleteMany({ agentId: id });
      return NextResponse.json({ success: true, deletedCount: deleted.deletedCount });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[admin/agents] PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
