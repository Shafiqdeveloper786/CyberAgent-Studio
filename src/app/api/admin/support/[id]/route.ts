import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import SupportTicket from "@/models/SupportTicket";

type RouteCtx = { params: Promise<{ id: string }> };

/* ── Admin auth helper ── */
async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return { ok: false, status: 401, error: "Unauthorized" } as const;
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  if (!adminEmail || session.user.email.toLowerCase() !== adminEmail) {
    return { ok: false, status: 403, error: "Forbidden — not an admin" } as const;
  }
  return { ok: true, session } as const;
}

/* ── PATCH /api/admin/support/[id] — update ticket status ── */
export async function PATCH(req: Request, { params }: RouteCtx) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;
    let body: { status?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    const status = body.status;
    const validStatuses = ["pending", "in-progress", "resolved"];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    await connectDB();
    const ticket = await SupportTicket.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    );

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }

    console.log(`[admin-support] ✓ Updated ticket ${id} status → ${status}`);
    return NextResponse.json({ ok: true, ticket });
  } catch (err) {
    console.error("[admin-support] PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/* ── DELETE /api/admin/support/[id] — hard-delete a ticket (admin only) ── */
export async function DELETE(_req: Request, { params }: RouteCtx) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { id } = await params;

    await connectDB();
    const ticket = await SupportTicket.findByIdAndDelete(id);

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found." }, { status: 404 });
    }

    console.log(`[admin-support] ✓ Deleted ticket ${id}`);
    return NextResponse.json({ ok: true, deletedId: id });
  } catch (err) {
    console.error("[admin-support] DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

