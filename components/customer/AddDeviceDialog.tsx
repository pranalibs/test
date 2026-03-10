"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { maskEmail } from "@/lib/utils";

interface Props {
  customerEmail: string;
}

export function AddDeviceDialog({ customerEmail }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"device" | "otp" | "success">("device");
  const [deviceName, setDeviceName] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function resetForm() {
    setStep("device");
    setDeviceName("");
    setDeviceId("");
    setOtp("");
    setError("");
  }

  async function handleDeviceSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/auth/customer/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device_name: deviceName,
        device_id: deviceId,
        mode: "device_verify",
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Device not found or not registered to your account.");
      return;
    }

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
        email: customerEmail,
        otp,
        device_id: deviceId,
        mode: "device_verify",
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Invalid or expired code. Please try again.");
      return;
    }

    setStep("success");
    // Refresh page data after short delay
    setTimeout(() => {
      setOpen(false);
      resetForm();
      router.refresh();
    }, 1500);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-sm text-soft hover:text-ink">
          <PlusCircle className="h-4 w-4 mr-1.5" />
          Add Device
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Verify a Device</DialogTitle>
        </DialogHeader>

        {step === "device" && (
          <form onSubmit={handleDeviceSubmit} className="space-y-4">
            <p className="text-sm text-soft">
              Enter your device details. We&apos;ll send a verification code to confirm ownership.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="add-device-name">Device Name</Label>
              <Input
                id="add-device-name"
                placeholder="Enter your device name"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                required
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-device-id">Device ID</Label>
              <Input
                id="add-device-id"
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
              {loading ? "Checking..." : "Send Verification Code"}
            </Button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div className="rounded-lg bg-brand/5 border border-brand/20 px-4 py-3 text-sm text-ink">
              We sent a 6-digit code to <strong>{maskEmail(customerEmail)}</strong>. Enter it below.
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="add-device-otp">Verification Code</Label>
              <Input
                id="add-device-otp"
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
              {loading ? "Verifying..." : "Verify Device"}
            </Button>

            <button
              type="button"
              className="w-full text-sm text-soft hover:text-ink transition-colors"
              onClick={() => { setStep("device"); setOtp(""); setError(""); }}
            >
              ← Back
            </button>
          </form>
        )}

        {step === "success" && (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-medium text-ink">Device verified successfully!</p>
            <p className="text-xs text-soft mt-1">Refreshing your dashboard...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
