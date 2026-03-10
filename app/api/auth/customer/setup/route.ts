import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase/server";
import { signSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, otp, device_id, password } = body;

  if (!email || !otp || !device_id || !password) {
    return NextResponse.json(
      { error: "email, otp, device_id, and password are required" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  // Verify OTP token
  const { data: tokenRow, error: tokenError } = await supabaseAdmin
    .from("otp_tokens")
    .select("id, token, expires_at")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (tokenError || !tokenRow) {
    return NextResponse.json(
      { error: "Invalid or expired code. Please go back and request a new one." },
      { status: 401 }
    );
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    await supabaseAdmin.from("otp_tokens").delete().eq("id", tokenRow.id);
    return NextResponse.json(
      { error: "Code has expired. Please go back and request a new one." },
      { status: 401 }
    );
  }

  if (tokenRow.token !== otp) {
    return NextResponse.json(
      { error: "Invalid code. Please try again." },
      { status: 401 }
    );
  }

  // Consume the OTP
  await supabaseAdmin.from("otp_tokens").delete().eq("id", tokenRow.id);

  // Verify the device exists
  const { data: device, error: deviceError } = await supabaseAdmin
    .from("devices")
    .select("id")
    .eq("device_id", device_id)
    .single();

  if (deviceError || !device) {
    return NextResponse.json({ error: "Device not found." }, { status: 404 });
  }

  // Hash the password and save it
  const passwordHash = await bcrypt.hash(password, 10);

  const { error: updateError } = await supabaseAdmin
    .from("customers")
    .update({ password_hash: passwordHash })
    .eq("email", email.toLowerCase().trim());

  if (updateError) {
    console.error("Password save error:", updateError.message);
    return NextResponse.json(
      { error: "Failed to save your password. Please try again." },
      { status: 500 }
    );
  }

  // Create signed session cookie
  const sessionValue = signSession(email.toLowerCase().trim());
  const res = NextResponse.json({ redirect: "/dashboard" });
  res.cookies.set("cs", sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });

  return res;
}
