import nodemailer from "nodemailer";

/* ═══════════════════════════════════════════════════
   Typed SMTP error — lets API routes return specific
   messages instead of a generic 500.
═══════════════════════════════════════════════════ */
export type SmtpErrorCode =
  | "CONFIG_MISSING"
  | "AUTH_FAILED"
  | "CONNECTION_FAILED"
  | "SEND_FAILED";

export class SmtpError extends Error {
  constructor(
    public readonly code: SmtpErrorCode,
    message: string,
    public readonly raw?: string
  ) {
    super(message);
    this.name = "SmtpError";
  }
}

/* ═══════════════════════════════════════════════════
   Human-readable messages per error code
═══════════════════════════════════════════════════ */
const USER_MESSAGES: Record<SmtpErrorCode, string> = {
  CONFIG_MISSING:
    "Email is not configured on the server. Contact the administrator.",
  AUTH_FAILED:
    "Gmail authentication failed. Make sure EMAIL_PASS is a 16-character App Password " +
    "(not your account password). Generate one at myaccount.google.com/apppasswords.",
  CONNECTION_FAILED:
    "Cannot connect to Gmail SMTP. Check EMAIL_HOST (smtp.gmail.com) and EMAIL_PORT (587).",
  SEND_FAILED:
    "The email was composed but could not be delivered. Please try again.",
};

/* ═══════════════════════════════════════════════════
   Classify raw SMTP error strings
═══════════════════════════════════════════════════ */
function classifySmtpError(raw: string): SmtpErrorCode {
  const lower = raw.toLowerCase();
  if (/auth|login|credentials|username|password|535|534|530/.test(lower))
    return "AUTH_FAILED";
  if (/econnrefused|etimedout|enotfound|getaddrinfo|network/.test(lower))
    return "CONNECTION_FAILED";
  return "SEND_FAILED";
}

/* ═══════════════════════════════════════════════════
   Create a fresh transporter every time.
   Do NOT cache — a cached broken transporter causes
   every subsequent request to fail silently.
═══════════════════════════════════════════════════ */
function makeTransporter(): nodemailer.Transporter {
  /* Gmail App Passwords are displayed with spaces (xxxx xxxx xxxx xxxx).
     Strip them so the raw 16-char password is sent to the SMTP server. */
  const pass = (process.env.EMAIL_PASS ?? "").replace(/\s+/g, "");

  return nodemailer.createTransport({
    host:   process.env.EMAIL_HOST ?? "smtp.gmail.com",
    port:   Number(process.env.EMAIL_PORT ?? 587),
    /* Port 587 uses STARTTLS — secure must be false */
    secure: Number(process.env.EMAIL_PORT ?? 587) === 465,
    /* Force STARTTLS upgrade (required by Gmail on port 587) */
    requireTLS: true,
    auth: {
      user: process.env.EMAIL_USER!,
      pass,
    },
    tls: {
      /* Allow self-signed certs in dev; set true in production if desired */
      rejectUnauthorized: false,
    },
    /* Generous timeouts to avoid silent hangs */
    connectionTimeout: 10_000,
    socketTimeout:     15_000,
    greetingTimeout:   10_000,
  });
}

