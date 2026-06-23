import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Invitation from "@/models/Invitation";
import User from "@/models/User";
import VerificationToken from "@/models/VerificationToken";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ ok: false, error: "Missing invitation token." }, { status: 400 });
    }

    const secret = process.env.NEXTAUTH_SECRET || "cyberagent-studio-secret-change-in-production-32x";
    
    let decoded: any;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      console.error("[invite/accept] JWT verify failed:", err);
      return NextResponse.json({ ok: false, error: "Invitation link is invalid or has expired." }, { status: 400 });
    }

    const { email, role } = decoded;

    await dbConnect();

    // Find valid invitation in DB
    const invite = await Invitation.findOne({
      email: email.toLowerCase(),
      token,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!invite) {
      return NextResponse.json({ ok: false, error: "Invitation is invalid, expired, or has already been used." }, { status: 400 });
    }

    // Check if user already exists
    let user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      // Auto-register the user
      const name = email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "") || "user";
      user = await User.create({
        name,
        email: email.toLowerCase(),
        isVerified: true,
        role: "user", // Default role
        subscription: "free", // Default plan
        authMethod: "email",
      });
      console.log(`[invite/accept] Registered new user: ${user._id} (${email})`);
    } else {
      // Make sure existing user is verified
      if (!user.isVerified) {
        user.isVerified = true;
        await user.save();
      }
      console.log(`[invite/accept] Verified existing user: ${user._id} (${email})`);
    }

    // Mark invitation as used
    invite.isUsed = true;
    await invite.save();

    // Create a temporary OTP to perform passwordless login for this user
    const tempOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes validity

    // Remove any previous OTPs
    await VerificationToken.deleteMany({ email: user.email });

    // Store temporary OTP
    await VerificationToken.create({
      email: user.email,
      token: tempOtp,
      expiresAt: otpExpiry,
    });

    return NextResponse.json({
      ok: true,
      email: user.email,
      otp: tempOtp,
    });
  } catch (err) {
    console.error("[invite/accept] POST error:", err);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}
