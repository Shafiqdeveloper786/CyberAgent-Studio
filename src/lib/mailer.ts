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

export interface WeeklyReportPayload {
  toEmail:      string;
  userName:     string;
  weekStart:    string;
  weekEnd:      string;
  totalMessages: number;
  activeAgents: number;
  topAgent:     { name: string; messages: number } | null;
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
    subject: `Daily Message Limit Reached — ${p.agentName}`,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Daily Limit Reached</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center" style="padding:40px 16px">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%">
          <tr>
            <td>

              <!-- White card with gradient accent -->
              <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06)">

                <!-- Gradient header -->
                <div style="height:6px;background:linear-gradient(90deg,#f59e0b,#ef4444);"></div>

                <!-- Content -->
                <div style="padding:40px 36px">

                  <!-- Logo -->
                  <div style="text-align:center;margin:0 0 28px">
                    <p style="margin:0;font-size:28px;font-weight:900;color:#2563eb;letter-spacing:-1px;">CyberAgent Studio</p>
                  </div>

                  <!-- Badge -->
                  <div style="text-align:center;margin:0 0 24px">
                    <span style="display:inline-block;padding:6px 16px;background:#fef2f2;border:1px solid #fecaca;border-radius:999px;font-size:11px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.5px">
                      ⚠️ Limit Reached
                    </span>
                  </div>

                  <!-- Heading -->
                  <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#0f172a;line-height:1.3;text-align:center">
                    Daily Message Limit Reached
                  </h1>

                  <!-- Subtitle -->
                  <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.7;text-align:center">
                    Your AI agent <strong style="color:#1e293b">${p.agentName}</strong> has processed
                    <strong style="color:#dc2626">50 messages</strong> today — the maximum allowed on the Free Plan.
                  </p>

                  <!-- Alert box -->
                  <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;margin:0 0 24px">
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#991b1b">
                      Your daily 50-message limit has been reached. Your agent is now paused.
                      Please upgrade your plan to restore services instantly.
                    </p>
                  </div>

                  <!-- Reset info -->
                  <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px;margin:0 0 28px">
                    <p style="margin:0;font-size:13px;color:#1e40af;line-height:1.6">
                      🕛 Your limit resets automatically at
                      <strong style="color:#2563eb">${resetTime} UTC</strong> (midnight UTC).
                    </p>
                  </div>

                  <!-- CTA Button -->
                  <div style="text-align:center;margin:0 0 28px">
                    <a href="#upgrade"
                       style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;border-radius:12px;letter-spacing:0.02em;box-shadow:0 4px 16px rgba(245,158,11,0.25)">
                      Upgrade to Pro Plan →
                    </a>
                  </div>

                  <!-- Divider -->
                  <div style="height:1px;background:#e2e8f0;margin:0 0 20px"></div>

                  <!-- Footer -->
                  <p style="margin:0;font-size:12px;color:#64748b;line-height:1.7;text-align:center">
                    You received this because you are the owner of an agent on CyberAgent Studio.<br>
                    Upgrade to the <strong style="color:#f59e0b">Pro Plan</strong> for
                    5,000 messages per month with no daily caps.<br><br>
                    <strong style="color:#1e293b">CyberAgent Studio</strong> · AI Chatbot Builder
                  </p>
                </div>

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

/**
 * Sends weekly performance report email to users
 */
