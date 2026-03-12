import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { generateChecksum, httpsPost } from "@/lib/phonepe";

const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID!;
const SALT_KEY = process.env.PHONEPE_SALT_KEY!;
const SALT_INDEX = process.env.PHONEPE_SALT_INDEX ?? "1";
const PHONEPE_HOST = process.env.PHONEPE_HOST ?? "https://api.phonepe.com/apis/hermes"; // Production host

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("cs")?.value;

  if (!sessionCookie) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const email = verifySession(sessionCookie);
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { deviceId, amount } = await req.json();

  // Get customer and device details
  const { data: customer } = await supabaseAdmin
    .from("customers")
    .select("id")
    .eq("email", email)
    .single();

  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const merchantTransactionId = `MT${Date.now()}${Math.floor(Math.random() * 1000)}`;

  // Create pending payment record
  await supabaseAdmin.from("payments").insert({
    merchant_transaction_id: merchantTransactionId,
    customer_id: customer.id,
    device_id: deviceId,
    amount: amount,
    status: "PENDING",
  });

  const payload = {
    merchantId: MERCHANT_ID,
    merchantTransactionId,
    merchantUserId: customer.id.replace(/-/g, ""),
    amount: amount * 100, // PhonePe expects amount in paise
    redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?tab=billing&tid=${merchantTransactionId}`,
    redirectMode: "REDIRECT",
    callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/callback`,
    paymentInstrument: {
      type: "PAY_PAGE",
    },
  };

  const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
  const checksum = generateChecksum(JSON.stringify(payload), "/pg/v1/pay", SALT_KEY, SALT_INDEX);

  try {
    const response = await httpsPost(
      `${PHONEPE_HOST}/pg/v1/pay`,
      { "Content-Type": "application/json", "X-VERIFY": checksum },
      JSON.stringify({ request: base64Payload })
    );

    const result = JSON.parse(response.body);

    if (result.success && result.data?.instrumentResponse?.redirectInfo?.url) {
      return NextResponse.json({ url: result.data.instrumentResponse.redirectInfo.url });
    } else {
      console.error("PhonePe error:", result);
      return NextResponse.json({ error: result.message || "Failed to initiate payment" }, { status: 500 });
    }
  } catch (err: unknown) {
    const cause = err instanceof Error ? err.cause : undefined;
    console.error("Payment initiation error:", err, cause ? `cause: ${JSON.stringify(cause)}` : "");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
