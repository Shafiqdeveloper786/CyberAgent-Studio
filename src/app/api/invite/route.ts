import { NextRequest, NextResponse } from "next/server";
import { transporter } from "@/lib/mailer";

interface InviteBody {
  email:      string;
  role:       string;
  token:      string;
  inviteLink: string;
  ownerEmail: string;
}

/* Build the premium HTML email */
function buildInviteHtml(p: InviteBody): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>You're Invited to CyberAgent Studio</title>
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
                <div style="height:6px;background:linear-gradient(90deg,#2563eb,#7c3aed);"></div>

                <!-- Content -->
                <div style="padding:40px 36px">

                  <!-- Logo -->
                  <div style="text-align:center;margin:0 0 28px">
                    <p style="margin:0;font-size:28px;font-weight:900;color:#2563eb;letter-spacing:-1px;">CyberAgent Studio</p>
                  </div>

                  <!-- Badge -->
                  <div style="text-align:center;margin:0 0 24px">
                    <span style="display:inline-block;padding:6px 16px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:999px;font-size:11px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:0.5px">
                      ✉️ Team Invitation
                    </span>
                  </div>

                  <!-- Heading -->
                  <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#0f172a;line-height:1.3;text-align:center">
                    You're Invited to Join
                  </h1>

                  <!-- Subtitle -->
                  <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.7;text-align:center">
                    <strong style="color:#1e293b">${p.ownerEmail}</strong> has invited you to collaborate on their AI workspace
                  </p>

                  <!-- Info card -->
                  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:0 0 28px">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;border-bottom:1px solid #e2e8f0">
                          <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Role</span>
                          <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#1e293b">${p.role}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0">
                          <span style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px">Invited By</span>
                          <p style="margin:4px 0 0;font-size:14px;font-weight:600;color:#1e293b">${p.ownerEmail}</p>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- CTA Button -->
                  <div style="text-align:center;margin:0 0 28px">
                    <a href="${p.inviteLink}"
                       style="display:inline-block;padding:16px 40px;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;border-radius:12px;letter-spacing:0.02em;box-shadow:0 4px 16px rgba(37,99,235,0.25)">
                      Accept Invitation →
                    </a>
                  </div>

                  <!-- Fallback link -->
                  <div style="background:#fefce8;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;margin:0 0 24px">
                    <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.5px">
                      Button not working?
                    </p>
                    <p style="margin:0;font-size:11px;font-family:monospace;color:#2563eb;word-break:break-all;line-height:1.6">
                      ${p.inviteLink}
                    </p>
                  </div>

                  <!-- Divider -->
                  <div style="height:1px;background:#e2e8f0;margin:0 0 20px"></div>

                  <!-- Footer -->
                  <p style="margin:0;font-size:12px;color:#64748b;line-height:1.7;text-align:center">
                    This invitation was sent to you by <strong style="color:#1e293b">${p.ownerEmail}</strong>.<br>
                    If you weren't expecting this, you can safely ignore this email.<br><br>
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
</html>`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<InviteBody>;
    const { email, role, token, inviteLink, ownerEmail } = body;

    if (!email || !role || !token || !inviteLink) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields." },
        { status: 400 }
      );
    }

    const emailUser = process.env.EMAIL_USER?.trim();
    const emailPass = process.env.EMAIL_PASS?.replace(/\s+/g, "");

    if (!emailUser || !emailPass) {
      return NextResponse.json(
        { ok: false, error: "Email service is not configured on this server." },
        { status: 503 }
      );
    }

    const from = (process.env.EMAIL_FROM ?? `CyberAgent Studio <${emailUser}>`).trim();

    await transporter.sendMail({
      from,
      to:      email,
      subject: "Invitation to Collaborate on Nexus AI Workspace",
      html:    buildInviteHtml({
        email,
        role,
        token,
        inviteLink,
        ownerEmail: ownerEmail ?? emailUser,
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/invite] Failed to send invitation:", err);
    return NextResponse.json(
      { ok: false, error: "Mail dispatch failed. Please use the manual link." },
      { status: 500 }
    );
  }
}
