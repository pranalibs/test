"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface PricingItem {
  id: string;
  device_name: string;
  price: number;
}

interface Props {
  customerId: string;
  customerName: string;
  onSuccess: () => void;
}

export function AddDeviceDialog({ customerId, customerName, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [location, setLocation] = useState("");
  const [dashboardUrl, setDashboardUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [pricingItems, setPricingItems] = useState<PricingItem[]>([]);
  const [loadingPricing, setLoadingPricing] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingPricing(true);
    fetch("/api/admin/pricing")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPricingItems(data);
      })
      .catch(() => {})
      .finally(() => setLoadingPricing(false));
  }, [open]);

  const selectedPricing = pricingItems.find((p) => p.device_name === deviceName);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: customerId,
        device_name: deviceName,
        device_id: deviceId,
        device_location: location,
        dashboard_url: dashboardUrl,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Failed to add device");
      return;
    }

    setOpen(false);
    setDeviceName("");
    setDeviceId("");
    setLocation("");
    setDashboardUrl("");
    onSuccess();
  }

  function handleOpenChange(val: boolean) {
    setOpen(val);
    if (!val) {
      setDeviceName("");
      setDeviceId("");
      setLocation("");
      setDashboardUrl("");
      setError("");
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" />
        Add Device
      </Button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Device</DialogTitle>
            <DialogDescription>
              Add a device for <strong>{customerName}</strong>. Subscription starts today for 1 year.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Device Type (from pricing table) */}
            <div className="space-y-1.5">
              <Label htmlFor="device-name">Device Type</Label>
              {loadingPricing ? (
                <div className={cn(
                  "flex items-center h-9 px-3 rounded-lg border border-subtle bg-page text-sm text-soft"
                )}>
                  Loading device types...
                </div>
              ) : pricingItems.length === 0 ? (
                <div className="rounded-lg border border-subtle bg-page/60 px-3 py-2.5 text-sm text-soft">
                  No device types configured.{" "}
                  <span className="text-brand font-medium">Add device pricing first</span> from the Device Pricing tab.
                </div>
              ) : (
                <select
                  id="device-name"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  required
                  className={cn(
                    "flex h-9 w-full rounded-lg border border-subtle bg-page px-3 py-1 text-sm text-ink",
                    "focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand",
                    "disabled:opacity-50"
                  )}
                >
                  <option value="" disabled>Select device type...</option>
                  {pricingItems.map((item) => (
                    <option key={item.id} value={item.device_name}>
                      {item.device_name} — ₹{item.price}/yr
                    </option>
                  ))}
                </select>
              )}
              {selectedPricing && (
                <p className="text-xs text-soft">
                  Yearly price: <span className="font-medium text-ink">₹{selectedPricing.price}</span>
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="device-id">Device ID</Label>
              <Input
                id="device-id"
                placeholder="e.g. DEV-001"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location">Device Location</Label>
              <Input
                id="location"
                placeholder="e.g. New York, USA"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dashboard-url">Dashboard URL</Label>
              <Input
                id="dashboard-url"
                type="url"
                placeholder="https://dashboard.example.com/device/..."
                value={dashboardUrl}
                onChange={(e) => setDashboardUrl(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || pricingItems.length === 0 || loadingPricing}
              >
                {loading ? "Adding..." : "Add Device"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
