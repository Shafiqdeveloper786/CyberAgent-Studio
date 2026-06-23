import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import SupportTicket from "@/models/SupportTicket";
import { sendVisitorReplyEmail } from "@/lib/email";

type RouteCtx = { params: Promise<{ id: string }> };

/* ── POST /api/admin/support/[id]/reply — admin replies to a ticket ── */
export async function POST(req: Request, { params }: RouteCtx) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    if (!adminEmail || session.user.email.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Forbidden — not an admin" }, { status: 403 });
    }

    const { id } = await params;
    let body: { message?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    const message = String(body.message ?? "").trim();
    if (!message) {
      return NextResponse.json({ error: "Message cannot be empty." }, { status: 400 });
    }

    await connectDB();
    const ticket = await SupportTicket.findById(id);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }

    ticket.replies.push({
      sender:    "admin",
      message,
      timestamp: new Date(),
    });
    /* Auto-set to in-progress when admin first replies */
    if (ticket.status === "pending") {
      ticket.status = "in-progress";
    }
    await ticket.save();

    /* ── For external tickets: email the visitor ── */
    if (ticket.type === "external" && ticket.contactEmail) {
      const adminName = session.user.name || "Support Team";
      sendVisitorReplyEmail(
        ticket.contactEmail,
        ticket.contactName || "Visitor",
        adminName,
        message,
        String(ticket._id),
        ticket.subject
      ).catch((e) => console.error("[admin-support-reply] Visitor email failed:", e));
    }

    console.log(`[admin-support] Admin replied to ticket ${id} (type=${ticket.type})`);
    return NextResponse.json({ ok: true, ticket });
  } catch (err) {
    console.error("[admin-support] Reply error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
