import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Knowledge from "@/models/Knowledge";

/* DELETE /api/knowledge/[id] */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    await connectDB();

    /* userId guard — users can only delete their own sources */
    const deleted = await Knowledge.findOneAndDelete({
      _id:    id,
      userId: session.user.id,
    });

    if (!deleted) {
      return NextResponse.json({ error: "Source not found." }, { status: 404 });
    }

    console.log(`[knowledge] ✓ Deleted source ${id}`);
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[knowledge] DELETE error:", msg);
    return NextResponse.json({ error: "Failed to delete source." }, { status: 500 });
  }
}