export async function sendWeeklyReportEmail(p: WeeklyReportPayload): Promise<void> {
  const from = (process.env.EMAIL_FROM ?? "CyberAgent Studio <muhammadshafiqchohan12@gmail.com>").trim();

  const topAgentSection = p.topAgent
    ? `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:0 0 24px">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.5px">🏆 Top Performing Agent</p>
        <p style="margin:0;font-size:16px;font-weight:700;color:#1e293b">${p.topAgent.name}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#64748b">${p.topAgent.messages.toLocaleString()} messages this week</p>
      </div>`
    : "";

  await transporter.sendMail({
    from,
    to:      p.toEmail,
    subject: `Your Weekly Performance Report — ${p.weekStart} to ${p.weekEnd}`,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Weekly Performance Report</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center" style="padding:40px 16px">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%">
          <tr>
            <td>

              <!-- White card with gradient accent -->
              <div style="background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06)">

                <!-- Gradient header -->
                <div style="height:6px;background:linear-gradient(90deg,#10b981,#059669);"></div>

                <!-- Content -->
                <div style="padding:40px 36px">

                  <!-- Logo -->
                  <div style="text-align:center;margin:0 0 28px">
                    <p style="margin:0;font-size:28px;font-weight:900;color:#2563eb;letter-spacing:-1px;">CyberAgent Studio</p>
                  </div>

                  <!-- Badge -->
                  <div style="text-align:center;margin:0 0 24px">
                    <span style="display:inline-block;padding:6px 16px;background:#d1fae5;border:1px solid #6ee7b7;border-radius:999px;font-size:11px;font-weight:700;color:#065f46;text-transform:uppercase;letter-spacing:0.5px">
                      📊 Weekly Report
                    </span>
                  </div>

                  <!-- Heading -->
                  <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#0f172a;line-height:1.3;text-align:center">
                    Your Weekly Performance Report
                  </h1>

                  <!-- Subtitle -->
                  <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.7;text-align:center">
                    Hi <strong style="color:#1e293b">${p.userName}</strong>, here's your performance summary for the week
                  </p>

                  <!-- Stats Grid -->
                  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:0 0 28px">
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;text-align:center">
                      <p style="margin:0 0 8px;font-size:28px;font-weight:900;color:#2563eb">${p.totalMessages.toLocaleString()}</p>
                      <p style="margin:0;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Total Messages</p>
                    </div>
                    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;text-align:center">
                      <p style="margin:0 0 8px;font-size:28px;font-weight:900;color:#7c3aed">${p.activeAgents}</p>
                      <p style="margin:0;font-size:12px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Active Agents</p>
                    </div>
                  </div>

                  <!-- Date Range -->
                  <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:16px;margin:0 0 24px;text-align:center">
                    <p style="margin:0;font-size:13px;color:#1e40af;line-height:1.6">
                      📅 Report Period: <strong style="color:#2563eb">${p.weekStart}</strong> to <strong style="color:#2563eb">${p.weekEnd}</strong>
                    </p>
                  </div>

                  <!-- Top Agent -->
                  ${topAgentSection}

                  <!-- Insights -->
                  <div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:20px;margin:0 0 28px">
                    <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#92400e">💡 Insights</p>
                    <p style="margin:0;font-size:13px;color:#64748b;line-height:1.7">
                      ${p.totalMessages > 1000
                        ? "Excellent performance! Your agents are handling high volumes effectively. Consider upgrading to Pro for unlimited messages."
                        : p.totalMessages > 500
                        ? "Great progress! Your agents are actively engaging users. Keep up the good work!"
                        : p.totalMessages > 0
                        ? "Your agents are getting started. Continue adding knowledge bases to improve performance."
                        : "No messages this week. Make sure your agents are properly configured and accessible."}
                    ${p.activeAgents === 0 ? " Create your first agent to get started!" : ""}
                    ${p.activeAgents > 0 && p.totalMessages === 0 ? " Check your agent settings and test the chat functionality." : ""}
                    ${p.totalMessages >= 50 ? " You're approaching the Free Plan limit. Consider upgrading to Pro for unlimited messages." : ""}
                    ${p.totalMessages >= 40 && p.totalMessages < 50 ? " You're close to the Free Plan limit (50 messages/day). Upgrade to Pro for unlimited access." : ""}
                  </p>
                  </div>

                  <!-- CTA Button -->
                  <div style="text-align:center;margin:0 0 28px">
                    <a href="/dashboard"
                       style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#10b981,#059669);color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;border-radius:12px;letter-spacing:0.02em;box-shadow:0 4px 16px rgba(16,185,129,0.25)">
                      View Dashboard →
                    </a>
                  </div>

                  <!-- Divider -->
                  <div style="height:1px;background:#e2e8f0;margin:0 0 20px"></div>

                  <!-- Footer -->
                  <p style="margin:0;font-size:12px;color:#64748b;line-height:1.7;text-align:center">
                    This is an automated weekly report from CyberAgent Studio.<br>
                    You can manage your email preferences in your account settings.<br><br>
                    <strong style="color:#1e293b">CyberAgent Studio</strong> · AI Chatbot Builder
                  </p>
                </div>

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