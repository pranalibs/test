import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { device_name, device_id } = body;

  if (!device_name || !device_id) {
    return NextResponse.json(
      { error: "device_name and device_id are required" },
      { status: 400 }
    );
  }

  // Look up device and associated customer email
  const { data: device, error: deviceError } = await supabaseAdmin
    .from("devices")
    .select("id, device_name, customer_id, customers(email, name)")
    .eq("device_id", device_id)
    .eq("device_name", device_name)
    .single();

  if (deviceError || !device) {
    return NextResponse.json(
      { error: "No device found with that name and ID. Please check your details." },
      { status: 404 }
    );
  }

  const customer = device.customers as unknown as { email: string; name: string } | null;
  if (!customer?.email) {
    return NextResponse.json(
      { error: "Device is not associated with a customer account." },
      { status: 400 }
    );
  }

  // Check subscription validity
  const { data: deviceFull } = await supabaseAdmin
    .from("devices")
    .select("subscription_end")
    .eq("id", device.id)
    .single();

  if (deviceFull) {
    const expiry = new Date(deviceFull.subscription_end);
    if (expiry < new Date()) {
      return NextResponse.json(
        { error: "Your subscription has expired. Please contact your administrator." },
        { status: 403 }
      );
    }
  }

  // Send OTP via Supabase Auth
  const { error: otpError } = await supabaseAdmin.auth.signInWithOtp({
    email: customer.email,
    options: { shouldCreateUser: false },
  });

  if (otpError) {
    console.error("OTP send error:", otpError.message);
    return NextResponse.json(
      { error: "Failed to send verification code. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, email: customer.email });
}
