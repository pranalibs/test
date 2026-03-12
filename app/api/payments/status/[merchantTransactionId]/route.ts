import { NextResponse, NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ merchantTransactionId: string }> }
) {
  const { merchantTransactionId } = await params;

  const { data, error } = await supabaseAdmin
    .from("payments")
    .select("status, device_id")
    .eq("merchant_transaction_id", merchantTransactionId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
