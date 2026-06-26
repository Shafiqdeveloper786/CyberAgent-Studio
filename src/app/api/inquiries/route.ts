import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";

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

    // Dynamic import to avoid build issues
    const Inquiry = (await import("@/models/Inquiry")).default;

    let query: any = {};
    if (isInternal !== undefined) {
      query.isInternal = isInternal;
    }
    if (status !== "all") {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { subject: { $regex: search, $options: "i" } },
        { contactName: { $regex: search, $options: "i" } },
        { contactEmail: { $regex: search, $options: "i" } },
      ];
    }

    const inquiries = await Inquiry.find(query).sort({ createdAt: -1 });

    return NextResponse.json({ ok: true, tickets: inquiries }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error("Failed to fetch inquiries:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch inquiries";
    return NextResponse.json({ ok: false, error: errorMessage }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { subject, category, message } = body;

    if (!subject || !message) {
      return NextResponse.json({ ok: false, error: "Subject and message are required" }, { status: 400 });
    }

    await connectDB();

    const Inquiry = (await import("@/models/Inquiry")).default;

    const inquiry = await Inquiry.create({
      subject,
      category: category || "general",
      message,
      contactEmail: session.user.email,
      contactName: session.user.name || "User",
      status: "pending",
      isInternal: false,
      replies: [],
      chatContext: [],
    });

    return NextResponse.json({ ok: true, ticket: inquiry }, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error("Failed to create inquiry:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create inquiry";
    return NextResponse.json({ ok: false, error: errorMessage }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}
