import { getServerSession } from "next-auth";
import { authOptions }      from "@/lib/auth";
import connectDB            from "@/lib/mongodb";
import User                 from "@/models/User";
import { NextResponse }     from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectDB();

    const user = await User.findOne({ email: session.user.email.toLowerCase() })
      .select("name email authMethod createdAt subscription")
      .lean<{
        name: string; email: string;
        authMethod: string; createdAt: Date; subscription: string;
      }>();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      name:         user.name,
      email:        user.email,
      authMethod:   user.authMethod,
      createdAt:    user.createdAt instanceof Date
                      ? user.createdAt.toISOString()
                      : String(user.createdAt),
      subscription: user.subscription,
    });
  } catch (err) {
    console.error("[api/user/profile] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
