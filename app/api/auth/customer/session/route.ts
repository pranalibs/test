import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { supabaseAdmin } from "@/lib/supabase/server";
import { signSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  // Look up customer by email
  const { data: customer, error } = await supabaseAdmin
    .from("customers")
    .select("id, email, password_hash")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (error || !customer) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  // Account not set up yet (no password)
  if (!customer.password_hash) {
    return NextResponse.json(
      {
        error: "Account not set up yet. Please complete first-time setup.",
        needs_setup: true,
      },
      { status: 403 }
    );
  }

  // Verify password
  const valid = await bcrypt.compare(password, customer.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  // Create signed session cookie
  const sessionValue = signSession(customer.email);
  const res = NextResponse.json({ redirect: "/dashboard" });
  res.cookies.set("cs", sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });

  return res;
}
