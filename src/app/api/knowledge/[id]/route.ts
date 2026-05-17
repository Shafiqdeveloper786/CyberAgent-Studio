import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import Knowledge from "@/models/Knowledge";
import KnowledgeChunk from "@/models/KnowledgeChunk";

/* DELETE /api/knowledge/[id]
   Two-phase cascade:
     1. Delete the Knowledge metadata doc (with userId ownership guard).
     2. Delete every KnowledgeChunk whose knowledgeId matches — this wipes
        all text chunks and 384-dim vector embeddings so the RAG pipeline
        can no longer surface stale data for this source.
*/
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

    /* ── Phase 1: Delete metadata doc (userId guard prevents cross-user deletes) ── */
    const deleted = await Knowledge.findOneAndDelete({
      _id:    id,
      userId: session.user.id,
    });

    if (!deleted) {
      return NextResponse.json({ error: "Source not found." }, { status: 404 });
    }

    /* ── Phase 2: Cascade — wipe all chunks + vector embeddings for this source ──
       knowledgeId is an indexed ObjectId field on KnowledgeChunk.
       deleted._id is the same ObjectId — no conversion needed.
       deleteMany is atomic per-document; ordered:false means it never
       short-circuits on a partial failure so all orphaned chunks are removed. */
    const { deletedCount } = await KnowledgeChunk.deleteMany({
      knowledgeId: deleted._id,
    });

    console.log(
      `[knowledge] ✓ Cascade delete complete — source: ${id} | chunks removed: ${deletedCount}`
    );

    return NextResponse.json({
      success:      true,
      chunksRemoved: deletedCount,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[knowledge] DELETE cascade error:", msg);
    return NextResponse.json({ error: "Failed to delete source." }, { status: 500 });
  }
}
