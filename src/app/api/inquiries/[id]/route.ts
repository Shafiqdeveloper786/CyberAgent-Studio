import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectDB } from "@/lib/mongodb";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    if (!status || !["pending", "in-progress", "resolved"].includes(status)) {
      return NextResponse.json({ ok: false, error: "Invalid status" }, { status: 400 });
    }

    await connectDB();

    const Inquiry = (await import("@/models/Inquiry")).default;

    const { id } = await params;
    const ticket = await Inquiry.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!ticket) {
      return NextResponse.json({ ok: false, error: "Ticket not found" }, { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return NextResponse.json({ ok: true, ticket }, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Failed to update inquiry:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update inquiry";
    return NextResponse.json({ ok: false, error: errorMessage }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const Inquiry = (await import("@/models/Inquiry")).default;

    const { id } = await params;
    const ticket = await Inquiry.findByIdAndDelete(id);

    if (!ticket) {
      return NextResponse.json({ ok: false, error: "Ticket not found" }, { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return NextResponse.json({ ok: true }, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Failed to delete inquiry:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to delete inquiry";
    return NextResponse.json({ ok: false, error: errorMessage }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}