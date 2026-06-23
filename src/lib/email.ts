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
   UNIVERSAL EMAIL HEADER — Logo + Brand Bar
   Used across all transactional emails for consistent branding.
═══════════════════════════════════════════════════ */
const LOGO_URL = "https://cyber-agent-studio.vercel.app/logo1.png";

function emailHeader(): string {
  return `
    <!-- Universal Brand Header -->
    <tr>
      <td align="center" style="padding:32px 40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
          <tr>
            <td align="center" style="padding-bottom:12px;">
              <img src="${LOGO_URL}" alt="CyberAgent Studio" width="150" height="auto" style="width:150px;height:auto;display:block;margin:0 auto;border:0;outline:none;" />
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom:4px;">
              <span style="color:#1e293b;font-size:16px;font-weight:800;letter-spacing:0.3px;">CyberAgent Studio</span>
            </td>
          </tr>
          <tr>
            <td align="center">
              <span style="color:#2563eb;font-size:12px;font-weight:600;letter-spacing:0.5px;">AI Chatbot Builder</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 40px 8px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="border-top:1px solid #e2e8f0;font-size:0;">&nbsp;</td></tr>
        </table>
      </td>
    </tr>`;
}

function emailFooter(): string {
  return `
    <!-- Universal Footer -->
    <tr>
      <td align="center" style="padding:20px 40px 32px;">
        <p style="color:#64748b;font-size:12px;margin:0;line-height:1.7;">
          You received this because you are a member of CyberAgent Studio.<br/>
          If you have any questions, contact our support team.
        </p>
        <p style="color:#94a3b8;font-size:11px;margin:10px 0 0;">
          &copy; 2025 CyberAgent Studio &mdash; AI Chatbot Builder
        </p>
      </td>
    </tr>`;
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
      <!-- Card -->
      <table role="presentation" width="100%" style="max-width:520px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

        <!-- Accent bar -->
        <tr>
          <td style="height:4px;background:#2563eb;">&nbsp;</td>
        </tr>

        ${emailHeader()}

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
          <td align="center" style="padding:20px 40px 8px;">
            <p style="color:#64748b;font-size:12px;margin:0;line-height:1.7;">
              If you didn't request this, you can safely ignore this email.<br/>
              Never share this code with anyone &mdash; our team will never ask for it.
            </p>
          </td>
        </tr>

        ${emailFooter()}

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
    "© 2025 CyberAgent Studio",
  ].join("\n");
}

