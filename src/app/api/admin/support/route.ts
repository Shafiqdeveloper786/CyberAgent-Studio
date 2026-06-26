import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";
import { sendSupportTicketEmail, sendAdminNotificationEmail } from "@/lib/email";

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "all";
    const isInternal = searchParams.get("isInternal") === "true";

    await connectDB();

    const Inquiry = (await import("@/models/Inquiry")).default;

    let query: any = {};
    if (isInternal !== undefined) {
      query.isInternal = isInternal;
    }
    if (status !== "all") {
      query.status = status;
    }
    
    // Get contactEmail from query params for filtering
    const contactEmail = searchParams.get("contactEmail");
    if (contactEmail) {
      query.contactEmail = contactEmail;
    }
    
    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: "i" } },
        { contactName: { $regex: search, $options: "i" } },
        { contactEmail: { $regex: search, $options: "i" } },
      ];
    }

    const tickets = await Inquiry.find(query).sort({ createdAt: -1 });

    return NextResponse.json({ ok: true, tickets }, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Failed to fetch support tickets:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch support tickets";
    return NextResponse.json({ ok: false, error: errorMessage }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { subject, category, message, contactName, contactEmail } = body;

    if (!subject || !message || !contactEmail) {
      return NextResponse.json({ ok: false, error: "Missing required fields" }, { status: 400 });
    }

    await connectDB();

    const Inquiry = (await import("@/models/Inquiry")).default;

    const ticket = await Inquiry.create({
      type: "external",
      subject,
      category: category || "general",
      message,
      contactName: contactName || "Visitor",
      contactEmail,
      status: "pending",
      isInternal: false,
      replies: [],
      chatContext: [
        {
          role: "user",
          content: message,
          timestamp: new Date().toISOString(),
        }
      ],
    });

    // Send emails
    try {
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail) {
        // Send notification to admin
        await sendAdminNotificationEmail({
          to: adminEmail,
          ticketId: ticket._id.toString(),
          subject: ticket.subject,
          contactName: ticket.contactName,
          contactEmail: ticket.contactEmail,
          message: message,
        });

        // Send confirmation to user
        await sendSupportTicketEmail({
          to: contactEmail,
          name: contactName || "User",
          ticketId: ticket._id.toString(),
          subject: ticket.subject,
          message: message,
        });
      }
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({ ok: true, ticket }, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Failed to create support ticket:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create support ticket";
    return NextResponse.json({ ok: false, error: errorMessage }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}