import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SupportTicket from "@/models/SupportTicket";
import { sendVisitorReplyEmail } from "@/lib/email";
import { getTenantFromSession } from "@/lib/sessionMiddleware";

type RouteCtx = { params: Promise<{ id: string }> };

/* ── POST /api/inquiries/[id]/reply — tenant replies to a visitor ── */
export async function POST(req: Request, { params }: RouteCtx) {
  const result = await getTenantFromSession();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const { tenantId, name: replierName } = result.tenant;

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

    /* SECURITY: only allow tenant to reply to their own external ticket */
    const ticket = await SupportTicket.findOne({
      _id:      id,
      type:     "external",
      tenantId: tenantId,
    });

    if (!ticket) {
      return NextResponse.json({ error: "Inquiry not found." }, { status: 404 });
    }

    ticket.replies.push({
      sender:    "user",
      message,
      timestamp: new Date(),
    });
    if (ticket.status === "pending") {
      ticket.status = "in-progress";
    }
    await ticket.save();

    /* ── Email the visitor with the deep link ── */
    sendVisitorReplyEmail(
      ticket.contactEmail,
      ticket.contactName || "Visitor",
      replierName,
      message,
      String(ticket._id),
      ticket.subject
    ).catch((e) => console.error("[inquiries-reply] Visitor email failed:", e));

    console.log(`[inquiries] Tenant replied to inquiry ${id} → visitor email queued`);
    return NextResponse.json({ ok: true, ticket });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[inquiries] Reply error:", msg);
    return NextResponse.json({ error: "Failed to send reply." }, { status: 500 });
  }
}
