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
<body style="margin:0;padding:0;background:#050510;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center" style="padding:32px 16px">
        <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;width:100%">
          <tr>
            <td>
              <!-- Rainbow top bar -->
              <div style="height:3px;background:linear-gradient(90deg,#00f2ff,#a855f7,#ec4899);border-radius:3px 3px 0 0"></div>

              <!-- Card body -->
              <div style="background:#0a0a1a;border:1px solid rgba(0,242,255,0.15);border-top:none;border-radius:0 0 12px 12px;padding:32px 28px">

                <!-- Brand -->
                <p style="margin:0 0 24px;font-size:11px;font-weight:900;letter-spacing:0.15em;color:#00f2ff;text-transform:uppercase">
                  CyberAgent Studio
                </p>

                <!-- Heading -->
                <h1 style="margin:0 0 10px;font-size:20px;font-weight:800;color:#f87171">
                  Daily Message Limit Reached
                </h1>

                <!-- Intro -->
                <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#94a3b8">
                  Your AI agent <strong style="color:#e2e8f0">${p.agentName}</strong> has processed
                  <strong style="color:#f87171">50 messages</strong> today — the maximum allowed
                  on the Free Plan.
                </p>

                <!-- Alert box -->
                <div style="background:rgba(248,113,113,0.07);border:1px solid rgba(248,113,113,0.22);border-radius:8px;padding:14px 16px;margin:0 0 20px">
                  <p style="margin:0;font-size:13px;line-height:1.6;color:#fca5a5">
                    Your daily 50-message limit has been reached on the Free Plan.
                    Your agent is now paused. Please upgrade your plan to restore
                    services instantly.
                  </p>
                </div>

                <!-- Reset info -->
                <div style="background:rgba(0,242,255,0.04);border:1px solid rgba(0,242,255,0.14);border-radius:8px;padding:12px 16px;margin:0 0 28px">
                  <p style="margin:0;font-size:12px;color:#64748b">
                    🕛 &nbsp;Your limit resets automatically at
                    <strong style="color:#00f2ff">${resetTime} UTC</strong> (midnight UTC).
                  </p>
                </div>

                <!-- Divider -->
                <div style="height:1px;background:rgba(255,255,255,0.06);margin:0 0 20px"></div>

                <!-- Footer -->
                <p style="margin:0;font-size:11px;color:#334155;line-height:1.6">
                  You received this because you are the owner of an agent on CyberAgent Studio.<br>
                  Upgrade to the <strong style="color:#a855f7">Pro Plan</strong> for
                  5,000 messages per month with no daily caps.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
}
