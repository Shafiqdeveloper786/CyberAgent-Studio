import nodemailer from "nodemailer";

/* ── Singleton transporter (reused across requests) ── */
export const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST  ?? "smtp.gmail.com",
  port:   Number(process.env.EMAIL_PORT ?? 587),
  secure: false,
  auth: {
    user: (process.env.EMAIL_USER ?? "").trim(),
    /* Gmail App Passwords have spaces in the .env — strip them */
    pass: (process.env.EMAIL_PASS ?? "").replace(/\s+/g, ""),
  },
});

export interface DailyLimitPayload {
  toEmail:   string;
  agentName: string;
  resetAt:   string; // ISO 8601 — UTC midnight
}

/* ── Universal Email Header (inline for mailer.ts independence) ── */
const LOGO_URL = "https://cyber-agent-studio.vercel.app/logo1.png?v=1";

function emailHeader(): string {
  return `
    <tr>
      <td align="center" style="padding:32px 40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">
              <img src="${LOGO_URL}" alt="CyberAgent Studio" width="160" height="40" style="display:block;max-height:40px;width:auto;object-fit:contain;border:0;outline:none;" />
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:8px;">
              <span style="color:#2563eb;font-size:13px;font-weight:700;letter-spacing:0.5px;">AI Chatbot Builder</span>
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
    <tr>
      <td align="center" style="padding:20px 40px 32px;">
        <p style="color:#64748b;font-size:12px;margin:0;line-height:1.7;">
          You received this because you are the owner of an agent on CyberAgent Studio.<br/>
          Upgrade to the <strong style="color:#2563eb;">Pro Plan</strong> for 5,000 messages per month with no daily caps.
        </p>
        <p style="color:#94a3b8;font-size:11px;margin:10px 0 0;">
          &copy; 2025 CyberAgent Studio &mdash; AI Chatbot Builder
        </p>
      </td>
    </tr>`;
}

/**
 * Sends a single notification email when a free-plan agent hits its
 * 50-message daily cap.  Call with fire-and-forget; do NOT await in the
 * hot path.
 */
export async function sendDailyLimitEmail(p: DailyLimitPayload): Promise<void> {
  const resetTime = new Date(p.resetAt).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "UTC",
  });

  const from = (process.env.EMAIL_FROM ?? "CyberAgent Studio <muhammadshafiqchohan12@gmail.com>").trim();

  await transporter.sendMail({
    from,
    to:      p.toEmail,
    subject: `⚠ Daily Message Limit Reached — ${p.agentName}`,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Daily Limit Reached</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Helvetica Neue',Arial,sans-serif;-webkit-text-size-adjust:100%;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="100%" style="max-width:520px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

        <!-- Accent bar -->
        <tr>
          <td style="height:4px;background:#2563eb;">&nbsp;</td>
        </tr>

        ${emailHeader()}

        <!-- Heading -->
        <tr>
          <td align="center" style="padding:0 40px 8px;">
            <h1 style="color:#0f172a;font-size:22px;font-weight:800;margin:0;letter-spacing:-0.3px;">
              Daily Message Limit Reached
            </h1>
            <p style="color:#64748b;font-size:14px;margin:10px 0 0;line-height:1.6;">
              Your AI agent <strong style="color:#334155;">${p.agentName}</strong> has processed
              <strong style="color:#f87171;">50 messages</strong> today — the maximum allowed
              on the Free Plan.
            </p>
          </td>
        </tr>

        <!-- Alert box -->
        <tr>
          <td style="padding:20px 40px 8px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;">
              <tr><td style="padding:14px 16px;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#b91c1c;">
                  Your daily 50-message limit has been reached on the Free Plan.
                  Your agent is now paused. Please upgrade your plan to restore
                  services instantly.
                </p>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- Reset info -->
        <tr>
          <td style="padding:12px 40px 8px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;">
              <tr><td style="padding:12px 16px;">
                <p style="margin:0;font-size:12px;color:#1e40af;">
                  🕛 &nbsp;Your limit resets automatically at
                  <strong>${resetTime} UTC</strong> (midnight UTC).
                </p>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td align="center" style="padding:24px 40px 8px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-radius:10px;background:#2563eb;padding:12px 32px;text-align:center;">
                  <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://cyber-agent-studio.vercel.app'}/settings" target="_blank" style="color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;display:inline-block;letter-spacing:0.3px;">
                    Upgrade Plan
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
</html>`,
  });
}