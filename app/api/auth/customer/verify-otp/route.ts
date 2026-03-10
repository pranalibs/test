import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { signSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, otp, device_id, mode } = body;

  const isDeviceVerifyMode = mode === "device_verify";

  if (!email || !otp || !device_id) {
    return NextResponse.json(
      { error: "email, otp, and device_id are required" },
      { status: 400 }
    );
  }

  // Look up the stored OTP token
  const { data: tokenRow, error: tokenError } = await supabaseAdmin
    .from("otp_tokens")
    .select("id, token, expires_at")
    .eq("email", email)
    .single();

  if (tokenError || !tokenRow) {
    return NextResponse.json(
      { error: "Invalid or expired code. Please try again." },
      { status: 401 }
    );
  }

  // Check expiry
  if (new Date(tokenRow.expires_at) < new Date()) {
    await supabaseAdmin.from("otp_tokens").delete().eq("id", tokenRow.id);
    return NextResponse.json(
      { error: "Code has expired. Please request a new one." },
      { status: 401 }
    );
  }

  // Check token match
  if (tokenRow.token !== otp) {
    return NextResponse.json(
      { error: "Invalid or expired code. Please try again." },
      { status: 401 }
    );
  }

  // Valid — delete the used token
  await supabaseAdmin.from("otp_tokens").delete().eq("id", tokenRow.id);

  // Verify device exists
  const { data: device, error: deviceError } = await supabaseAdmin
    .from("devices")
    .select("id")
    .eq("device_id", device_id)
    .single();

  if (deviceError || !device) {
    return NextResponse.json({ error: "Device not found." }, { status: 404 });
  }

  // In device_verify mode, the user is already logged in — just confirm success
  if (isDeviceVerifyMode) {
    return NextResponse.json({ success: true });
  }

  // Default login mode: create session cookie and redirect
  const sessionValue = signSession(email);
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
