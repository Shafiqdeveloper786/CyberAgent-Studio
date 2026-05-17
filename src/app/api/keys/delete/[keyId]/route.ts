import { getServerSession } from "next-auth";
import { authOptions }      from "@/lib/auth";
import { NextResponse }     from "next/server";

/**
 * DELETE /api/keys/delete/:keyId
 *
 * Revokes a platform API key from MongoDB.
 * Currently returns 200 for platform (scope-scoped) keys.
 * Wire to a real Key model when platform keys are persisted.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ keyId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { keyId } = await params;
  if (!keyId?.trim()) {
    return NextResponse.json({ error: "keyId is required" }, { status: 400 });
  }

  /* TODO: when platform keys are persisted, delete from DB here:
     await connectDB();
     await ApiKey.deleteOne({ _id: keyId, userId: session.user.id });
  */

  return NextResponse.json({ success: true, deleted: keyId });
}
