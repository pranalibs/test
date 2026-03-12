"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CreditCard, Calendar, CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Device {
  id: string;
  device_name: string;
  device_id: string;
  subscription_end: string;
  price?: number;
}

export function BillingSection({ initialDevices }: { initialDevices: Device[] }) {
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [pricing, setPricing] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const tid = searchParams.get("tid");
    if (tid) {
      verifyPayment(tid);
    }
  }, [searchParams]);

  async function verifyPayment(tid: string) {
    setVerifying(true);
    try {
      const res = await fetch(`/api/payments/status/${tid}`);
      const data = await res.json();
      if (data.status === "COMPLETED") {
        toast.success("Payment successful! Your subscription has been updated.");
        router.replace("/dashboard?tab=billing");
        router.refresh();
      } else if (data.status === "FAILED") {
        toast.error("Payment failed. Please try again.");
        router.replace("/dashboard?tab=billing");
      }
    } catch (err) {
      console.error("Verification error", err);
    } finally {
      setVerifying(false);
    }
  }

  useEffect(() => {
    async function fetchPricing() {
      try {
        const res = await fetch("/api/admin/pricing"); // Reuse this to get prices
        if (!res.ok) {
          console.error("Pricing API returned status", res.status);
          return;
        }
        const data = await res.json();
        if (!Array.isArray(data)) {
          console.error("Unexpected pricing response", data);
          return;
        }
        const priceMap: Record<string, number> = {};
        data.forEach((item: any) => {
          priceMap[item.device_name] = item.price;
        });
        setPricing(priceMap);
      } catch (err) {
        console.error("Failed to fetch pricing", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPricing();
  }, []);

  async function handleRenew(device: Device) {
    const price = pricing[device.device_name] || 0;
    if (price === 0) {
      alert("Pricing not set for this device. Please contact administrator.");
      return;
    }

    try {
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId: device.id,
          amount: price,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Failed to initiate payment: " + data.error);
      }
    } catch (err) {
      console.error("Payment initiation failed", err);
      alert("Something went wrong. Please try again.");
    }
  }

  function daysUntil(dateStr: string): number {
    const end = new Date(dateStr);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="space-y-6">
      {verifying && (
        <div className="bg-brand/10 border border-brand/20 rounded-xl p-4 flex items-center justify-center gap-3 text-brand animate-pulse">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="font-medium text-sm">Verifying your payment...</span>
        </div>
      )}

      <div className="bg-panel border border-subtle rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-brand" />
          Subscription Management
        </h2>

        <div className="space-y-4">
          {devices.map((device) => {
            const days = daysUntil(device.subscription_end);
            const expired = days <= 0;
            const price = pricing[device.device_name];

            return (
              <div key={device.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-subtle rounded-xl bg-page/50 gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-ink">{device.device_name}</h3>
                    {expired ? (
                      <Badge variant="danger">Expired</Badge>
                    ) : days <= 30 ? (
                      <Badge variant="warning">Expires Soon</Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}
                  </div>
                  <div className="text-xs text-soft flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Expires: {new Date(device.subscription_end).toLocaleDateString()}
                    </span>
                    <span className="font-mono">{device.device_id}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 justify-between sm:justify-end">
                  <div className="text-right">
                    <div className="text-sm font-semibold text-ink">
                      {price ? `₹${price}` : "Price not set"}
                    </div>
                    <div className="text-[10px] text-soft uppercase tracking-wider">Yearly</div>
                  </div>
                  <Button
                    onClick={() => handleRenew(device)}
                    disabled={!price}
                    size="sm"
                    className={expired || days <= 30 ? "bg-brand hover:bg-brand-dark" : "bg-subtle text-soft hover:bg-subtle/80"}
                  >
                    {expired ? "Renew Now" : "Extend"}
                  </Button>
                </div>
              </div>
            );
          })}
          {devices.length === 0 && (
            <div className="text-center py-8 text-soft text-sm">
              No devices found on your account.
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-panel border border-subtle rounded-2xl p-4 flex gap-3">
          <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-ink">Secure Payments</div>
            <div className="text-xs text-soft">Processed securely via PhonePe Business.</div>
          </div>
        </div>
        <div className="bg-panel border border-subtle rounded-2xl p-4 flex gap-3">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-ink">Instant Activation</div>
            <div className="text-xs text-soft">Subscription updates immediately after payment.</div>
          </div>
        </div>
        <div className="bg-panel border border-subtle rounded-2xl p-4 flex gap-3">
          <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
            <AlertCircle className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-ink">Yearly Renewals</div>
            <div className="text-xs text-soft">Prices are fixed for a full year of service.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
