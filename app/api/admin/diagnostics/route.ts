import { NextResponse } from "next/server";
import { generateChecksum } from "@/lib/phonepe";
import crypto from "crypto";

// PhonePe UAT test credentials (public — from PhonePe official docs)
const UAT_MERCHANT_ID = "PGTESTPAYUAT86";
const UAT_SALT_KEY = "96434309-7796-489d-8924-ab56988a6076";
const UAT_SALT_INDEX = "1";
const UAT_HOST = "https://api.preprod.phonepe.com/apis/hermes";

export async function GET() {
  const results: Record<string, { ok: boolean; message: string }> = {};

  // --- 1. Check required environment variables ---
  const requiredVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "PHONEPE_MERCHANT_ID",
    "PHONEPE_SALT_KEY",
    "NEXT_PUBLIC_APP_URL",
  ];

  for (const varName of requiredVars) {
    const val = process.env[varName];
    results[`env.${varName}`] = val
      ? { ok: true, message: "set" }
      : { ok: false, message: "MISSING — not set in environment" };
  }

  const phonepeHost = process.env.PHONEPE_HOST ?? "https://api.phonepe.com/apis/hermes";
  results["env.PHONEPE_HOST"] = { ok: true, message: phonepeHost };

  // --- 2. Test Supabase connectivity ---
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      results["supabase.connection"] = { ok: false, message: "Skipped — missing Supabase env vars" };
    } else {
      const res = await fetch(`${supabaseUrl}/rest/v1/device_pricing?select=id&limit=1`, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      });
      if (res.ok) {
        results["supabase.connection"] = { ok: true, message: `Connected — HTTP ${res.status}` };
        results["supabase.device_pricing_table"] = { ok: true, message: "Table accessible" };
      } else {
        const body = await res.text();
        results["supabase.connection"] = {
          ok: false,
          message: `HTTP ${res.status} — ${body.slice(0, 200)}`,
        };
      }
    }
  } catch (err) {
    results["supabase.connection"] = { ok: false, message: `Fetch error: ${String(err)}` };
  }

  // --- 3. Test PhonePe UAT API connectivity ---
  try {
    const testPayload = {
      merchantId: UAT_MERCHANT_ID,
      merchantTransactionId: `DIAG${Date.now()}`,
      merchantUserId: "DIAG_USER",
      amount: 100,
      redirectUrl: "https://example.com/redirect",
      redirectMode: "REDIRECT",
      callbackUrl: "https://example.com/callback",
      paymentInstrument: { type: "PAY_PAGE" },
    };

    const checksum = generateChecksum(
      JSON.stringify(testPayload),
      "/pg/v1/pay",
      UAT_SALT_KEY,
      UAT_SALT_INDEX
    );

    const base64Payload = Buffer.from(JSON.stringify(testPayload)).toString("base64");

    const res = await fetch(`${UAT_HOST}/pg/v1/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": checksum,
      },
      body: JSON.stringify({ request: base64Payload }),
    });

    const body = await res.json();

    if (res.ok && body.success) {
      results["phonepe.uat_connection"] = {
        ok: true,
        message: `PhonePe UAT reachable — code: ${body.code}`,
      };
    } else {
      results["phonepe.uat_connection"] = {
        ok: false,
        message: `HTTP ${res.status} — code: ${body.code ?? "?"}, message: ${body.message ?? JSON.stringify(body).slice(0, 200)}`,
      };
    }
  } catch (err) {
    results["phonepe.uat_connection"] = {
      ok: false,
      message: `Network error reaching PhonePe UAT: ${String(err)}`,
    };
  }

  // --- 4. Test configured PhonePe host (if set and different from UAT) ---
  const configuredHost = process.env.PHONEPE_HOST;
  if (configuredHost && configuredHost !== UAT_HOST) {
    const merchantId = process.env.PHONEPE_MERCHANT_ID;
    const saltKey = process.env.PHONEPE_SALT_KEY;
    const saltIndex = process.env.PHONEPE_SALT_INDEX ?? "1";

    if (!merchantId || !saltKey) {
      results["phonepe.configured_host"] = {
        ok: false,
        message: "Skipped — PHONEPE_MERCHANT_ID or PHONEPE_SALT_KEY not set",
      };
    } else {
      try {
        const testPayload = {
          merchantId,
          merchantTransactionId: `DIAG${Date.now()}`,
          merchantUserId: "DIAG_USER",
          amount: 100,
          redirectUrl: "https://example.com/redirect",
          redirectMode: "REDIRECT",
          callbackUrl: "https://example.com/callback",
          paymentInstrument: { type: "PAY_PAGE" },
        };

        const checksum = generateChecksum(
          JSON.stringify(testPayload),
          "/pg/v1/pay",
          saltKey,
          saltIndex
        );
        const base64Payload = Buffer.from(JSON.stringify(testPayload)).toString("base64");

        const res = await fetch(`${configuredHost}/pg/v1/pay`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-VERIFY": checksum,
          },
          body: JSON.stringify({ request: base64Payload }),
        });

        const body = await res.json();
        results["phonepe.configured_host"] = {
          ok: res.ok,
          message: `HTTP ${res.status} — code: ${body.code ?? "?"}, message: ${body.message ?? JSON.stringify(body).slice(0, 200)}`,
        };
      } catch (err) {
        results["phonepe.configured_host"] = {
          ok: false,
          message: `Network error: ${String(err)}`,
        };
      }
    }
  }

  const allOk = Object.values(results).every((r) => r.ok);

  return NextResponse.json(
    { status: allOk ? "ok" : "issues_found", checks: results },
    { status: allOk ? 200 : 207 }
  );
}
