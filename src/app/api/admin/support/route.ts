import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import SupportTicket from "@/models/SupportTicket";

/* ── GET /api/admin/support — all tickets with optional type/status/search filters ── */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    if (!adminEmail || session.user.email.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Forbidden — not an admin" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status    = searchParams.get("status");
    const typeFilter = searchParams.get("type");
    const search    = searchParams.get("search");
    const isInternalParam = searchParams.get("isInternal");

    await connectDB();

    const query: Record<string, unknown> = {};

    /* isInternal filter — segregates admin/internal from external/customer tickets */
    if (isInternalParam !== null) {
      query.isInternal = isInternalParam === "true";
    }

    /* Status filter */
    if (status && status !== "all") {
      query.status = status;
    }

    /* Type filter: 'internal' | 'external' | 'all' (default) */
    if (typeFilter && typeFilter !== "all") {
      query.type = typeFilter;
    }

    /* Text search */
    if (search) {
      const cleanSearch = search.trim();
      query.$or = [
        { contactName:  { $regex: cleanSearch, $options: "i" } },
        { contactEmail: { $regex: cleanSearch, $options: "i" } },
        { subject:      { $regex: cleanSearch, $options: "i" } },
      ];
    }

    const tickets = await SupportTicket.find(query)
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json({ ok: true, tickets });
  } catch (err) {
    console.error("[admin-support] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
