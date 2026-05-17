import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Agent from "@/models/Agent";
import { generateApiKey } from "@/lib/apiKey";

/* ══════════════════════════════════════
   GET /api/agents
   Returns all agents owned by the caller.
══════════════════════════════════════ */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();
    const agents = await Agent.find({ userId: session.user.id })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ agents });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[agents] GET error:", msg);
    return NextResponse.json({ error: "Failed to fetch agents." }, { status: 500 });
  }
}

/* ══════════════════════════════════════
   POST /api/agents
   Creates a new agent for the caller.
   An API key is auto-generated at creation time.
══════════════════════════════════════ */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    name?:           string;
    persona?:        string;
    themeColor?:     string;
    welcomeMessage?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "Agent name is required." }, { status: 400 });
  }

  try {
    await connectDB();

    /* ── Free-plan cap: max 1 agent ── */
    const userSub = (session.user as { subscription?: string }).subscription ?? "free";
    if (userSub === "free") {
      const existingAgentsCount = await Agent.countDocuments({ userId: session.user.id });
      if (existingAgentsCount >= 1) {
        return NextResponse.json(
          {
            message: "Free tier limit reached. You can only create 1 Agent per account.",
            error:   "Free tier limit reached. You can only create 1 Agent per account.",
          },
          { status: 403 }
        );
      }
    }

    const agent = await Agent.create({
      userId:         session.user.id,
      name,
      persona:        String(body.persona        ?? "").trim() || "Tech Support Expert",
      themeColor:     body.themeColor     ?? "#00f2ff",
      welcomeMessage: body.welcomeMessage ?? "",
      status:         "active",
      apiKey:         generateApiKey(),
    });
    console.log(`[agents] ✓ Created agent "${name}" (id=${agent._id}) for user ${session.user.id}`);
    return NextResponse.json({ agent }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[agents] POST error:", msg);
    return NextResponse.json({ error: "Failed to create agent." }, { status: 500 });
  }
}
