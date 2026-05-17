import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Agent from "@/models/Agent";

/* ══════════════════════════════════════════════════════
   PATCH /api/agents/[id]/toggle
   Flips the agent's status between "active" and "inactive".
   Only the owner of the agent may toggle it.
══════════════════════════════════════════════════════ */
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: agentId } = await params;

  try {
    await connectDB();

    const agent = await Agent.findOne({
      _id:    agentId,
      userId: session.user.id,
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found." }, { status: 404 });
    }

    const newStatus = agent.status === "active" ? "inactive" : "active";
    agent.status    = newStatus;
    await agent.save();

    console.log(`[agents] ✓ Toggled agent ${agentId} → ${newStatus}`);
    return NextResponse.json({ status: newStatus, agent });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[agents] toggle error:", msg);
    return NextResponse.json({ error: "Failed to toggle agent status." }, { status: 500 });
  }
}
