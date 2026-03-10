import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase/server";
import { signSession } from "@/lib/session";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { access_token } = body;

  if (!access_token) {
    return NextResponse.json({ error: "access_token is required" }, { status: 400 });
  }

  // Verify the Supabase Auth token using the anon key client
  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(access_token);

  if (authError || !user?.email) {
    return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
  }

  // Check the user's email exists in our customers table
  const { data: customer, error: customerError } = await supabaseAdmin
    .from("customers")
    .select("id, email")
    .eq("email", user.email)
    .single();

  if (customerError || !customer) {
    return NextResponse.json(
      { error: "This email is not registered as a customer. Please contact your administrator." },
      { status: 403 }
    );
  }

  // Create the custom session cookie
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
