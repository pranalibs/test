"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { maskEmail } from "@/lib/utils";

interface Props {
  onSwitchToLogin: () => void;
}

export function SetupAccountForm({ onSwitchToLogin }: Props) {
  const router = useRouter();

  const [step, setStep] = useState<"details" | "password">("details");

  // Step 1 fields
  const [email, setEmail] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [deviceId, setDeviceId] = useState("");

  // Step 2 fields
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1 → send OTP
  async function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/customer/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        device_name: deviceName,
        device_id: deviceId,
        mode: "first_setup",
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      if (data.already_setup) {
        setError("Account already set up.");
        onSwitchToLogin();
        return;
      }
      setError(data.error || "Something went wrong. Please check your details.");
      return;
    }

    setStep("password");
  }

  // Step 2 → verify OTP + set password
  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/customer/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, device_id: deviceId, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Setup failed. Please try again.");
      return;
    }

    router.push(data.redirect);
  }

  if (step === "details") {
    return (
      <form onSubmit={handleDetailsSubmit} className="space-y-4">
        <p className="text-sm text-soft">
          Enter your registered email and the device details assigned by your administrator.
          We&apos;ll send a verification code to confirm your identity.
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="setup-email">Email Address</Label>
          <Input
            id="setup-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="setup-device-name">Device Name</Label>
          <Input
            id="setup-device-name"
            placeholder="As provided by your administrator"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            required
            autoComplete="off"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="setup-device-id">Device ID</Label>
          <Input
            id="setup-device-id"
            placeholder="As provided by your administrator"
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
          {loading ? "Sending code..." : "Send Verification Code"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handlePasswordSubmit} className="space-y-4">
      <div className="rounded-lg bg-brand/5 border border-brand/20 px-4 py-3 text-sm text-ink">
        We sent a 6-digit code to <strong>{maskEmail(email)}</strong>. Enter it below along with your new password.
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="setup-otp">Verification Code</Label>
        <Input
          id="setup-otp"
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

      <div className="space-y-1.5">
        <Label htmlFor="setup-password">New Password</Label>
        <Input
          id="setup-password"
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="setup-confirm">Confirm Password</Label>
        <Input
          id="setup-confirm"
          type="password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading || otp.length !== 6} className="w-full">
        {loading ? "Setting up..." : "Complete Setup"}
      </Button>

      <button
        type="button"
        className="w-full text-sm text-soft hover:text-ink transition-colors"
        onClick={() => { setStep("details"); setOtp(""); setError(""); }}
      >
        ← Back
      </button>
    </form>
  );
}
