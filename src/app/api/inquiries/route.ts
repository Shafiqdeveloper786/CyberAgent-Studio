import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SupportTicket from "@/models/SupportTicket";
import { getTenantFromSession } from "@/lib/sessionMiddleware";
import { sendEmailToAdmin, sendOtpEmail } from "@/lib/email";

/* ── GET /api/inquiries — tenant-scoped: only external tickets for current user ── */
export async function GET(req: Request) {
  const result = await getTenantFromSession();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const tenantId = result.tenant.tenantId;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const isInternalParam = searchParams.get("isInternal");

    await connectDB();

    /* SECURITY: Always filter by tenantId === current user */
    const query: Record<string, unknown> = {
      type:     "external",
      tenantId: tenantId,
    };

    if (isInternalParam !== null) {
      query.isInternal = isInternalParam === "true";
    }

    if (status && status !== "all") {
      query.status = status;
    }

    if (search) {
      const s = search.trim();
      query.$or = [
        { contactName:  { $regex: s, $options: "i" } },
        { contactEmail: { $regex: s, $options: "i" } },
        { subject:      { $regex: s, $options: "i" } },
      ];
    }

    const tickets = await SupportTicket.find(query)
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({ ok: true, tickets });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[inquiries] GET error:", msg);
    return NextResponse.json({ error: "Failed to fetch inquiries." }, { status: 500 });
  }
}

/* ── POST /api/inquiries — user creates a new support ticket ── */
export async function POST(req: Request) {
  const result = await getTenantFromSession();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const tenant = result.tenant;

  let body: {
    subject?: string;
    message?: string;
    category?: string;
    contactName?: string;
    contactEmail?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body.subject || !body.subject.trim()) {
    return NextResponse.json({ error: "Subject is required." }, { status: 400 });
  }
  if (!body.message || !body.message.trim()) {
    return NextResponse.json({ error: "Message is required." }, { status: 400 });
  }

  try {
    await connectDB();

    const ticket = await SupportTicket.create({
      type:         "external",
      tenantId:     tenant.tenantId,
      userId:       tenant.tenantId,
      contactEmail: body.contactEmail?.trim() || tenant.email,
      contactName:  body.contactName?.trim()  || tenant.name,
      subject:      body.subject.trim(),
      category:     body.category?.trim()     || "general",
      status:       "pending",
      isInternal:   false,
      replies: [{
        sender:    "user",
        message:   body.message.trim(),
        timestamp: new Date(),
      }],
      createdAt:    new Date(),
      updatedAt:    new Date(),
    });

    console.log(`[inquiries] ✓ Tenant ${tenant.tenantId} created inquiry ${ticket._id}`);

    /* ── User confirmation email — fire-and-forget ── */
    const userEmail = body.contactEmail?.trim() || tenant.email;
    const transporter = (await import("nodemailer")).default.createTransport({
      host:   process.env.EMAIL_HOST  ?? "smtp.gmail.com",
      port:   Number(process.env.EMAIL_PORT ?? 587),
      secure: false,
      auth: {
        user: (process.env.EMAIL_USER ?? "").trim(),
        pass: (process.env.EMAIL_PASS ?? "").replace(/\s+/g, ""),
      },
    });
    const from = process.env.EMAIL_FROM ?? `CyberAgent Studio <${process.env.EMAIL_USER}>`;

    transporter.sendMail({
      from,
      to:      userEmail,
      subject: "Ticket Received — CyberAgent Studio Support",
      html: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Ticket Received</title></head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" style="max-width:520px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
<tr><td style="height:4px;background:#2563eb;">&nbsp;</td></tr>
<tr><td align="center" style="padding:32px 40px 16px;">
<img src="https://cyber-agent-studio.vercel.app/logo1.png" alt="CyberAgent Studio" width="150" height="auto" style="width:150px;height:auto;display:block;margin:0 auto;border:0;outline:none;" />
</td></tr>
<tr><td align="center" style="padding:0 40px 8px;">
<h1 style="color:#0f172a;font-size:22px;font-weight:800;margin:0;">Ticket Received</h1>
<p style="color:#64748b;font-size:14px;margin:10px 0 0;line-height:1.6;">
Thank you for reaching out to CyberAgent Studio. Your inquiry has been received, and our support team will get back to you as soon as possible.
</p>
</td></tr>
<tr><td style="padding:20px 40px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
<tr style="background:#f8fafc;"><td style="padding:12px 16px;">
<p style="margin:0;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Subject</p>
<p style="margin:4px 0 0;font-size:13px;font-weight:600;color:#1e293b;">${body.subject}</p>
</td></tr>
<tr><td style="padding:12px 16px;">
<p style="margin:0;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Category</p>
<p style="margin:4px 0 0;font-size:13px;font-weight:600;color:#1e293b;">${body.category || "General"}</p>
</td></tr>
</table>
</td></tr>
<tr><td style="padding:0 40px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #e2e8f0;font-size:0;">&nbsp;</td></tr></table></td></tr>
<tr><td align="center" style="padding:20px 40px 32px;">
<p style="color:#64748b;font-size:12px;margin:0;line-height:1.7;">
You received this because you submitted a support inquiry on CyberAgent Studio.<br/>
If you have any questions, contact our support team.
</p>
<p style="color:#94a3b8;font-size:11px;margin:10px 0 0;">&copy; 2025 CyberAgent Studio &mdash; AI Chatbot Builder</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
    }).then(() => {
      console.log(`[inquiries] ✓ User confirmation email sent to ${userEmail}`);
    }).catch((e: Error) => {
      console.error("[inquiries] User confirmation email failed:", e);
    });

    /* ── Admin notification hook — fire-and-forget ── */
    sendEmailToAdmin({
      subject: "New Support Ticket Received",
      text: `User ${tenant.name} (${tenant.email}) has submitted a new inquiry:\n\nSubject: ${body.subject}\nCategory: ${body.category || "general"}\nMessage: ${body.message}`,
    }).catch((e) => console.error("[inquiries] Admin notification failed:", e));

    return NextResponse.json({ ok: true, ticket }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[inquiries] POST error:", msg);
    return NextResponse.json({ error: "Failed to create inquiry." }, { status: 500 });
  }
}
