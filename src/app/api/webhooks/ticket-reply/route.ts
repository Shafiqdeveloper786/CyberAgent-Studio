import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SupportTicket from "@/models/SupportTicket";

/* ── POST /api/webhooks/ticket-reply — inbound email reply sync ──────────────
   This endpoint is called by your email provider (Resend Inbound, SendGrid
   Inbound Parse, Mailgun Routes, etc.) when a visitor REPLIES to a
   notification email.

   The email provider POSTs the parsed email to this URL.
   Authenticate via the X-Webhook-Secret header.

   Body expected:
   {
     ticketId:    string   — embedded in the reply-to address or subject line
     message:     string   — plain text body of the visitor's reply
     senderEmail: string   — the visitor's email address
     senderName?: string   — optional sender name
   }
─────────────────────────────────────────────────────────────────────────── */
export async function POST(req: Request) {
  /* ── Validate webhook secret ── */
  const secret = req.headers.get("x-webhook-secret");
  const expectedSecret = process.env.WEBHOOK_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    console.warn("[webhook] ticket-reply: invalid or missing secret");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    ticketId?:    string;
    message?:     string;
    senderEmail?: string;
    senderName?:  string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const ticketId    = String(body.ticketId    ?? "").trim();
  const message     = String(body.message     ?? "").trim();
  const senderEmail = String(body.senderEmail ?? "").trim().toLowerCase();

  if (!ticketId || !message || !senderEmail) {
    return NextResponse.json(
      { error: "ticketId, message, and senderEmail are required." },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    const ticket = await SupportTicket.findById(ticketId);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }

    /* Optional: verify the sender matches the ticket's contactEmail */
    if (ticket.contactEmail && ticket.contactEmail !== senderEmail) {
      console.warn(
        `[webhook] ticket-reply: sender ${senderEmail} does not match ` +
        `ticket contactEmail ${ticket.contactEmail} for ticket ${ticketId}`
      );
      /* Non-blocking — still accept (email spoofing check is advisory) */
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

    console.log(`[webhook] ✓ Visitor reply appended to ticket ${ticketId}`);
    return NextResponse.json({ ok: true, ticketId });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[webhook] ticket-reply error:", msg);
    return NextResponse.json({ error: "Failed to process reply." }, { status: 500 });
  }
}
