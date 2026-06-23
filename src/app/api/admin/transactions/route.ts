import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import User from "@/models/User"; // Ensure registered

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden — Admins only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim().toLowerCase() || "";
    const status = searchParams.get("status")?.trim() || "";

    await dbConnect();

    // Query builder
    let query: any = {};

    if (status && status !== "all") {
      query.status = status;
    }

    // Since we need to search by user email, let's join/populate
    // Fetch all transactions and populate user
    const transactions = await Transaction.find(query)
      .populate({
        path: "userId",
        select: "name email image",
      })
      .sort({ createdAt: -1 })
      .lean();

    // Filter by search term on transactionId, user email, or user name
    const filtered = transactions.filter((tx: any) => {
      if (!search) return true;
      const txIdMatch = tx.transactionId?.toLowerCase().includes(search);
      const userEmailMatch = tx.userId?.email?.toLowerCase().includes(search);
      const userNameMatch = tx.userId?.name?.toLowerCase().includes(search);
      return txIdMatch || userEmailMatch || userNameMatch;
    });

    return NextResponse.json({ ok: true, transactions: filtered });
  } catch (err) {
    console.error("[admin/transactions] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
