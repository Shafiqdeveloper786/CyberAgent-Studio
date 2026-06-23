import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Invitation from "@/models/Invitation";
import jwt from "jsonwebtoken";
import { transporter } from "@/lib/mailer";
import { buildInviteHtml } from "@/lib/email";

interface InviteBody {
  email: string;
  role: "Viewer" | "Editor" | "Admin";
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized. Please log in first." },
        { status: 401 }
      );
    }

    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    if (!adminEmail || session.user.email.toLowerCase() !== adminEmail) {
      return NextResponse.json(
        { ok: false, error: "Forbidden — only admins can invite teammates" },
        { status: 403 }
      );
    }

    const body = (await req.json()) as Partial<InviteBody>;
    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: email or role." },
        { status: 400 }
      );
    }

    if (!["Viewer", "Editor", "Admin"].includes(role)) {
      return NextResponse.json(
        { ok: false, error: "Invalid role value." },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check if there is already an active invitation for this email
    const existingInvite = await Invitation.findOne({
      email: email.toLowerCase(),
      isUsed: false,
      expiresAt: { $gt: new Date() },
    }).lean();

    if (existingInvite) {
      return NextResponse.json(
        { ok: false, error: "An active invitation already exists for this email address." },
        { status: 400 }
      );
    }

    // Generate secure JWT token containing invite details
    const secret = process.env.NEXTAUTH_SECRET || "cyberagent-studio-secret-change-in-production-32x";
    const token = jwt.sign(
      { email: email.toLowerCase(), role, invitedBy: session.user.id },
      secret,
      { expiresIn: "7d" }
    );

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Save invitation in database
    await Invitation.create({
      email: email.toLowerCase(),
      token,
      invitedBy: session.user.id,
      plan: role === "Admin" ? "pro" : "free",
      isUsed: false,
      expiresAt,
    });

    // Build landing invitation link
    const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const inviteLink = `${origin}/invite/${token}`;

    const emailUser = process.env.EMAIL_USER?.trim();
    const emailPass = process.env.EMAIL_PASS?.replace(/\s+/g, "");

    // If email service is not configured on the server, we still save in DB,
    // and return the link so they can invite manually.
    if (!emailUser || !emailPass) {
      console.warn("[invite] SMTP is offline. Printing link to terminal.");
      console.log(`\n\x1b[33m[invite] Collaboration link:\x1b[0m\n  → ${inviteLink}\n`);
      return NextResponse.json({
        ok: true,
        smtpOffline: true,
        inviteLink,
        message: "Invitation generated successfully. SMTP is offline, please copy the manual link."
      });
    }

    const from = (process.env.EMAIL_FROM ?? `CyberAgent Studio <${emailUser}>`).trim();

    // Send the email using our high-end corporateShell structure from buildInviteHtml
    await transporter.sendMail({
      from,
      to: email,
      subject: `Invitation to collaborate on CyberAgent Studio`,
      html: buildInviteHtml(session.user.name || session.user.email || "Administrator", inviteLink),
    });

    return NextResponse.json({ ok: true, inviteLink });
  } catch (err) {
    console.error("[/api/invite] Failed to process invitation:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to dispatch invitation. Please retry." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    if (!adminEmail || session.user.email?.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Forbidden — only admins can view team" }, { status: 403 });
    }

    await dbConnect();

    const invitations = await Invitation.find({ invitedBy: session.user.id }).lean();

    const members = invitations.map((inv: any) => ({
      id: inv._id.toString(),
      name: inv.email.split("@")[0],
      email: inv.email,
      role: (inv.plan === "pro" ? "Admin" : "Viewer") as "Admin" | "Viewer" | "Editor",
      status: (inv.isUsed ? "Active" : "Pending") as "Active" | "Pending",
    }));

    return NextResponse.json({ ok: true, members });
  } catch (err) {
    console.error("[/api/invite] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    if (!adminEmail || session.user.email?.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing invitation ID" }, { status: 400 });
    }

    await dbConnect();

    const deletedInvite = await Invitation.findOneAndDelete({
      _id: id,
      invitedBy: session.user.id,
    });

    if (!deletedInvite) {
      return NextResponse.json({ error: "Invitation not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/invite] DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
