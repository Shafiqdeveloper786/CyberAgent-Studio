import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import SupportTicket from "@/models/SupportTicket";
import { getTenantFromSession } from "@/lib/sessionMiddleware";

/* ── GET /api/inquiries — tenant-scoped: only external tickets for current user ── */
export async function GET(req: Request) {
  const result = await getTenantFromSession();
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const tenantId = result.tenant.tenantId;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const search = searchParams.get("search");
    const isInternalParam = searchParams.get("isInternal");

    await connectDB();

    /* SECURITY: Always filter by tenantId === current user */
    const query: Record<string, unknown> = {
      type:     "external",
      tenantId: tenantId,
    };

    if (isInternalParam !== null) {
      query.isInternal = isInternalParam === "true";
    }

    if (status && status !== "all") {
      query.status = status;
    }

    if (search) {
      const s = search.trim();
      query.$or = [
        { contactName:  { $regex: s, $options: "i" } },
        { contactEmail: { $regex: s, $options: "i" } },
        { subject:      { $regex: s, $options: "i" } },
      ];
    }

    const tickets = await SupportTicket.find(query)
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({ ok: true, tickets });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[inquiries] GET error:", msg);
    return NextResponse.json({ error: "Failed to fetch inquiries." }, { status: 500 });
  }
}
