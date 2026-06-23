import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SupportTicket from "@/models/SupportTicket";

type RouteCtx = { params: Promise<{ ticketId: string }> };

/* ── GET /api/chat/thread/[ticketId] — public visitor thread view ── */
export async function GET(_req: Request, { params }: RouteCtx) {
  const { ticketId } = await params;

  if (!ticketId || ticketId.length !== 24) {
    return NextResponse.json({ error: "Invalid ticket ID." }, { status: 400 });
  }

  try {
    await connectDB();

    const ticket = await SupportTicket.findById(ticketId)
      .select("contactName contactEmail subject chatContext replies status type createdAt updatedAt")
      .lean();

    if (!ticket) {
      return NextResponse.json({ error: "Thread not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, ticket });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[chat/thread] GET error:", msg);
    return NextResponse.json({ error: "Failed to load thread." }, { status: 500 });
  }
}
