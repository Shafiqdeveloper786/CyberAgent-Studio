import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SupportTicket from "@/models/SupportTicket";
import { getTenantFromSession } from "@/lib/sessionMiddleware";

type RouteCtx = { params: Promise<{ id: string }> };

/* ── DELETE /api/support/[id] — delete user's own internal support ticket ── */
export async function DELETE(_req: Request, { params }: RouteCtx) {
  const result = await getTenantFromSession();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const tenantId = result.tenant.tenantId;

  const { id } = await params;

  try {
    await connectDB();

    /* SECURITY: Only delete if the ticket is internal and belongs to the authenticated user. */
    const ticket = await SupportTicket.findOneAndDelete({
      _id: id,
      type: "internal",
      userId: tenantId,
    });

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found or access denied." }, { status: 404 });
    }

    console.log(`[support] ✓ User ${tenantId} deleted support ticket ${id}`);
    return NextResponse.json({ ok: true, deletedId: id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[support] DELETE error:", msg);
    return NextResponse.json({ error: "Failed to delete ticket." }, { status: 500 });
  }
}
