import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendOtpEmail } from "@/lib/email";

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
    .select("id, device_name, customer_id, subscription_end, customers(email, name)")
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
  const expiry = new Date((device as unknown as { subscription_end: string }).subscription_end);
  if (expiry < new Date()) {
    return NextResponse.json(
      { error: "Your subscription has expired. Please contact your administrator." },
      { status: 403 }
    );
  }

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

  // Delete any existing OTPs for this email then insert new one
  await supabaseAdmin.from("otp_tokens").delete().eq("email", customer.email);

  const { error: insertError } = await supabaseAdmin.from("otp_tokens").insert({
    email: customer.email,
    token: otp,
    expires_at: expiresAt,
  });

  if (insertError) {
    console.error("OTP insert error:", insertError.message);
    return NextResponse.json(
      { error: "Failed to generate verification code. Please try again." },
      { status: 500 }
    );
  }

  // Send OTP via Resend
  try {
    await sendOtpEmail({ to: customer.email, otp });
  } catch (err) {
    console.error("OTP email error:", err);
    return NextResponse.json(
      { error: "Failed to send verification code. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, email: customer.email });
}
