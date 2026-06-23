import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import SupportTicket from "@/models/SupportTicket";
import { sendVisitorReplyEmail } from "@/lib/email";

type RouteCtx = { params: Promise<{ id: string }> };

/* ── POST /api/support/[id]/reply — tenant or user replies to a ticket ── */
export async function POST(req: Request, { params }: RouteCtx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const message = String(body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
  }

  try {
    await connectDB();

    /* For internal tickets: user must own it. For external: tenant must own it. */
    const ticket = await SupportTicket.findOne({
      _id: id,
      $or: [
        { userId:   session.user.id },
        { tenantId: session.user.id },
      ],
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }

    ticket.replies.push({
      sender:    "user",
      message,
      timestamp: new Date(),
    });
    ticket.status = "pending"; /* Re-open if was resolved */
    await ticket.save();

    /* ── For external tickets: email the visitor ── */
    if (ticket.type === "external" && ticket.contactEmail) {
      const replierName = session.user.name || "Support Team";
      sendVisitorReplyEmail(
        ticket.contactEmail,
        ticket.contactName || "Visitor",
        replierName,
        message,
        String(ticket._id),
        ticket.subject
      ).catch((e) => console.error("[support-reply] Visitor email failed:", e));
    }

    console.log(`[support] User replied to ticket ${id} (type=${ticket.type})`);
    return NextResponse.json({ ok: true, ticket });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[support] User reply error:", msg);
    return NextResponse.json({ error: "Failed to add reply." }, { status: 500 });
  }
}
