"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, RefreshCw, Terminal, AlertTriangle, Copy, Check } from "lucide-react";

interface CheckResult {
  ok: boolean;
  message: string;
}

interface DiagnosticsResponse {
  status: "ok" | "issues_found";
  checks: Record<string, CheckResult>;
}

const CHECK_LABELS: Record<string, string> = {
  "env.NEXT_PUBLIC_SUPABASE_URL": "Supabase URL",
  "env.SUPABASE_SERVICE_ROLE_KEY": "Supabase Service Role Key",
  "env.PHONEPE_MERCHANT_ID": "PhonePe Merchant ID",
  "env.PHONEPE_SALT_KEY": "PhonePe Salt Key",
  "env.NEXT_PUBLIC_APP_URL": "App URL",
  "env.PHONEPE_HOST": "PhonePe Host",
  "supabase.connection": "Supabase Connection",
  "supabase.device_pricing_table": "device_pricing Table",
  "phonepe.uat_connection": "PhonePe UAT API",
  "phonepe.configured_host": "PhonePe Configured Host",
};

// Hints shown below a failing check — keyed by check key, matched by message substring
const CHECK_HINTS: Record<string, Array<{ match: string; hint: string; sql?: string }>> = {
  "supabase.connection": [
    {
      match: "device_pricing",
      hint: "The device_pricing table is missing. Run the SQL below in your Supabase project → SQL Editor.",
      sql: `CREATE TABLE device_pricing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_name TEXT UNIQUE NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE device_pricing DISABLE ROW LEVEL SECURITY;`,
    },
  ],
  "supabase.device_pricing_table": [
    {
      match: "device_pricing",
      hint: "The device_pricing table is missing. Run the SQL below in your Supabase project → SQL Editor.",
      sql: `CREATE TABLE device_pricing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_name TEXT UNIQUE NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE device_pricing DISABLE ROW LEVEL SECURITY;`,
    },
  ],
  "phonepe.uat_connection": [
    {
      match: "fetch failed",
      hint: "The server cannot reach the PhonePe API. This is usually a network/firewall restriction on your hosting platform (e.g. Vercel, Railway). Ensure outbound HTTPS to api.preprod.phonepe.com is allowed. Your actual payment flow will also be affected.",
    },
    {
      match: "Network error",
      hint: "The server cannot reach the PhonePe API. This is usually a network/firewall restriction on your hosting platform (e.g. Vercel, Railway). Ensure outbound HTTPS to api.preprod.phonepe.com is allowed. Your actual payment flow will also be affected.",
    },
  ],
  "phonepe.configured_host": [
    {
      match: "fetch failed",
      hint: "The server cannot reach your configured PhonePe host. Check that PHONEPE_HOST is correct and that outbound HTTPS is not blocked.",
    },
    {
      match: "INVALID_TRANSACTION",
      hint: "PhonePe API is reachable but rejected the test request. This is expected for diagnostic payloads — it means your credentials and network are working correctly.",
    },
    {
      match: "UNAUTHORIZED",
      hint: "PhonePe rejected the request as unauthorized. Check that PHONEPE_MERCHANT_ID, PHONEPE_SALT_KEY, and PHONEPE_SALT_INDEX are correct.",
    },
  ],
};

const DEVICE_PRICING_SQL = `CREATE TABLE device_pricing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_name TEXT UNIQUE NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE device_pricing DISABLE ROW LEVEL SECURITY;`;

const CHECK_GROUPS = [
  {
    label: "Environment Variables",
    keys: [
      "env.NEXT_PUBLIC_SUPABASE_URL",
      "env.SUPABASE_SERVICE_ROLE_KEY",
      "env.PHONEPE_MERCHANT_ID",
      "env.PHONEPE_SALT_KEY",
      "env.NEXT_PUBLIC_APP_URL",
      "env.PHONEPE_HOST",
    ],
  },
  {
    label: "Supabase Database",
    keys: ["supabase.connection", "supabase.device_pricing_table"],
  },
  {
    label: "PhonePe API",
    keys: ["phonepe.uat_connection", "phonepe.configured_host"],
  },
];

function getHint(key: string, message: string): { hint: string; sql?: string } | null {
  const hints = CHECK_HINTS[key];
  if (!hints) return null;
  const matched = hints.find((h) => message.toLowerCase().includes(h.match.toLowerCase()));
  return matched ?? null;
}

