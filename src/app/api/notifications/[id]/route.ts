import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Notification from "@/models/Notification";

/**
 * PATCH /api/notifications/[id] — Mark a notification as read/unread.
 * Body: { isRead: boolean }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { isRead } = body;

    if (typeof isRead !== "boolean") {
      return NextResponse.json({ error: "Invalid isRead parameter" }, { status: 400 });
    }

    await dbConnect();

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: session.user.id },
      { isRead },
      { new: true }
    );

    if (!notification) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }

    return NextResponse.json({ notification });
  } catch (err) {
    console.error("[notifications] PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
