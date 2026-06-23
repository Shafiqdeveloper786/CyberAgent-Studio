import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SupportTicket from "@/models/SupportTicket";
import { getTenantFromSession } from "@/lib/sessionMiddleware";

type RouteCtx = { params: Promise<{ id: string }> };

/* ── PATCH /api/inquiries/[id] — update external inquiry status by tenant ── */
export async function PATCH(req: Request, { params }: RouteCtx) {
  const result = await getTenantFromSession();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const tenantId = result.tenant.tenantId;

  const { id } = await params;
  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const status = body.status;
  const validStatuses = ["pending", "in-progress", "resolved"];
  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    await connectDB();

    /* SECURITY: Ensure the ticket belongs to the current tenant and is external */
    const ticket = await SupportTicket.findOneAndUpdate(
      {
        _id:      id,
        type:     "external",
        tenantId: tenantId,
      },
      { $set: { status } },
      { new: true }
    );

    if (!ticket) {
      return NextResponse.json({ error: "Inquiry not found." }, { status: 404 });
    }

    console.log(`[inquiries] Tenant updated inquiry ${id} status → ${status}`);
    return NextResponse.json({ ok: true, ticket });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[inquiries] PATCH status error:", msg);
    return NextResponse.json({ error: "Failed to update status." }, { status: 500 });
  }
}

/* ── DELETE /api/inquiries/[id] — tenant hard-deletes their own inquiry ── */
export async function DELETE(_req: Request, { params }: RouteCtx) {
  const result = await getTenantFromSession();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const tenantId = result.tenant.tenantId;

  const { id } = await params;

  try {
    await connectDB();

    /* SECURITY: Only delete if the ticket belongs to the authenticated tenant.
       Checks both tenantId (external) and userId (internal) ownership.        */
    const ticket = await SupportTicket.findOneAndDelete({
      _id: id,
      $or: [
        { tenantId: tenantId },
        { userId:   tenantId },
      ],
    });

    if (!ticket) {
      return NextResponse.json({ error: "Inquiry not found or access denied." }, { status: 404 });
    }

    console.log(`[inquiries] ✓ Tenant ${tenantId} deleted inquiry ${id}`);
    return NextResponse.json({ ok: true, deletedId: id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[inquiries] DELETE error:", msg);
    return NextResponse.json({ error: "Failed to delete inquiry." }, { status: 500 });
  }
}

