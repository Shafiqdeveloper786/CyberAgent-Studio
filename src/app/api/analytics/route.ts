import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Agent from "@/models/Agent";
import Knowledge from "@/models/Knowledge";
import KnowledgeChunk from "@/models/KnowledgeChunk";

/* GET /api/analytics — real counts from MongoDB */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const oUserId = new mongoose.Types.ObjectId(session.user.id);

    const [totalAgents, totalFiles, totalChunks] = await Promise.all([
      Agent.countDocuments({ userId: oUserId }),
      Knowledge.countDocuments({ userId: oUserId }),
      KnowledgeChunk.countDocuments({ userId: oUserId }),
    ]);

    /* Active agents = agents with at least one knowledge chunk */
    const activeAgentIds = await KnowledgeChunk.distinct("agentId", { userId: oUserId });

    /* File-type breakdown for the doughnut chart — ObjectId match required */
    const fileTypeCounts = await Knowledge.aggregate([
      { $match: { userId: oUserId } },
      { $group: { _id: "$fileType", count: { $sum: 1 } } },
    ]) as Array<{ _id: string; count: number }>;

    const byFileType = { pdf: 0, txt: 0, md: 0, url: 0 } as Record<string, number>;
    for (const { _id, count } of fileTypeCounts) {
      if (_id in byFileType) byFileType[_id] = count;
    }

    return NextResponse.json({
      totalAgents,
      totalFiles,
      totalChunks,
      activeAgents: activeAgentIds.length,
      byFileType,
    });
  } catch (err) {
    console.error("[analytics] GET error:", err);
    return NextResponse.json({ error: "Failed to fetch analytics." }, { status: 500 });
  }
}
