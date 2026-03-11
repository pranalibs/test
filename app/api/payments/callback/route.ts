import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { verifyChecksum } from "@/lib/phonepe";

const SALT_KEY = process.env.PHONEPE_SALT_KEY!;
const SALT_INDEX = process.env.PHONEPE_SALT_INDEX ?? "1";

export async function POST(req: Request) {
  try {
    const { response: base64Response } = await req.json();
    const xVerify = req.headers.get("X-VERIFY");

    if (!xVerify || !verifyChecksum(base64Response, xVerify, SALT_KEY, SALT_INDEX)) {
      return NextResponse.json({ error: "Invalid checksum" }, { status: 400 });
    }

    const decodedResponse = JSON.parse(Buffer.from(base64Response, "base64").toString());
    const { success, code, data } = decodedResponse;

    if (success && code === "PAYMENT_SUCCESS") {
      const { merchantTransactionId, transactionId, amount } = data;

      // Update payment status
      const { data: payment, error: pError } = await supabaseAdmin
        .from("payments")
        .update({
          status: "COMPLETED",
          phonepe_reference_id: transactionId,
          provider_response: decodedResponse,
          updated_at: new Date().toISOString(),
        })
        .eq("merchant_transaction_id", merchantTransactionId)
        .select()
        .single();

      if (payment && !pError) {
        // Update device subscription
        const { data: device } = await supabaseAdmin
          .from("devices")
          .select("subscription_end")
          .eq("id", payment.device_id)
          .single();

        if (device) {
          const currentEnd = new Date(device.subscription_end);
          const now = new Date();
          // If already expired, start from now, otherwise extend from current end
          const startDate = currentEnd > now ? currentEnd : now;
          const newEnd = new Date(startDate);
          newEnd.setFullYear(newEnd.getFullYear() + 1);

          await supabaseAdmin
            .from("devices")
            .update({
              subscription_end: newEnd.toISOString().split("T")[0],
              is_suspended: false,
            })
            .eq("id", payment.device_id);
        }
      }
    } else {
      // Handle failure
      const { merchantTransactionId } = data;
      await supabaseAdmin
        .from("payments")
        .update({
          status: "FAILED",
          provider_response: decodedResponse,
          updated_at: new Date().toISOString(),
        })
        .eq("merchant_transaction_id", merchantTransactionId);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Callback error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