/* ═══════════════════════════════════════════════════
   HTML email template (inbox-friendly, no external
   resources that spam filters block)
═══════════════════════════════════════════════════ */
function buildOtpHtml(otp: string, to: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <title>Your CyberAgent Studio Code</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-text-size-adjust:100%;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;">
  <tr>
    <td align="center" style="padding:40px 16px;">
        <!-- Logo -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin-bottom:24px;">
          <tr>
            <td align="center">
              <div style="font-size:32px;font-weight:900;color:#2563eb;letter-spacing:-1px;">CyberAgent Studio</div>
            </td>
          </tr>
        </table>
      <!-- Card -->
      <table role="presentation" width="100%" style="max-width:520px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

        <!-- Accent bar -->
        <tr>
          <td style="height:4px;background:#2563eb;">&nbsp;</td>
        </tr>

        <!-- Header -->
        <tr>
          <td align="center" style="padding:36px 40px 20px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:8px 18px;">
                  <span style="color:#2563eb;font-size:14px;font-weight:700;letter-spacing:0.5px;">&#9889; CyberAgent Studio</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Title -->
        <tr>
          <td align="center" style="padding:0 40px 8px;">
            <h1 style="color:#0f172a;font-size:24px;font-weight:800;margin:0;letter-spacing:-0.3px;">
              Your Verification Code
            </h1>
            <p style="color:#64748b;font-size:14px;margin:10px 0 0;line-height:1.6;">
              Use the code below to complete sign-in.<br/>
              Requested for: <span style="color:#334155;font-weight:600;">${to}</span>
            </p>
          </td>
        </tr>

        <!-- OTP -->
        <tr>
          <td align="center" style="padding:28px 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background-color:#f8fafc;border:2px solid #bfdbfe;border-radius:12px;padding:20px 44px;">
                  <span style="color:#1e293b;font-family:'Courier New',Courier,monospace;font-size:44px;font-weight:900;letter-spacing:14px;display:block;line-height:1;">
                    ${otp}
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Expiry -->
        <tr>
          <td align="center" style="padding:0 40px 28px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background-color:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:8px 16px;">
                  <span style="color:#92400e;font-size:13px;font-weight:600;">
                    &#8987;&nbsp; Expires in <strong>10 minutes</strong>
                  </span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr>
          <td style="padding:0 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr><td style="border-top:1px solid #e2e8f0;font-size:0;">&nbsp;</td></tr>
            </table>
          </td>
        </tr>

        <!-- Security note -->
        <tr>
          <td align="center" style="padding:20px 40px 32px;">
            <p style="color:#64748b;font-size:12px;margin:0;line-height:1.7;">
              If you didn't request this, you can safely ignore this email.<br/>
              Never share this code with anyone &mdash; our team will never ask for it.
            </p>
            <p style="color:#94a3b8;font-size:11px;margin:10px 0 0;">
              &copy; 2026 CyberAgent Studio &mdash; AI Chatbot Builder
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function buildOtpText(otp: string, to: string): string {
  return [
    "CyberAgent Studio — Verification Code",
    "",
    `Requested for: ${to}`,
    "",
    `Your code: ${otp}`,
    "",
    "This code expires in 10 minutes.",
    "Never share it with anyone.",
    "",
    "If you did not request this, please ignore this email.",
    "",
    "© 2026 CyberAgent Studio",
  ].join("\n");
}

/* ═══════════════════════════════════════════════════
   Public API
═══════════════════════════════════════════════════ */

/**
 * verifySmtp — test SMTP credentials without sending any email.
 * Call this BEFORE sendOtpEmail to get a specific "Auth failed"
 * or "Connection refused" error rather than a generic send failure.
 * No-ops (returns immediately) when EMAIL_USER/PASS are not set.
 */
export async function verifySmtp(): Promise<void> {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return;

  const transport = makeTransporter();
  console.log(
    `[email] Verifying SMTP — ` +
    `host: ${process.env.EMAIL_HOST ?? "smtp.gmail.com"}:${process.env.EMAIL_PORT ?? 587}`
  );
  try {
    await transport.verify();
    console.log("[email] ✓ SMTP credentials verified");
  } catch (err) {
    const raw  = err instanceof Error ? err.message : String(err);
    const code = classifySmtpError(raw);
    console.error(`[email] ✗ SMTP verify failed (${code}): ${raw}`);
    throw new SmtpError(code, USER_MESSAGES[code], raw);
  }
}

/**
 * sendOtpEmail — compose and send the OTP email.
 * Assumes verifySmtp() has already been called by the caller.
 * Falls back to a terminal log in dev when credentials are absent.
 */
/* ═══════════════════════════════════════════════════
   Support Ticket Email Templates
═══════════════════════════════════════════════════ */
function buildSupportTicketHtml(ticketId: string, subject: string, contactName: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Support Ticket Confirmation</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <!-- Logo -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin-bottom:24px;">
          <tr>
            <td align="center">
              <div style="font-size:32px;font-weight:900;color:#2563eb;letter-spacing:-1px;">CyberAgent Studio</div>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" style="max-width:520px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="height:4px;background:#2563eb;">&nbsp;</td>
          </tr>
          <tr>
            <td align="center" style="padding:36px 40px 20px;">
              <h1 style="color:#0f172a;font-size:24px;font-weight:800;margin:0;">Support Ticket Received</h1>
              <p style="color:#64748b;font-size:14px;margin:10px 0 0;">We've received your inquiry and will respond soon.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
                <tr>
                  <td style="padding:8px 0;">
                    <strong style="color:#334155;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Ticket ID:</strong>
                    <span style="color:#1e293b;font-size:13px;margin-left:8px;font-family:monospace;">${ticketId}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;">
                    <strong style="color:#334155;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Subject:</strong>
                    <span style="color:#1e293b;font-size:13px;margin-left:8px;">${subject}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;">
                    <strong style="color:#334155;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Status:</strong>
                    <span style="color:#2563eb;font-size:13px;margin-left:8px;font-weight:600;">Pending</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
                <tr>
                  <td>
                    <strong style="color:#334155;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Your Message:</strong>
                    <p style="color:#1e293b;font-size:13px;margin-top:8px;line-height:1.6;white-space:pre-wrap;">${message}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 40px 32px;">
              <p style="color:#64748b;font-size:12px;margin:0;line-height:1.7;">
                Thank you for contacting us, ${contactName}!<br/>
                Our team will review your ticket and get back to you shortly.
              </p>
              <p style="color:#94a3b8;font-size:11px;margin:10px 0 0;">&copy; 2026 CyberAgent Studio</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildAdminNotificationHtml(ticketId: string, subject: string, contactName: string, contactEmail: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>New Support Ticket</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <!-- Logo -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin-bottom:24px;">
          <tr>
            <td align="center">
              <div style="font-size:32px;font-weight:900;color:#dc2626;letter-spacing:-1px;">CyberAgent Studio</div>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" style="max-width:520px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="height:4px;background:#dc2626;">&nbsp;</td>
          </tr>
          <tr>
            <td align="center" style="padding:36px 40px 20px;">
              <h1 style="color:#0f172a;font-size:24px;font-weight:800;margin:0;">🔔 New Support Ticket</h1>
              <p style="color:#64748b;font-size:14px;margin:10px 0 0;">A new customer inquiry has been submitted.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;">
                <tr>
                  <td style="padding:8px 0;">
                    <strong style="color:#991b1b;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Ticket ID:</strong>
                    <span style="color:#1e293b;font-size:13px;margin-left:8px;font-family:monospace;">${ticketId}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;">
                    <strong style="color:#991b1b;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">From:</strong>
                    <span style="color:#1e293b;font-size:13px;margin-left:8px;">${contactName} (${contactEmail})</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;">
                    <strong style="color:#991b1b;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Subject:</strong>
                    <span style="color:#1e293b;font-size:13px;margin-left:8px;">${subject}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;">
                <tr>
                  <td>
                    <strong style="color:#991b1b;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Message:</strong>
                    <p style="color:#1e293b;font-size:13px;margin-top:8px;line-height:1.6;white-space:pre-wrap;">${message}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 40px 32px;">
              <p style="color:#64748b;font-size:12px;margin:0;line-height:1.7;">
                Please respond to this ticket from the admin panel.<br/>
                The customer will be notified when you reply.
              </p>
<p style="color:#94a3b8;font-size:11px;margin:10px 0 0;">&copy; 2026 CyberAgent Studio</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Send confirmation email to user when they submit a support ticket
 */
export async function sendSupportTicketEmail(params: {
  to: string;
  name: string;
  ticketId: string;
  subject: string;
  message?: string;
}): Promise<void> {
  const { to, name, ticketId, subject, message } = params;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[email] SMTP not configured — skipping support ticket email to ${to}`);
    return;
  }

  const transport = makeTransporter();
  const from = process.env.EMAIL_FROM ?? `CyberAgent Studio <${process.env.EMAIL_USER}>`;

  try {
    await transport.sendMail({
      from,
      to,
      subject: `Support Ticket Confirmed: ${subject}`,
      text: `Dear ${name},\n\nYour support ticket has been received.\n\nTicket ID: ${ticketId}\nSubject: ${subject}\nStatus: Pending\n\nWe will respond to you shortly.\n\nThank you,\nCyberAgent Studio Team`,
      html: buildSupportTicketHtml(ticketId, subject, name, message || ""),
      headers: {
        "X-Priority": "3",
        "X-Mailer": "CyberAgent-Studio-Mailer",
      },
    });
    console.log(`[email] ✓ Support ticket confirmation sent to ${to}`);
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    console.error(`[email] ✗ Failed to send support ticket email to ${to}:`, raw);
    throw new SmtpError("SEND_FAILED", "Failed to send support ticket confirmation email.", raw);
  }
}

/**
 * Send notification email to admin when a new support ticket is created
 */
export async function sendAdminNotificationEmail(params: {
  to: string;
  ticketId: string;
  subject: string;
  contactName: string;
  contactEmail: string;
  message: string;
}): Promise<void> {
  const { to, ticketId, subject, contactName, contactEmail, message } = params;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[email] SMTP not configured — skipping admin notification to ${to}`);
    return;
  }

  const transport = makeTransporter();
  const from = process.env.EMAIL_FROM ?? `CyberAgent Studio <${process.env.EMAIL_USER}>`;

  try {
    await transport.sendMail({
      from,
      to,
      subject: `New Support Ticket: ${subject}`,
      text: `New Support Ticket Received\n\nTicket ID: ${ticketId}\nFrom: ${contactName} (${contactEmail})\nSubject: ${subject}\n\nPlease respond from the admin panel.`,
      html: buildAdminNotificationHtml(ticketId, subject, contactName, contactEmail, message),
      headers: {
        "X-Priority": "1",
        "X-Mailer": "CyberAgent-Studio-Mailer",
      },
    });
    console.log(`[email] ✓ Admin notification sent to ${to}`);
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    console.error(`[email] ✗ Failed to send admin notification to ${to}:`, raw);
    throw new SmtpError("SEND_FAILED", "Failed to send admin notification email.", raw);
  }
}

/**
 * Send reply notification email to user when admin responds to their ticket
 */
export async function sendReplyNotificationEmail(params: {
  to: string;
  name: string;
  ticketId: string;
  subject: string;
  adminReply: string;
}): Promise<void> {
  const { to, name, ticketId, subject, adminReply } = params;

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(`[email] SMTP not configured — skipping reply notification to ${to}`);
    return;
  }

  const transport = makeTransporter();
  const from = process.env.EMAIL_FROM ?? `CyberAgent Studio <${process.env.EMAIL_USER}>`;

  try {
    await transport.sendMail({
      from,
      to,
      subject: `Re: ${subject}`,
      text: `Dear ${name},\n\nWe have responded to your support ticket.\n\nTicket ID: ${ticketId}\nSubject: ${subject}\n\nAdmin Reply:\n${adminReply}\n\nPlease log in to your dashboard to view the full conversation.\n\nThank you,\nCyberAgent Studio Team`,
      html: buildReplyNotificationHtml(ticketId, subject, name, adminReply),
      headers: {
        "X-Priority": "2",
        "X-Mailer": "CyberAgent-Studio-Mailer",
      },
    });
    console.log(`[email] ✓ Reply notification sent to ${to}`);
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    console.error(`[email] ✗ Failed to send reply notification to ${to}:`, raw);
    throw new SmtpError("SEND_FAILED", "Failed to send reply notification email.", raw);
  }
}

