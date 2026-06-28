import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteCtx) {
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

    const body = await req.json();
    const { action } = body;

    await connectDB();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    // 3. Prevent self-modification for blocking and role promotion
    if (user.email.toLowerCase() === session.user.email.toLowerCase() && (action === "block" || action === "unblock" || action === "promote")) {
      return NextResponse.json({ ok: false, error: "You cannot block/promote your own admin account" }, { status: 400 });
    }

    let updateFields: Record<string, any> = {};

    switch (action) {
      case "block":
        updateFields.isBlocked = true;
        break;
      case "unblock":
        updateFields.isBlocked = false;
        break;
      case "promote":
        updateFields.role = "admin";
        break;
      case "update_plan":
        const { plan } = body;
        const validPlans = ["free", "starter", "growth", "pro", "enterprise"];
        if (!validPlans.includes(plan)) {
          return NextResponse.json({ ok: false, error: `Invalid subscription plan: ${plan}` }, { status: 400 });
        }
        updateFields.subscription = plan;
        break;
      default:
        return NextResponse.json({ ok: false, error: `Invalid action: ${action}` }, { status: 400 });
    }

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    );

    console.log(`[admin] User ${id} updated:`, updateFields);

    return NextResponse.json({
      ok: true,
      message: `User updated successfully`,
      user: updatedUser,
    });
  } catch (err) {
    console.error("[admin] User PATCH error:", err);
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : "Internal server error",
    }, { status: 500 });
  }
}
