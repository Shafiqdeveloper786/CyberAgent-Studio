import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";

    // Mock transactions data - replace with actual database query
    const mockTransactions = [
      {
        _id: "tx_001",
        userId: { name: "John Doe", email: "john@example.com" },
        transactionId: "TXN-2024-001",
        plan: "Pro",
        amount: 29.99,
        currency: "USD",
        status: "succeeded",
        createdAt: new Date().toISOString(),
      },
      {
        _id: "tx_002",
        userId: { name: "Jane Smith", email: "jane@example.com" },
        transactionId: "TXN-2024-002",
        plan: "Basic",
        amount: 9.99,
        currency: "USD",
        status: "pending",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];

    let filtered = mockTransactions;
    
    if (search) {
      filtered = filtered.filter(tx => 
        tx.userId?.name?.toLowerCase().includes(search.toLowerCase()) ||
        tx.userId?.email?.toLowerCase().includes(search.toLowerCase()) ||
        tx.transactionId?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (status !== "all") {
      filtered = filtered.filter(tx => tx.status === status);
    }

    return NextResponse.json({ ok: true, transactions: filtered });
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    return NextResponse.json({ ok: false, error: "Failed to fetch transactions" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ ok: false, error: "Transaction ID required" }, { status: 400 });
    }

    const body = await req.json();
    const { action } = body;

    // Mock transaction update - replace with actual database update
    console.log(`Transaction ${id} action: ${action}`);

    return NextResponse.json({ 
      ok: true, 
      message: `Transaction ${action} successful`,
      transaction: { _id: id, action }
    });
  } catch (error) {
    console.error("Failed to update transaction:", error);
    return NextResponse.json({ ok: false, error: "Failed to update transaction" }, { status: 500 });
  }
}