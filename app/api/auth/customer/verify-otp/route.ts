import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, otp, device_id } = body;

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

  // Fetch the device's dashboard URL
  const { data: device, error: deviceError } = await supabaseAdmin
    .from("devices")
    .select("dashboard_url, device_name")
    .eq("device_id", device_id)
    .single();

  if (deviceError || !device) {
    return NextResponse.json(
      { error: "Device not found." },
      { status: 404 }
    );
  }

  if (!device.dashboard_url) {
    return NextResponse.json(
      { error: "No dashboard URL configured for this device. Contact your administrator." },
      { status: 400 }
    );
  }

  return NextResponse.json({ redirect_url: device.dashboard_url });
}
