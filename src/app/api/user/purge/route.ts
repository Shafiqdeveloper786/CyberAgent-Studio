import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Agent from "@/models/Agent";
import Knowledge from "@/models/Knowledge";
import KnowledgeChunk from "@/models/KnowledgeChunk";

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    await dbConnect();

    // 1. Delete all knowledge chunks for the user
    const chunkResult = await KnowledgeChunk.deleteMany({ userId });

    // 2. Delete all knowledge bases for the user
    const knowledgeResult = await Knowledge.deleteMany({ userId });

    // 3. Delete all agents created by the user
    const agentResult = await Agent.deleteMany({ userId });

    console.log(`[user/purge] Successfully purged user workspace data for userId: ${userId}. Chunks: ${chunkResult.deletedCount}, Knowledge: ${knowledgeResult.deletedCount}, Agents: ${agentResult.deletedCount}`);

    return NextResponse.json({
      ok: true,
      purged: {
        chunks: chunkResult.deletedCount,
        knowledge: knowledgeResult.deletedCount,
        agents: agentResult.deletedCount,
      }
    });
  } catch (err) {
    console.error("[user/purge] DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
