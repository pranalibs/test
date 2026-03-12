"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader2, RefreshCw, Terminal } from "lucide-react";

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
                    return (
                      <div key={key} className="flex items-center gap-4 px-5 py-3">
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
                        >
                          {check.message}
                        </span>
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
                    return (
                      <div key={key} className="flex items-center gap-4 px-5 py-3">
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
                        >
                          {check.message}
                        </span>
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
