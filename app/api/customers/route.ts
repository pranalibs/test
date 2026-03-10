import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("customers")
    .select("*, devices(*)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, email } = body;

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
  }

  // Insert customer into DB
  const { data: customer, error: dbError } = await supabaseAdmin
    .from("customers")
    .insert({ name, email })
    .select()
    .single();

  if (dbError) {
    const msg = dbError.code === "23505"
      ? "A customer with this email already exists"
      : dbError.message;
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // Invite customer to Supabase Auth (needed for OTP flow)
  const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    data: { customer_id: customer.id },
  });

  // Ignore "already registered" errors — user already exists in auth.users
  if (inviteError && !inviteError.message.includes("already")) {
    console.warn("Auth invite error (non-fatal):", inviteError.message);
  }

  return NextResponse.json(customer, { status: 201 });
}
