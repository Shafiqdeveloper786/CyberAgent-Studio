import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Transaction from "@/models/Transaction";
import User from "@/models/User";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden — Admins only" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { action, notes } = body; // action: "approve" | "reject" | "refund"

    if (!action) {
      return NextResponse.json({ error: "Missing action in request body" }, { status: 400 });
    }

    await dbConnect();

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    let newStatus: "succeeded" | "rejected" | "refunded" = "succeeded";
    if (action === "reject") {
      newStatus = "rejected";
    } else if (action === "refund") {
      newStatus = "refunded";
    }

    transaction.status = newStatus;
    if (notes !== undefined) {
      transaction.notes = notes;
    }

    await transaction.save();

    // If successfully approved (succeeded), we should make sure the user's subscription is updated!
    if (newStatus === "succeeded") {
      await User.findByIdAndUpdate(transaction.userId, {
        $set: { subscription: transaction.plan }
      });
      console.log(`[admin/transactions] User ${transaction.userId} plan updated to ${transaction.plan}`);
    } else if (newStatus === "rejected" || newStatus === "refunded") {
      // Demote to free if rejecting/refunding active transaction
      await User.findByIdAndUpdate(transaction.userId, {
        $set: { subscription: "free" }
      });
      console.log(`[admin/transactions] User ${transaction.userId} demoted to free plan due to transaction status: ${newStatus}`);
    }

    return NextResponse.json({ ok: true, transaction });
  } catch (err) {
    console.error("[admin/transactions/id] PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
