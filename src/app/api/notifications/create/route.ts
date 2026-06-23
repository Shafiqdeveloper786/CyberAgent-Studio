import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Notification from "@/models/Notification";

/**
 * POST /api/notifications/create — Internal/Admin API to create a notification for any user.
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only allow admin role to create notifications for anyone
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden — Admins only" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, type, message } = body;

    if (!userId || !type || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await dbConnect();

    const notification = await Notification.create({
      userId,
      type,
      message,
      isRead: false,
    });

    return NextResponse.json({ ok: true, notification });
  } catch (err) {
    console.error("[notifications/create] POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
