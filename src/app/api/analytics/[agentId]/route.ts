/**
 * GET /api/analytics/[agentId]
 *
 * Returns real per-agent stats from MongoDB:
 *   - messageCount   — total chat messages received (incremented by /api/chat)
 *   - chunkCount     — knowledge chunks indexed in Atlas
 *   - fileCount      — knowledge files uploaded
 *   - lastMessageAt  — timestamp of most recent chat (null if never used)
 *   - createdAt      — when the agent was created
 *   - status         — active / idle
 *
 * Only the owning user can query their own agents.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Agent from "@/models/Agent";
import Knowledge from "@/models/Knowledge";
import KnowledgeChunk from "@/models/KnowledgeChunk";

type RouteCtx = { params: Promise<{ agentId: string }> };

export async function GET(_req: Request, { params }: RouteCtx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { agentId } = await params;

  try {
    await connectDB();

    /* Verify ownership */
    const agent = await Agent.findOne({ _id: agentId, userId: session.user.id })
      .select("name status themeColor messageCount lastMessageAt createdAt")
      .lean<{
        name:          string;
        status:        string;
        themeColor:    string;
        messageCount:  number;
        lastMessageAt: Date | null;
        createdAt:     Date;
      }>();

    if (!agent) {
      return NextResponse.json({ error: "Agent not found." }, { status: 404 });
    }

    const oAgentId = new mongoose.Types.ObjectId(agentId);
    const oUserId  = new mongoose.Types.ObjectId(session.user.id);

    /* Parallel DB counts + per-agent file-type breakdown */
    const [fileCount, chunkCount, fileTypeCounts] = await Promise.all([
      Knowledge.countDocuments({ agentId: oAgentId, userId: oUserId }),
      KnowledgeChunk.countDocuments({ agentId: oAgentId, userId: oUserId }),
      Knowledge.aggregate([
        { $match: { agentId: oAgentId, userId: oUserId } },
        { $group: { _id: "$fileType", count: { $sum: 1 } } },
      ]) as Promise<Array<{ _id: string; count: number }>>,
    ]);

    const byFileType: Record<string, number> = { pdf: 0, txt: 0, md: 0, url: 0 };
    for (const { _id, count } of fileTypeCounts) {
      if (_id in byFileType) byFileType[_id] = count;
    }

    return NextResponse.json({
      agentId,
      name:          agent.name,
      status:        agent.status,
      themeColor:    agent.themeColor,
      messageCount:  agent.messageCount  ?? 0,
      lastMessageAt: agent.lastMessageAt ?? null,
      fileCount,
      chunkCount,
      byFileType,
      createdAt:     agent.createdAt,
    });
  } catch (err) {
    console.error("[analytics/agentId] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch agent analytics." }, { status: 500 });
  }
}
