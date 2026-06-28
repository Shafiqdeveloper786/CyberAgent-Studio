import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type RouteCtx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteCtx) {
  try {
    const session = await getServerSession(authOptions);

    // 1. Authentication Check
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // 2. Admin Whitelist Verification
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    if (!adminEmail || session.user.email.toLowerCase() !== adminEmail) {
      return NextResponse.json({ ok: false, error: "Forbidden — not an admin" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ ok: false, error: "User ID is required" }, { status: 400 });
    }

    // Return mock Stripe transaction history for this user
    const mockTransactions = [
      {
        transactionId: `ch_${Math.random().toString(36).substring(2, 16)}`,
        plan: "pro",
        amount: 29.00,
        currency: "USD",
        status: "succeeded",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        transactionId: `ch_${Math.random().toString(36).substring(2, 16)}`,
        plan: "starter",
        amount: 9.00,
        currency: "USD",
        status: "succeeded",
        createdAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
      }
    ];

    return NextResponse.json({
      ok: true,
      transactions: mockTransactions,
    });
  } catch (err) {
    console.error("[admin] User Payments GET error:", err);
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : "Internal server error",
    }, { status: 500 });
  }
}
