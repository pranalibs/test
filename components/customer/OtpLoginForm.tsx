"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { maskEmail } from "@/lib/utils";

export function OtpLoginForm() {
  const [step, setStep] = useState<"device" | "otp">("device");
  const [deviceName, setDeviceName] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [otp, setOtp] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [emailForVerify, setEmailForVerify] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDeviceSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/customer/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_name: deviceName, device_id: deviceId }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Device not found. Please check your details.");
      return;
    }

    setMaskedEmail(maskEmail(data.email));
    setEmailForVerify(data.email);
    setStep("otp");
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/customer/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailForVerify,
        otp,
        device_id: deviceId,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Invalid or expired OTP. Please try again.");
      return;
    }

    // Redirect to device dashboard
    window.location.href = data.redirect_url;
  }

  if (step === "device") {
    return (
      <form onSubmit={handleDeviceSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="device-name">Device Name</Label>
          <Input
            id="device-name"
            placeholder="Enter your device name"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            required
            autoComplete="off"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="device-id">Device ID</Label>
          <Input
            id="device-id"
            placeholder="Enter your device ID"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            required
            autoComplete="off"
            className="font-mono"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Verifying..." : "Continue"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleOtpSubmit} className="space-y-4">
      <div className="rounded-lg bg-brand/5 border border-brand/20 px-4 py-3 text-sm text-ink">
        We sent a 6-digit code to <strong>{maskedEmail}</strong>. Enter it below to continue.
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="otp">One-Time Code</Label>
        <Input
          id="otp"
          placeholder="123456"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          required
          maxLength={6}
          className="font-mono text-center text-2xl tracking-widest h-14"
          autoComplete="one-time-code"
          inputMode="numeric"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading || otp.length !== 6} className="w-full">
        {loading ? "Verifying..." : "Access Dashboard"}
      </Button>

      <button
        type="button"
        className="w-full text-sm text-soft hover:text-ink transition-colors"
        onClick={() => {
          setStep("device");
          setOtp("");
          setError("");
        }}
      >
        ← Back
      </button>
    </form>
  );
}
