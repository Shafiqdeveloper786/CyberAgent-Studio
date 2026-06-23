import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import Stripe from "stripe";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    if (!adminEmail || session.user.email.toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Forbidden — not an admin" }, { status: 403 });
    }

    const { id } = await params;
    await dbConnect();

    const user = await User.findById(id).lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let stripeTransactions: any[] = [];
    const stripeKey = process.env.STRIPE_SECRET_KEY;

    if (stripeKey) {
      try {
        const stripe = new Stripe(stripeKey, {
          apiVersion: "2025-01-27.accredited" as any, // dynamic version fallback
        });
        const customers = await stripe.customers.list({
          email: user.email,
          limit: 1,
        });

        if (customers.data.length > 0) {
          const charges = await stripe.charges.list({
            customer: customers.data[0].id,
            limit: 20,
          });

          stripeTransactions = charges.data.map((c) => ({
            transactionId: c.id,
            amount: c.amount / 100,
            currency: c.currency.toUpperCase(),
            status: c.status === "succeeded" ? "succeeded" : c.status,
            plan: c.metadata?.plan || "pro",
            createdAt: new Date(c.created * 1000),
          }));
        }
      } catch (stripeErr) {
        console.error("[payments-api] Stripe fetch error:", stripeErr);
        // Fallback to local DB if Stripe fails
      }
    }

    // Fetch local transactions from DB
    const dbTransactions = await Transaction.find({ userId: id })
      .sort({ createdAt: -1 })
      .lean();

    // Merge transactions (deduplicated by transactionId)
    const transactionMap = new Map<string, any>();
    
    stripeTransactions.forEach(t => transactionMap.set(t.transactionId, t));
    dbTransactions.forEach(t => {
      transactionMap.set(t.transactionId, {
        transactionId: t.transactionId,
        amount: t.amount,
        currency: t.currency.toUpperCase(),
        status: t.status,
        plan: t.plan,
        createdAt: t.createdAt,
      });
    });

    let mergedTransactions = Array.from(transactionMap.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );

    return NextResponse.json({ transactions: mergedTransactions });
  } catch (err) {
    console.error("[admin/payments] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
