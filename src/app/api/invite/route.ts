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
  <title>Nexus AI Workspace Invitation</title>
</head>
<body style="margin:0;padding:0;background:#050510;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
    <tr>
      <td align="center" style="padding:32px 16px">
        <table width="580" cellpadding="0" cellspacing="0" role="presentation" style="max-width:580px;width:100%">
          <tr>
            <td>

              <!-- Rainbow header bar -->
              <div style="height:3px;background:linear-gradient(90deg,#00f2ff,#a855f7,#ec4899);border-radius:3px 3px 0 0"></div>

              <!-- Card body -->
              <div style="background:#0a0a1a;border:1px solid rgba(0,242,255,0.15);border-top:none;border-radius:0 0 16px 16px;padding:36px 32px">

                <!-- Brand wordmark -->
                <p style="margin:0 0 28px;font-size:11px;font-weight:900;letter-spacing:0.18em;text-transform:uppercase;color:#00f2ff">
                  Nexus AI · Secure Workspace Portal
                </p>

                <!-- Heading -->
                <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#e2e8f0;line-height:1.3">
                  You&apos;ve been invited to collaborate
                </h1>
                <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6">
                  Hello,
                </p>
                <p style="margin:0 0 20px;font-size:14px;color:#94a3b8;line-height:1.8">
                  You have been officially invited to join
                  <strong style="color:#e2e8f0">${p.ownerEmail}</strong>&apos;s
                  secure workspace on <strong style="color:#00f2ff">Nexus AI</strong>
                  as a <strong style="color:#a855f7">${p.role}</strong>.
                </p>
                <p style="margin:0 0 28px;font-size:14px;color:#94a3b8;line-height:1.8">
                  Our workspace lets teams collaborate seamlessly on building, testing, and scaling
                  futuristic AI agents. To accept this invitation and configure your account access,
                  please click the secure deployment link below:
                </p>

                <!-- CTA Button -->
                <div style="text-align:center;margin:0 0 28px">
                  <a href="${p.inviteLink}"
                     style="display:inline-block;padding:14px 36px;background:linear-gradient(90deg,#00f2ff,#a855f7);color:#050510;font-size:14px;font-weight:900;text-decoration:none;border-radius:10px;letter-spacing:0.06em;text-transform:uppercase;box-shadow:0 4px 20px rgba(0,242,255,0.3)">
                    Join Workspace →
                  </a>
                </div>

                <!-- Fallback link block -->
                <div style="background:rgba(0,242,255,0.04);border:1px solid rgba(0,242,255,0.14);border-radius:8px;padding:14px 16px;margin:0 0 28px">
                  <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#475569">
                    If the button does not render, paste this coordinate link directly into your browser:
                  </p>
                  <p style="margin:0;font-size:11px;font-family:monospace;color:#00f2ff;word-break:break-all;line-height:1.6">
                    ${p.inviteLink}
                  </p>
                </div>

                <!-- Role badge -->
                <div style="display:inline-block;padding:4px 12px;background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.25);border-radius:999px;margin:0 0 24px">
                  <p style="margin:0;font-size:11px;font-weight:700;color:#a855f7;text-transform:uppercase;letter-spacing:0.12em">
                    Access Level: ${p.role}
                  </p>
                </div>

                <!-- Divider -->
                <div style="height:1px;background:rgba(255,255,255,0.06);margin:0 0 20px"></div>

                <!-- Footer -->
                <p style="margin:0;font-size:11px;color:#334155;line-height:1.7">
                  This invitation was sent from the Nexus AI workspace owned by
                  <strong style="color:#475569">${p.ownerEmail}</strong>.<br>
                  If you were not expecting this invitation, you can safely ignore this email.<br><br>
                  Regards,<br>
                  <strong style="color:#64748b">Nexus AI Global Billing &amp; Security Desk</strong>
                </p>
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
