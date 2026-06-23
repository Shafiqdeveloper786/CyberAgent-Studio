/**
 * /api/support — unified support ticket management
 *
 * GET  → Returns ALL tickets associated with the logged-in user:
 *         • Internal tickets (type="internal", userId === tenantId)
 *         • External tickets (type="external", tenantId === tenantId)
 *        This gives a centralised view of every ticket from any agent.
 *
 * POST → Creates a new ticket.
 *         • No body.type or body.type="internal": creates internal ticket.
 *           Requires session. Defaults type to "internal".
 *         • body.type="external": creates external widget ticket (no auth
 *           required — called from embedded widget). Requires tenantId +
 *           contactEmail.
 *
 * Auth model:
 *   Internal POST / GET → getTenantFromSession() (session required)
 *   External POST       → public (api-key protected at network level)
 */

import { NextResponse }           from "next/server";
import connectDB                  from "@/lib/mongodb";
import SupportTicket              from "@/models/SupportTicket";
import User                       from "@/models/User";
import { sendNewInquiryNotification } from "@/lib/email";
import { getTenantFromSession }   from "@/lib/sessionMiddleware";
import mongoose                   from "mongoose";

/* ── GET /api/support — unified list for logged-in user ── */
export async function GET() {
  const result = await getTenantFromSession();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const { tenantId } = result.tenant;

  try {
    await connectDB();
    const oId = new mongoose.Types.ObjectId(tenantId);

    /* Retrieve internal tickets created by the user */
    const tickets = await SupportTicket.find({
      type: "internal",
      userId: oId,
    })
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({ ok: true, tickets });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[support] GET error:", msg);
    return NextResponse.json({ error: "Failed to fetch tickets." }, { status: 500 });
  }
}

/* ── POST /api/support — create a support ticket ── */
export async function POST(req: Request) {
  let body: {
    type?:         string;
    tenantId?:     string;
    contactEmail?: string;
    contactName?:  string;
    subject?:      string;
    chatContext?:  { role: string; content: string; timestamp?: string }[];
    /* Legacy / convenience fields (internal tickets from dashboard) */
    category?:     string;
    message?:      string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const ticketType = (body.type === "external" ? "external" : "internal") as
    | "internal"
    | "external";

  /* ──────────────────────────────────────────────────────────────────
     INTERNAL TICKET — requires authenticated session
  ────────────────────────────────────────────────────────────────── */
  if (ticketType === "internal") {
    /* Use middleware to get fully-hydrated tenant (prevents empty
       email/name strings that fail Mongoose's required: true)     */
    const result = await getTenantFromSession();
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const { tenantId, email, name } = result.tenant;

    /* subject accepts both "subject" and legacy "category" field */
    const subject = String(body.subject ?? body.category ?? "").trim();
    const message = String(body.message ?? "").trim();

    if (!subject) {
      return NextResponse.json(
        { error: "Subject is required." },
        { status: 400 }
      );
    }
    if (!message) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    try {
      await connectDB();
      const ticket = await SupportTicket.create({
        type:         "internal",
        tenantId:     null,
        userId:       tenantId,
        contactEmail: email,      // DB-hydrated — never empty
        contactName:  name,       // DB-hydrated — never empty
        subject,
        chatContext:  body.chatContext ?? [],
        status:       "pending",
        replies:      [],
        createdAt:    new Date().toISOString(),
        updatedAt:    new Date().toISOString(),
      });
      console.log(
        `[support] ✓ Internal ticket "${subject}" created (id=${ticket._id}, user=${tenantId})`
      );
      return NextResponse.json({ ok: true, ticket }, { status: 201 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[support] POST internal error:", msg);
      return NextResponse.json(
        { error: "Failed to create support ticket." },
        { status: 500 }
      );
    }
  }

  /* ──────────────────────────────────────────────────────────────────
     EXTERNAL TICKET — from embedded widget or AI tool call (no auth)
     tenantId identifies whose agent triggered the escalation.
  ────────────────────────────────────────────────────────────────── */
  const tenantId     = String(body.tenantId    ?? "").trim();
  const contactEmail = String(body.contactEmail ?? "").trim().toLowerCase();
  const contactName  = String(body.contactName  ?? "Visitor").trim();
  const subject      = String(body.subject      ?? "Support Request").trim();
  const chatContext  = Array.isArray(body.chatContext) ? body.chatContext : [];

  if (!tenantId) {
    return NextResponse.json(
      { error: "tenantId is required for external tickets." },
      { status: 400 }
    );
  }
  if (!contactEmail) {
    return NextResponse.json(
      { error: "contactEmail is required for external tickets." },
      { status: 400 }
    );
  }

  /* Validate tenantId is a valid ObjectId before hitting MongoDB */
  if (!mongoose.Types.ObjectId.isValid(tenantId)) {
    return NextResponse.json(
      { error: "Invalid tenantId format." },
      { status: 400 }
    );
  }

  try {
    await connectDB();
    const ticket = await SupportTicket.create({
      type:         "external",
      tenantId,
      userId:       null,
      contactEmail,
      contactName,
      subject,
      chatContext:  chatContext.map((m) => ({
        role:      m.role,
        content:   m.content,
        timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
      })),
      status:  "pending",
      replies: [],
      createdAt:    new Date().toISOString(),
      updatedAt:    new Date().toISOString(),
    });
    console.log(
      `[support] ✓ External ticket "${subject}" created (id=${ticket._id}, tenant=${tenantId})`
    );

    /* ── Notify tenant by email (non-blocking) ── */
    try {
      const tenant = await User.findById(tenantId)
        .select("email name")
        .lean<{ email: string; name: string }>();
      if (tenant?.email) {
        sendNewInquiryNotification(
          tenant.email,
          tenant.name || "there",
          contactEmail,
          contactName,
          subject,
          String(ticket._id)
        ).catch((e) => console.error("[support] Notification email failed:", e));
      }
    } catch { /* non-blocking — ignore */ }

    return NextResponse.json({ ok: true, ticket }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[support] POST external error:", msg);
    return NextResponse.json(
      { error: "Failed to create support ticket." },
      { status: 500 }
    );
  }
}
