import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Agent from "@/models/Agent";
import Knowledge from "@/models/Knowledge";
import KnowledgeChunk from "@/models/KnowledgeChunk";
import Quota from "@/models/Quota";
import Message from "@/models/Message";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteCtx) {
  try {
    const session = await getServerSession(authOptions);

    // 1. Authentication Check
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // 2. Admin Whitelist Verification
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    if (!adminEmail || session.user.email.toLowerCase() !== adminEmail) {
      return NextResponse.json({ ok: false, error: "Forbidden — not an admin" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ ok: false, error: "Agent ID is required" }, { status: 400 });
    }

    const body = await req.json();
    const { action } = body;

    await connectDB();

    const agent = await Agent.findById(id);
    if (!agent) {
      return NextResponse.json({ ok: false, error: "Agent not found" }, { status: 404 });
    }

    switch (action) {
      case "toggle": {
        const newStatus = agent.status === "active" ? "inactive" : "active";
        agent.status = newStatus;
        await agent.save();
        console.log(`[admin] Agent ${id} toggled to ${newStatus}`);
        return NextResponse.json({ ok: true, status: newStatus });
      }

      case "purge": {
        // Delete all metadata Knowledge records for this agent
        await Knowledge.deleteMany({ agentId: agent._id });
        // Delete all text chunks and vector embeddings for this agent
        const chunkResult = await KnowledgeChunk.deleteMany({ agentId: agent._id });
        console.log(`[admin] Agent ${id} knowledge base purged. Chunks removed: ${chunkResult.deletedCount}`);
        return NextResponse.json({ ok: true, deletedCount: chunkResult.deletedCount });
      }

      case "quota": {
        // Reset count fields on Agent model
        agent.messageCount = 0;
        agent.dailyMessageCount = 0;
        await agent.save();
        
        // Delete daily Quota records for this agent
        await Quota.deleteMany({ agentId: agent._id });
        console.log(`[admin] Agent ${id} message quotas reset`);
        return NextResponse.json({ ok: true });
      }

      case "update_limits": {
        const { messageCount, dailyLimit, isUnlimited, last24hUsage } = body;
        if (typeof messageCount === "number") {
          agent.messageCount = messageCount;
        }
        if (typeof dailyLimit === "number") {
          agent.dailyLimit = dailyLimit;
        }
        if (typeof isUnlimited === "boolean") {
          agent.isUnlimited = isUnlimited;
        }
        await agent.save();

        const todayUTC = new Date().toISOString().split("T")[0];
        const activeCount = typeof last24hUsage === "number" ? last24hUsage : messageCount;

        await Quota.updateOne(
          { agentId: agent._id, date: todayUTC },
          {
            $set: {
              ...(typeof activeCount === "number" ? { count: activeCount } : {}),
              ...(typeof dailyLimit === "number" ? { dailyLimit } : {}),
              ...(typeof isUnlimited === "boolean" ? { isUnlimited } : {}),
            }
          }
        );

        // Adjust Message collection for last 24h usage override
        if (typeof last24hUsage === "number") {
          const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const current24hMessages = await Message.find({
            agentId: agent._id,
            createdAt: { $gte: twentyFourHoursAgo }
          }).sort({ createdAt: 1 });

          const currentCount = current24hMessages.length;

          if (last24hUsage > currentCount) {
            const toAdd = last24hUsage - currentCount;
            const newDocs = Array.from({ length: toAdd }).map(() => ({
              agentId: agent._id,
              createdAt: new Date(),
            }));
            await Message.insertMany(newDocs);
          } else if (last24hUsage < currentCount) {
            const toDeleteCount = currentCount - last24hUsage;
            const idsToDelete = current24hMessages
              .slice(0, toDeleteCount)
              .map(m => m._id);
            await Message.deleteMany({ _id: { $in: idsToDelete } });
          }
        }

        console.log(`[admin] Agent ${id} limits updated`);
        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ ok: false, error: `Invalid action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    console.error("[admin] Agent PATCH error:", err);
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : "Internal server error",
    }, { status: 500 });
  }
}
