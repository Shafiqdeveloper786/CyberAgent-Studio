import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { sendReplyNotificationEmail } from "@/lib/email";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params;
    const ticket = await Inquiry.findById(id);

    if (!ticket) {
      return NextResponse.json({ ok: false, error: "Ticket not found" }, { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const reply = {
      sender: "admin" as const,
      message: message.trim(),
      timestamp: new Date().toISOString(),
    };

    ticket.replies.push(reply);
    ticket.status = "in-progress";
    await ticket.save();

    // Send email notification to user with admin's reply (fire and forget - don't wait)
    // Only send email for admin replies, not for user replies
    sendReplyNotificationEmail({
      to: ticket.contactEmail,
      name: ticket.contactName,
      ticketId: ticket._id.toString(),
      subject: `Re: ${ticket.subject}`,
      adminReply: message.trim(),
    }).catch(err => console.error("Failed to send reply notification email:", err));

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