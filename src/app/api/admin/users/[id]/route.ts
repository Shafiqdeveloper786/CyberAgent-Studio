import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

/**
 * PATCH /api/admin/users/[id] — Block/Unblock a user.
 * Body: { action: "block" | "unblock" }
 */
export async function PATCH(
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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { action, plan } = body;

    if (!["block", "unblock", "promote", "update_plan"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await dbConnect();

    const update: Record<string, unknown> = {};
    if (action === "block") update.isBlocked = true;
    if (action === "unblock") update.isBlocked = false;
    if (action === "promote") update.role = "admin";
    if (action === "update_plan") {
      if (!["free", "starter", "growth", "pro", "enterprise"].includes(plan)) {
        return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
      }
      update.subscription = plan;
    }

    const user = await User.findByIdAndUpdate(
      id,
      update,
      { new: true }
    ).select("name email isBlocked role subscription");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (err) {
    console.error("[admin/users] PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}