function buildReplyNotificationHtml(ticketId: string, subject: string, contactName: string, adminReply: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Reply to Your Support Ticket</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <!-- Logo -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin-bottom:24px;">
          <tr>
            <td align="center">
              <div style="font-size:32px;font-weight:900;color:#10b981;letter-spacing:-1px;">CyberAgent Studio</div>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" style="max-width:520px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="height:4px;background:#10b981;">&nbsp;</td>
          </tr>
          <tr>
            <td align="center" style="padding:36px 40px 20px;">
              <h1 style="color:#0f172a;font-size:24px;font-weight:800;margin:0;">We've Replied to Your Ticket</h1>
              <p style="color:#64748b;font-size:14px;margin:10px 0 0;">Our support team has responded to your inquiry.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">
                <tr>
                  <td style="padding:8px 0;">
                    <strong style="color:#334155;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Ticket ID:</strong>
                    <span style="color:#1e293b;font-size:13px;margin-left:8px;font-family:monospace;">${ticketId}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:8px 0;">
                    <strong style="color:#334155;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Subject:</strong>
                    <span style="color:#1e293b;font-size:13px;margin-left:8px;">${subject}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;">
                <tr>
                  <td>
                    <strong style="color:#166534;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Admin Reply:</strong>
                    <p style="color:#1e293b;font-size:13px;margin-top:8px;line-height:1.6;white-space:pre-wrap;">${adminReply}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 40px 32px;">
              <p style="color:#64748b;font-size:12px;margin:0;line-height:1.7;">
                Thank you for your patience, ${contactName}!
              </p>
              <p style="color:#94a3b8;font-size:11px;margin:10px 0 0;">&copy; 2026 CyberAgent Studio</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  /* ── Dev mode: no config → print OTP to terminal ── */
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(
      `\n\x1b[33m[email] SMTP not configured — printing OTP to terminal\x1b[0m\n` +
      `\x1b[36m  → ${to}\x1b[0m  OTP: \x1b[1m\x1b[32m${otp}\x1b[0m\n`
    );
    return;
  }

  const transport = makeTransporter();
  const from =
    process.env.EMAIL_FROM ?? `CyberAgent Studio <${process.env.EMAIL_USER}>`;

  try {
    const info = await transport.sendMail({
      from,
      to,
      subject: `${otp} — your CyberAgent Studio verification code`,
      text:    buildOtpText(otp, to),
      html:    buildOtpHtml(otp, to),
      headers: {
        /* Reduces spam-folder probability */
        "X-Priority":        "1",
        "X-Mailer":          "CyberAgent-Studio-Mailer",
        "Precedence":        "transactional",
      },
    });
    console.log(`[email] ✓ Sent to ${to} — messageId: ${info.messageId}`);
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    console.error("[email] ✗ sendMail failed:", raw);
    throw new SmtpError("SEND_FAILED", USER_MESSAGES.SEND_FAILED, raw);
  }
}
