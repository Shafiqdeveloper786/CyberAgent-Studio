import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { sendReplyNotificationEmail } from "@/lib/email";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { message } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ ok: false, error: "Message is required" }, { status: 400 });
    }

    await connectDB();

    const Inquiry = (await import("@/models/Inquiry")).default;

    const ticket = await Inquiry.findById(params.id);

    if (!ticket) {
      return NextResponse.json({ ok: false, error: "Ticket not found" }, { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Determine sender: if session user is admin, mark as admin, otherwise user
    const isAdmin = session.user.role === "admin";
    const sender = isAdmin ? "admin" : "user";

    const reply = {
      sender: sender,
      message: message.trim(),
      timestamp: new Date().toISOString(),
    };

    ticket.replies.push(reply);
    
    // Only update status to in-progress if admin replies
    if (isAdmin) {
      ticket.status = "in-progress";
    }
    
    await ticket.save();

    // Send email notification to ADMIN when user replies
    // (Admin should be notified when user sends a new message)
    if (!isAdmin && process.env.ADMIN_EMAIL) {
      try {
        await sendReplyNotificationEmail({
          to: process.env.ADMIN_EMAIL,
          name: "Admin",
          ticketId: ticket._id.toString(),
          subject: `Re: ${ticket.subject}`,
          adminReply: message.trim(),
        });
      } catch (emailError) {
        console.error("Failed to send admin notification email:", emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({ ok: true, ticket }, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Failed to send reply:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to send reply";
    return NextResponse.json({ ok: false, error: errorMessage }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