/* ═══════════════════════════════════════════════════
   Invitation Email Template
═══════════════════════════════════════════════════ */
export function buildInviteHtml(inviterName: string, inviteLink: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
  <title>You're Invited to CyberAgent Studio</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-text-size-adjust:100%;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <!-- Card -->
      <table role="presentation" width="100%" style="max-width:520px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

        <!-- Accent bar -->
        <tr>
          <td style="height:4px;background:#2563eb;">&nbsp;</td>
        </tr>

        ${emailHeader()}

        <!-- Title -->
        <tr>
          <td align="center" style="padding:0 40px 8px;">
            <h1 style="color:#0f172a;font-size:24px;font-weight:800;margin:0;letter-spacing:-0.3px;">
              You're Invited!
            </h1>
            <p style="color:#64748b;font-size:14px;margin:10px 0 0;line-height:1.6;">
              <strong style="color:#334155;">${inviterName}</strong> has invited you to collaborate on CyberAgent Studio.
            </p>
          </td>
        </tr>

        <!-- CTA Button -->
        <tr>
          <td align="center" style="padding:28px 40px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-radius:10px;background:#2563eb;padding:14px 40px;text-align:center;">
                  <a href="${inviteLink}" target="_blank" style="color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;display:inline-block;letter-spacing:0.3px;">
                    Accept Invitation
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Expiry note -->
        <tr>
          <td align="center" style="padding:0 40px 28px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background-color:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:8px 16px;">
                  <span style="color:#92400e;font-size:13px;font-weight:600;">
                    &#8987;&nbsp; This invitation expires in <strong>7 days</strong>
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

        <!-- Note -->
        <tr>
          <td align="center" style="padding:20px 40px 8px;">
            <p style="color:#64748b;font-size:12px;margin:0;line-height:1.7;">
              If you weren't expecting this invitation, you can safely ignore this email.
            </p>
          </td>
        </tr>

        ${emailFooter()}

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

/* ═══════════════════════════════════════════════════
   Weekly Performance Report Email
═══════════════════════════════════════════════════ */
export interface AgentPerformanceRow {
  name:           string;
  messagesCount:  number;
  status:         string;
  resolutionRate: number;
}

export async function sendWeeklyReportEmail(
  toEmail: string,
  userName: string,
  agents: AgentPerformanceRow[],
  weekLabel: string
): Promise<void> {
  /* ── Dev mode: no config → print to terminal ── */
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(
      `\n\x1b[33m[email] SMTP not configured — printing weekly report to terminal\x1b[0m\n` +
      `\x1b[36m  → ${toEmail}\x1b[0m  Week: \x1b[1m\x1b[32m${weekLabel}\x1b[0m\n`
    );
    return;
  }

  const transport = makeTransporter();
  const from = process.env.EMAIL_FROM ?? `CyberAgent Studio <${process.env.EMAIL_USER}>`;

  /* Build agent rows HTML */
  const agentRowsHtml = agents.map((a) => `
    <tr>
      <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#1e293b;font-weight:600;">${a.name}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#64748b;text-align:center;">${a.messagesCount}</td>
      <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;font-size:13px;text-align:center;">
        <span style="display:inline-block;padding:2px 10px;border-radius:4px;font-size:11px;font-weight:600;${a.status === 'active' ? 'background:#ecfdf5;color:#059669;' : 'background:#f1f5f9;color:#64748b;'}">${a.status}</span>
      </td>
      <td style="padding:10px 16px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#64748b;text-align:center;">${a.resolutionRate}%</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Weekly Performance Report — CyberAgent Studio</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-text-size-adjust:100%;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" style="max-width:560px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

        <!-- Accent bar -->
        <tr>
          <td style="height:4px;background:#2563eb;">&nbsp;</td>
        </tr>

        ${emailHeader()}

        <!-- Greeting -->
        <tr>
          <td align="center" style="padding:0 40px 8px;">
            <h1 style="color:#0f172a;font-size:22px;font-weight:800;margin:0;letter-spacing:-0.3px;">
              Weekly Performance Report
            </h1>
            <p style="color:#64748b;font-size:13px;margin:8px 0 0;line-height:1.6;">
              Hi <strong style="color:#334155;">${userName}</strong>, here's how your agents performed this week.
            </p>
            <p style="color:#2563eb;font-size:12px;font-weight:600;margin:4px 0 0;">
              ${weekLabel}
            </p>
          </td>
        </tr>

        <!-- Summary Cards -->
        <tr>
          <td style="padding:24px 40px 8px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="50%" style="padding:0 4px 0 0;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
                    <tr><td align="center" style="padding:14px 12px;">
                      <p style="margin:0;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Total Agents</p>
                      <p style="margin:4px 0 0;font-size:24px;font-weight:800;color:#0f172a;">${agents.length}</p>
                    </td></tr>
                  </table>
                </td>
                <td width="50%" style="padding:0 0 0 4px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;">
                    <tr><td align="center" style="padding:14px 12px;">
                      <p style="margin:0;font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;">Total Messages</p>
                      <p style="margin:4px 0 0;font-size:24px;font-weight:800;color:#0f172a;">${agents.reduce((s, a) => s + a.messagesCount, 0)}</p>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Agent Table -->
        <tr>
          <td style="padding:20px 40px 8px;">
            <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#0f172a;">Agent Breakdown</p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
              <thead>
                <tr style="background:#f8fafc;">
                  <th style="padding:10px 16px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;text-align:left;border-bottom:1px solid #e2e8f0;">Agent</th>
                  <th style="padding:10px 16px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;text-align:center;border-bottom:1px solid #e2e8f0;">Messages</th>
                  <th style="padding:10px 16px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;text-align:center;border-bottom:1px solid #e2e8f0;">Status</th>
                  <th style="padding:10px 16px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;text-align:center;border-bottom:1px solid #e2e8f0;">Resolution</th>
                </tr>
              </thead>
              <tbody>
                ${agentRowsHtml}
              </tbody>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td align="center" style="padding:24px 40px 8px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-radius:10px;background:#2563eb;padding:12px 32px;text-align:center;">
                  <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://cyber-agent-studio.vercel.app'}/dashboard" target="_blank" style="color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;display:inline-block;letter-spacing:0.3px;">
                    View Dashboard
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        ${emailFooter()}

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  try {
    const info = await transport.sendMail({
      from,
      to: toEmail,
      subject: `Weekly Performance Report — ${weekLabel}`,
      html,
      headers: {
        "X-Priority":        "1",
        "X-Mailer":          "CyberAgent-Studio-Mailer",
        "Precedence":        "transactional",
      },
    });
    console.log(`[email] ✓ Weekly report sent to ${toEmail} — messageId: ${info.messageId}`);
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    console.error("[email] ✗ Weekly report send failed:", raw);
    throw new SmtpError("SEND_FAILED", USER_MESSAGES.SEND_FAILED, raw);
  }
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

/* ═══════════════════════════════════════════════════
   Support Engine Emails
═══════════════════════════════════════════════════ */

/**
 * sendVisitorReplyEmail — notifies a website visitor that a reply has been
 * posted to their support thread.  Includes a deep-link back to the
 * public /chat/thread/[ticketId] view so they can read and respond.
 */
export async function sendVisitorReplyEmail(
  visitorEmail:  string,
  visitorName:   string,
  replierName:   string,
  replyMessage:  string,
  ticketId:      string,
  subject:       string
): Promise<void> {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(
      `\n\x1b[33m[email] SMTP not configured — visitor reply email skipped\x1b[0m\n` +
      `\x1b[36m  → ${visitorEmail}\x1b[0m  ticketId: ${ticketId}\n`
    );
    return;
  }

  const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://cyber-agent-studio.vercel.app";
  const threadUrl = `${BASE}/chat/thread/${ticketId}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>New Reply to Your Support Thread</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" style="max-width:520px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

        <!-- Accent bar -->
        <tr><td style="height:4px;background:linear-gradient(90deg,#2563eb,#7c3aed);">&nbsp;</td></tr>

        ${emailHeader()}

        <!-- Title -->
        <tr>
          <td align="center" style="padding:0 40px 8px;">
            <h1 style="color:#0f172a;font-size:22px;font-weight:800;margin:0;">You have a new reply</h1>
            <p style="color:#64748b;font-size:14px;margin:10px 0 0;line-height:1.6;">
              Hi <strong style="color:#334155;">${visitorName}</strong>, 
              <strong style="color:#334155;">${replierName}</strong> has responded to your inquiry.
            </p>
            <p style="color:#64748b;font-size:13px;margin:6px 0 0;">
              Subject: <strong style="color:#334155;">${subject}</strong>
            </p>
          </td>
        </tr>

        <!-- Reply Preview -->
        <tr>
          <td style="padding:20px 40px;">
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #2563eb;border-radius:8px;padding:16px 20px;">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Their message</p>
              <p style="margin:0;font-size:14px;color:#1e293b;line-height:1.6;white-space:pre-wrap;">${replyMessage}</p>
            </div>
          </td>
        </tr>

        <!-- CTA Button -->
        <tr>
          <td align="center" style="padding:8px 40px 28px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-radius:10px;background:#2563eb;padding:14px 40px;text-align:center;">
                  <a href="${threadUrl}" target="_blank" style="color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;display:inline-block;">
                    View Full Thread &rarr;
                  </a>
                </td>
              </tr>
            </table>
            <p style="color:#94a3b8;font-size:11px;margin:12px 0 0;">
              Or copy this link: <span style="color:#2563eb;">${threadUrl}</span>
            </p>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #e2e8f0;font-size:0;">&nbsp;</td></tr></table></td></tr>

        ${emailFooter()}

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  const transport = makeTransporter();
  const from = process.env.EMAIL_FROM ?? `CyberAgent Studio <${process.env.EMAIL_USER}>`;

  try {
    const info = await transport.sendMail({
      from,
      to:      visitorEmail,
      subject: `Re: ${subject} — New reply from ${replierName}`,
      html,
      headers: {
        "X-Priority":  "1",
        "X-Mailer":    "CyberAgent-Studio-Mailer",
        "Precedence":  "transactional",
      },
    });
    console.log(`[email] ✓ Visitor reply email sent to ${visitorEmail} — messageId: ${info.messageId}`);
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    console.error("[email] ✗ Visitor reply email failed:", raw);
    /* Non-fatal — log but don't throw so the reply is still saved */
  }
}

/**
 * sendNewInquiryNotification — alerts the embedding user (tenant) when a
 * new external support ticket is submitted on their website.
 */
export async function sendNewInquiryNotification(
  tenantEmail:  string,
  tenantName:   string,
  visitorEmail: string,
  visitorName:  string,
  subject:      string,
  ticketId:     string
): Promise<void> {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log(
      `\n\x1b[33m[email] SMTP not configured — inquiry notification skipped\x1b[0m\n` +
      `\x1b[36m  → ${tenantEmail}\x1b[0m  ticketId: ${ticketId}\n`
    );
    return;
  }

  const BASE = process.env.NEXT_PUBLIC_BASE_URL || "https://cyber-agent-studio.vercel.app";
  const inquiriesUrl = `${BASE}/inquiries`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>New Customer Inquiry</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" style="max-width:520px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

        <!-- Accent bar -->
        <tr><td style="height:4px;background:linear-gradient(90deg,#7c3aed,#2563eb);">&nbsp;</td></tr>

        ${emailHeader()}

        <!-- Title -->
        <tr>
          <td align="center" style="padding:0 40px 8px;">
            <div style="display:inline-block;padding:8px 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:20px;margin-bottom:12px;">
              <span style="font-size:12px;font-weight:700;color:#16a34a;">🎯 New Inquiry</span>
            </div>
            <h1 style="color:#0f172a;font-size:22px;font-weight:800;margin:0;">New Customer Inquiry</h1>
            <p style="color:#64748b;font-size:14px;margin:10px 0 0;line-height:1.6;">
              Hi <strong style="color:#334155;">${tenantName}</strong>, a visitor on your website just submitted a new support inquiry.
            </p>
          </td>
        </tr>

        <!-- Inquiry Details -->
        <tr>
          <td style="padding:20px 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
              <tr style="background:#f8fafc;">
                <td style="padding:12px 16px;border-bottom:1px solid #e2e8f0;">
                  <p style="margin:0;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Visitor</p>
                  <p style="margin:4px 0 0;font-size:13px;font-weight:600;color:#1e293b;">${visitorName} &lt;${visitorEmail}&gt;</p>
                </td>
              </tr>
              <tr>
                <td style="padding:12px 16px;">
                  <p style="margin:0;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Subject</p>
                  <p style="margin:4px 0 0;font-size:13px;font-weight:600;color:#1e293b;">${subject}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA Button -->
        <tr>
          <td align="center" style="padding:0 40px 28px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-radius:10px;background:linear-gradient(135deg,#7c3aed,#2563eb);padding:14px 40px;text-align:center;">
                  <a href="${inquiriesUrl}" target="_blank" style="color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;display:inline-block;">
                    View Customer Inquiries &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border-top:1px solid #e2e8f0;font-size:0;">&nbsp;</td></tr></table></td></tr>

        ${emailFooter()}

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  const transport = makeTransporter();
  const from = process.env.EMAIL_FROM ?? `CyberAgent Studio <${process.env.EMAIL_USER}>`;

  try {
    const info = await transport.sendMail({
      from,
      to:      tenantEmail,
      subject: `🎯 New inquiry: "${subject}" from ${visitorName}`,
      html,
      headers: {
        "X-Priority":  "1",
        "X-Mailer":    "CyberAgent-Studio-Mailer",
        "Precedence":  "transactional",
      },
    });
    console.log(`[email] ✓ Inquiry notification sent to ${tenantEmail} — messageId: ${info.messageId}`);
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    console.error("[email] ✗ Inquiry notification failed:", raw);
    /* Non-fatal */
  }
}
