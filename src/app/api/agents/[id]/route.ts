import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Agent from "@/models/Agent";
import { generateApiKey } from "@/lib/apiKey";

type RouteCtx = { params: Promise<{ id: string }> };

/* ══════════════════════════════════════
   GET /api/agents/[id]
   Returns a single agent (including apiKey).
   Lazy-generates an apiKey for legacy agents that don't have one.
══════════════════════════════════════ */
export async function GET(_req: Request, { params }: RouteCtx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await connectDB();

    let agent = await Agent.findOne({ _id: id, userId: session.user.id });
    if (!agent) {
      return NextResponse.json({ error: "Agent not found." }, { status: 404 });
    }

    /* Lazy-generate apiKey for agents created before this feature */
    if (!agent.apiKey) {
      agent.apiKey = generateApiKey();
      await agent.save();
      console.log(`[agents] ✓ Lazy-generated apiKey for agent ${id}`);
    }

    return NextResponse.json({ agent });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[agents] GET[id] error:", msg);
    return NextResponse.json({ error: "Failed to fetch agent." }, { status: 500 });
  }
}

/* ══════════════════════════════════════
   PATCH /api/agents/[id]
   Update name / persona / themeColor / welcomeMessage.
   Only the owning user can update.
══════════════════════════════════════ */
export async function PATCH(req: Request, { params }: RouteCtx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let body: Record<string, string>;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  /* regenerateApiKey=true in body triggers a new key */
  if (body.regenerateApiKey === "true") {
    try {
      await connectDB();
      const agent = await Agent.findOneAndUpdate(
        { _id: id, userId: session.user.id },
        { $set: { apiKey: generateApiKey() } },
        { new: true }
      );
      if (!agent) return NextResponse.json({ error: "Agent not found." }, { status: 404 });
      console.log(`[agents] ✓ Regenerated apiKey for agent ${id}`);
      return NextResponse.json({ agent });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  const allowed = ["name", "persona", "themeColor", "theme", "welcomeMessage", "status"] as const;
  const updates: Partial<Record<typeof allowed[number], string>> = {};
  for (const key of allowed) {
    if (typeof body[key] === "string") updates[key] = body[key];
  }
  if (updates.name !== undefined) {
    updates.name = updates.name.trim();
    if (!updates.name) return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
  }

  try {
    await connectDB();
    const agent = await Agent.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { $set: updates },
      { new: true }
    );
    if (!agent) return NextResponse.json({ error: "Agent not found." }, { status: 404 });

    console.log(`[agents] ✓ Updated agent ${id}`);
    return NextResponse.json({ agent });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[agents] PATCH error:", msg);
    return NextResponse.json({ error: "Failed to update agent." }, { status: 500 });
  }
}

/* ══════════════════════════════════════
   DELETE /api/agents/[id]
   Only the owning user can delete their agent.
══════════════════════════════════════ */
export async function DELETE(_req: Request, { params }: RouteCtx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await connectDB();
    const deleted = await Agent.findOneAndDelete({ _id: id, userId: session.user.id });
    if (!deleted) return NextResponse.json({ error: "Agent not found." }, { status: 404 });

    console.log(`[agents] ✓ Deleted agent ${id}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[agents] DELETE error:", msg);
    return NextResponse.json({ error: "Failed to delete agent." }, { status: 500 });
  }
}
