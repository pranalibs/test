import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendSubscriptionExpiryEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find devices expiring in 30 or 7 days
  const today = new Date();
  const in30Days = new Date(today);
  in30Days.setDate(today.getDate() + 30);
  const in7Days = new Date(today);
  in7Days.setDate(today.getDate() + 7);

  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const { data: devices, error } = await supabaseAdmin
    .from("devices")
    .select(`
      id, device_name, device_id, subscription_end,
      customers (email, name)
    `)
    .in("subscription_end", [fmt(in30Days), fmt(in7Days)]);

  if (error) {
    console.error("Cron query error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!devices || devices.length === 0) {
    return NextResponse.json({ message: "No expiring subscriptions today." });
  }

  const results: string[] = [];

  for (const device of devices) {
    const customer = device.customers as unknown as { email: string; name: string } | null;
    if (!customer) continue;

    const expiryDate = new Date(device.subscription_end);
    const daysRemaining = Math.ceil(
      (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    try {
      await sendSubscriptionExpiryEmail({
        customerEmail: customer.email,
        customerName: customer.name,
        deviceName: device.device_name,
        deviceId: device.device_id,
        subscriptionEnd: device.subscription_end,
        daysRemaining,
      });
      results.push(`Notified ${customer.email} for device ${device.device_id} (${daysRemaining}d)`);
    } catch (emailError) {
      console.error(`Failed to send email for device ${device.device_id}:`, emailError);
      results.push(`FAILED: ${device.device_id}`);
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
