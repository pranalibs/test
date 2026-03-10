import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { customer_id, device_name, device_id, device_location, dashboard_url } = body;

  if (!customer_id || !device_name || !device_id) {
    return NextResponse.json(
      { error: "customer_id, device_name, and device_id are required" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("devices")
    .insert({
      customer_id,
      device_name,
      device_id,
      device_location: device_location || null,
      dashboard_url: dashboard_url || null,
    })
    .select()
    .single();

  if (error) {
    const msg = error.code === "23505"
      ? "A device with this ID already exists"
      : error.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  return NextResponse.json(data, { status: 201 });
}
