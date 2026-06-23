import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SupportTicket from "@/models/SupportTicket";

type RouteCtx = { params: Promise<{ ticketId: string }> };

/* ── POST /api/chat/thread/[ticketId]/reply — visitor reply via web page ── */
export async function POST(req: Request, { params }: RouteCtx) {
  const { ticketId } = await params;

  if (!ticketId || ticketId.length !== 24) {
    return NextResponse.json({ error: "Invalid ticket ID." }, { status: 400 });
  }

  let body: { message?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const message = String(body.message ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();

  if (!message || !email) {
    return NextResponse.json(
      { error: "Message and email verification are required." },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      return NextResponse.json({ error: "Thread not found." }, { status: 404 });
    }

    /* Verification gate: email must match the ticket's contactEmail */
    if (ticket.contactEmail.toLowerCase() !== email) {
      return NextResponse.json(
        { error: "Verification failed. Email does not match this thread." },
        { status: 403 }
      );
    }

    ticket.replies.push({
      sender:    "visitor",
      message,
      timestamp: new Date(),
    });

    /* Re-open resolved tickets when visitor replies */
    if (ticket.status === "resolved") {
      ticket.status = "pending";
    }
    await ticket.save();

    console.log(`[chat/thread] ✓ Visitor replied to thread ${ticketId} via page`);
    return NextResponse.json({ ok: true, ticket });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[chat/thread] Reply error:", msg);
    return NextResponse.json({ error: "Failed to send reply." }, { status: 500 });
  }
}
