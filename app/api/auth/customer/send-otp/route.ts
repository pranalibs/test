import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/server";
import { verifySession } from "@/lib/session";
import { sendOtpEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { device_name, device_id, mode } = body;

  const isDeviceVerifyMode = mode === "device_verify";

  if (!device_name || !device_id) {
    return NextResponse.json(
      { error: "device_name and device_id are required" },
      { status: 400 }
    );
  }

  // In device_verify mode, the customer must already be logged in
  if (isDeviceVerifyMode) {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("cs")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "You must be logged in to verify a device." }, { status: 401 });
    }
    const sessionEmail = verifySession(sessionCookie);
    if (!sessionEmail) {
      return NextResponse.json({ error: "Invalid session. Please log in again." }, { status: 401 });
    }

    // Look up device and check it belongs to this customer
    const { data: device, error: deviceError } = await supabaseAdmin
      .from("devices")
      .select("id, device_name, customers(email)")
      .eq("device_id", device_id)
      .eq("device_name", device_name)
      .single();

    if (deviceError || !device) {
      return NextResponse.json(
        { error: "No device found with that name and ID." },
        { status: 404 }
      );
    }

    const customer = device.customers as unknown as { email: string } | null;
    if (!customer?.email || customer.email.toLowerCase() !== sessionEmail.toLowerCase()) {
      return NextResponse.json(
        { error: "This device is not registered to your account." },
        { status: 403 }
      );
    }

    // Send OTP to the session email
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await supabaseAdmin.from("otp_tokens").delete().eq("email", sessionEmail);
    const { error: insertError } = await supabaseAdmin.from("otp_tokens").insert({
      email: sessionEmail,
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

    try {
      await sendOtpEmail({ to: sessionEmail, otp });
    } catch (err) {
      console.error("OTP email error:", err);
      return NextResponse.json(
        { error: "Failed to send verification code. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, email: sessionEmail });
  }

  // Default login mode: look up device and send OTP (no subscription expiry block —
  // expired customers still need to log in to see the renewal prompt)
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

  // Generate 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

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
