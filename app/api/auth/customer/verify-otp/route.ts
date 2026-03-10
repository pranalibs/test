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

  // Verify the OTP with Supabase Auth
  const { error: verifyError } = await supabaseAdmin.auth.verifyOtp({
    email,
    token: otp,
    type: "email",
  });

  if (verifyError) {
    return NextResponse.json(
      { error: "Invalid or expired code. Please try again." },
      { status: 401 }
    );
  }

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