function SqlBlock({ sql }: { sql: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-2 rounded-lg bg-[#0D0D0D] border border-subtle overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-subtle">
        <span className="text-[#8B8B8B] text-xs">SQL — run in Supabase SQL Editor</span>
        <button
          onClick={copy}
          className="flex items-center gap-1 text-xs text-[#8B8B8B] hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="text-xs text-[#A8FF78] px-3 py-2 overflow-x-auto leading-relaxed">{sql}</pre>
    </div>
  );
}

export function DevTab() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ranAt, setRanAt] = useState<Date | null>(null);

  async function runDiagnostics() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/diagnostics");
      const data = await res.json();
      setResult(data);
      setRanAt(new Date());
    } catch (err) {
      setError(`Failed to reach diagnostics endpoint: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  const checks = result?.checks ?? {};
  const totalChecks = Object.keys(checks).length;
  const passedChecks = Object.values(checks).filter((c) => c.ok).length;

  const missingTable =
    result &&
    (checks["supabase.connection"]?.message?.includes("device_pricing") ||
      checks["supabase.device_pricing_table"]?.message?.includes("device_pricing"));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-brand" />
            <h2 className="text-white font-semibold text-lg">API Diagnostics</h2>
          </div>
          <p className="text-[#8B8B8B] text-sm">
            Test environment variables, Supabase connectivity, and PhonePe API reachability.
          </p>
        </div>
        <Button
          onClick={runDiagnostics}
          disabled={loading}
          className="flex items-center gap-2 bg-brand hover:bg-brand/90 text-white"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          {loading ? "Running..." : result ? "Re-run" : "Run Diagnostics"}
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Summary bar */}
      {result && (
        <div
          className={`flex items-center gap-3 rounded-xl px-5 py-3 border ${
            result.status === "ok"
              ? "bg-green-500/10 border-green-500/30"
              : "bg-yellow-500/10 border-yellow-500/30"
          }`}
        >
          {result.status === "ok" ? (
            <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-yellow-400 shrink-0" />
          )}
          <span
            className={`font-medium text-sm ${
              result.status === "ok" ? "text-green-400" : "text-yellow-400"
            }`}
          >
            {result.status === "ok"
              ? `All ${totalChecks} checks passed`
              : `${passedChecks} / ${totalChecks} checks passed — action needed`}
          </span>
          {ranAt && (
            <span className="ml-auto text-[#8B8B8B] text-xs">
              Last run: {ranAt.toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      {/* Quick-fix banner: missing device_pricing table */}
      {missingTable && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
            <span className="text-orange-400 text-sm font-medium">
              Fix: Create the device_pricing table in Supabase
            </span>
          </div>
          <p className="text-[#8B8B8B] text-xs">
            Go to your Supabase project → SQL Editor → New Query, paste and run the SQL below. Then re-run diagnostics.
          </p>
          <SqlBlock sql={DEVICE_PRICING_SQL} />
        </div>
      )}

      {/* Check groups */}
      {result && (
        <div className="space-y-5">
          {CHECK_GROUPS.map((group) => {
            const groupChecks = group.keys.filter((k) => k in checks);
            if (groupChecks.length === 0) return null;
            return (
              <div key={group.label} className="bg-panel border border-subtle rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-subtle bg-dark/40">
                  <span className="text-[#8B8B8B] text-xs font-semibold uppercase tracking-wider">
                    {group.label}
                  </span>
                </div>
                <div className="divide-y divide-subtle">
                  {groupChecks.map((key) => {
                    const check = checks[key];
                    const label = CHECK_LABELS[key] ?? key;
                    const hint = !check.ok ? getHint(key, check.message) : null;
                    return (
                      <div key={key} className="px-5 py-3 space-y-2">
                        <div className="flex items-center gap-4">
                          {check.ok ? (
                            <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                          )}
                          <span className="text-white text-sm w-48 shrink-0">{label}</span>
                          <span
                            className={`text-sm font-mono truncate ${
                              check.ok ? "text-[#8B8B8B]" : "text-red-400"
                            }`}
                            title={check.message}
                          >
                            {check.message}
                          </span>
                        </div>
                        {hint && (
                          <div className="ml-8 space-y-1">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0 mt-0.5" />
                              <p className="text-yellow-500/90 text-xs leading-relaxed">{hint.hint}</p>
                            </div>
                            {hint.sql && <SqlBlock sql={hint.sql} />}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Any extra checks not in groups */}
          {(() => {
            const groupedKeys = CHECK_GROUPS.flatMap((g) => g.keys);
            const extras = Object.keys(checks).filter((k) => !groupedKeys.includes(k));
            if (extras.length === 0) return null;
            return (
              <div className="bg-panel border border-subtle rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-subtle bg-dark/40">
                  <span className="text-[#8B8B8B] text-xs font-semibold uppercase tracking-wider">
                    Other
                  </span>
                </div>
                <div className="divide-y divide-subtle">
                  {extras.map((key) => {
                    const check = checks[key];
                    const hint = !check.ok ? getHint(key, check.message) : null;
                    return (
                      <div key={key} className="px-5 py-3 space-y-2">
                        <div className="flex items-center gap-4">
                          {check.ok ? (
                            <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                          )}
                          <span className="text-white text-sm w-48 shrink-0">{key}</span>
                          <span
                            className={`text-sm font-mono truncate ${
                              check.ok ? "text-[#8B8B8B]" : "text-red-400"
                            }`}
                            title={check.message}
                          >
                            {check.message}
                          </span>
                        </div>
                        {hint && (
                          <div className="ml-8">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 shrink-0 mt-0.5" />
                              <p className="text-yellow-500/90 text-xs leading-relaxed">{hint.hint}</p>
                            </div>
                            {hint.sql && <SqlBlock sql={hint.sql} />}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Empty state */}
      {!result && !loading && !error && (
        <div className="bg-panel border border-subtle rounded-xl py-16 flex flex-col items-center gap-3 text-center">
          <Terminal className="w-10 h-10 text-[#3A3A3A]" />
          <p className="text-[#8B8B8B] text-sm">
            Click <span className="text-white font-medium">Run Diagnostics</span> to check all API connections.
          </p>
        </div>
      )}
    </div>
  );
}
