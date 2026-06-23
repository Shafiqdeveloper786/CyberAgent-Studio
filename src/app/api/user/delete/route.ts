import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Agent from "@/models/Agent";
import Knowledge from "@/models/Knowledge";
import KnowledgeChunk from "@/models/KnowledgeChunk";
import Notification from "@/models/Notification";
import Invitation from "@/models/Invitation";
import Quota from "@/models/Quota";
import Transaction from "@/models/Transaction";
import VerificationToken from "@/models/VerificationToken";

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    await dbConnect();

    // Cascade deletes
    // 1. Delete all knowledge chunks for the user
    await KnowledgeChunk.deleteMany({ userId });

    // 2. Delete all knowledge bases for the user
    await Knowledge.deleteMany({ userId });

    // 3. Delete all agents created by the user
    await Agent.deleteMany({ userId });

    // 4. Delete all notifications for the user
    await Notification.deleteMany({ userId });

    // 5. Delete all invitations sent by this user
    await Invitation.deleteMany({ invitedBy: userId });

    // 6. Delete quota record
    await Quota.deleteMany({ userId });

    // 7. Delete transaction history
    await Transaction.deleteMany({ userId });

    // 8. Delete verification tokens
    if (userEmail) {
      await VerificationToken.deleteMany({ email: userEmail.toLowerCase() });
    }

    // 9. Finally, delete the User record itself
    await User.findByIdAndDelete(userId);

    console.log(`[user/delete] Successfully deleted user account and cascade-deleted all records for userId: ${userId}`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[user/delete] DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
