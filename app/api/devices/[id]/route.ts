import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { error } = await supabaseAdmin
    .from("devices")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { action, days, end_date } = body as {
    action: "extend" | "set_date" | "cancel" | "suspend" | "reactivate";
    days?: number;
    end_date?: string;
  };

  if (!action) {
    return NextResponse.json({ error: "action is required" }, { status: 400 });
  }

  // For subscription date actions, fetch current end date first
  if (action === "extend" || action === "set_date" || action === "cancel") {
    const { data: device, error: fetchError } = await supabaseAdmin
      .from("devices")
      .select("subscription_end")
      .eq("id", id)
      .single();

    if (fetchError || !device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    let newEndDate: string;

    if (action === "extend") {
      if (!days || days <= 0) {
        return NextResponse.json({ error: "days is required for extend" }, { status: 400 });
      }
      const current = new Date(device.subscription_end);
      current.setDate(current.getDate() + days);
      newEndDate = current.toISOString().split("T")[0];
    } else if (action === "set_date") {
      if (!end_date) {
        return NextResponse.json({ error: "end_date is required for set_date" }, { status: 400 });
      }
      newEndDate = end_date;
    } else {
      // cancel: expire immediately (yesterday so checks immediately see it as expired)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      newEndDate = yesterday.toISOString().split("T")[0];
    }

    const { error } = await supabaseAdmin
      .from("devices")
      .update({ subscription_end: newEndDate })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, subscription_end: newEndDate });
  }

  // Suspend / reactivate
  if (action === "suspend" || action === "reactivate") {
    const { error } = await supabaseAdmin
      .from("devices")
      .update({ is_suspended: action === "suspend" })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, is_suspended: action === "suspend" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
