import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Notification from "@/models/Notification";

/**
 * POST /api/notifications/mark-all-read — Mark all notifications as read for current user.
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const result = await Notification.updateMany(
      { userId: session.user.id, isRead: false },
      { $set: { isRead: true } }
    );

    return NextResponse.json({ ok: true, modifiedCount: result.modifiedCount });
  } catch (err) {
    console.error("[notifications/mark-all-read] POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
