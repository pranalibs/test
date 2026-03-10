"use client";

import { useState } from "react";
import { CalendarDays, PauseCircle, PlayCircle, XCircle } from "lucide-react";
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
import { daysUntil, formatDate } from "@/lib/utils";

interface Props {
  deviceId: string;
  deviceName: string;
  subscriptionEnd: string;
  isSuspended: boolean;
  onSuccess: () => void;
}

export function ManageSubscriptionDialog({
  deviceId,
  deviceName,
  subscriptionEnd,
  isSuspended,
  onSuccess,
}: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customDate, setCustomDate] = useState("");

  const days = daysUntil(subscriptionEnd);

  async function callPatch(body: Record<string, unknown>) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/devices/${deviceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return false;
      }
      return true;
    } catch {
      setError("Network error. Please try again.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleExtend(extendDays: number) {
    const ok = await callPatch({ action: "extend", days: extendDays });
    if (ok) {
      setOpen(false);
      onSuccess();
    }
  }

  async function handleSetDate() {
    if (!customDate) return;
    const ok = await callPatch({ action: "set_date", end_date: customDate });
    if (ok) {
      setOpen(false);
      onSuccess();
    }
  }

  async function handleCancel() {
    if (!confirm(`Cancel subscription for "${deviceName}"? This will immediately expire access.`)) return;
    const ok = await callPatch({ action: "cancel" });
    if (ok) {
      setOpen(false);
      onSuccess();
    }
  }

  async function handleToggleSuspend() {
    const action = isSuspended ? "reactivate" : "suspend";
    const label = isSuspended ? "reactivate" : "suspend";
    if (!confirm(`Are you sure you want to ${label} "${deviceName}"?`)) return;
    const ok = await callPatch({ action });
    if (ok) {
      setOpen(false);
      onSuccess();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" title="Manage subscription">
          <CalendarDays className="h-3.5 w-3.5" />
          Manage
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Subscription</DialogTitle>
          <p className="text-sm text-soft">{deviceName}</p>
        </DialogHeader>

        {/* Current status */}
        <div className="rounded-xl bg-subtle/40 border border-subtle px-4 py-3 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-soft">Current end date</span>
            <span className="font-medium text-ink">{formatDate(subscriptionEnd)}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-soft">Days remaining</span>
            <span className={`font-semibold ${days <= 0 ? "text-red-600" : days <= 7 ? "text-red-500" : days <= 30 ? "text-amber-600" : "text-green-600"}`}>
              {days <= 0 ? "Expired" : `${days} days`}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-soft">Status</span>
            <span className={`font-medium ${isSuspended ? "text-orange-600" : "text-green-600"}`}>
              {isSuspended ? "Suspended" : "Active"}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {/* Extend section */}
          <div>
            <p className="text-xs font-medium text-soft uppercase tracking-wide mb-2">Extend Subscription</p>
            <div className="grid grid-cols-4 gap-2">
              {[30, 90, 180, 365].map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant="ghost"
                  className="border border-subtle hover:border-brand hover:text-brand"
                  disabled={loading}
                  onClick={() => handleExtend(d)}
                >
                  +{d}d
                </Button>
              ))}
            </div>
          </div>

          {/* Custom date section */}
          <div>
            <p className="text-xs font-medium text-soft uppercase tracking-wide mb-2">Set Custom End Date</p>
            <div className="flex gap-2">
              <Input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="flex-1"
              />
              <Button
                size="sm"
                disabled={!customDate || loading}
                onClick={handleSetDate}
              >
                Set
              </Button>
            </div>
          </div>

          {/* Suspend / Reactivate */}
          <div>
            <p className="text-xs font-medium text-soft uppercase tracking-wide mb-2">Access Control</p>
            <Button
              size="sm"
              variant="ghost"
              className={isSuspended
                ? "w-full border border-green-200 text-green-700 hover:bg-green-50"
                : "w-full border border-orange-200 text-orange-700 hover:bg-orange-50"
              }
              disabled={loading}
              onClick={handleToggleSuspend}
            >
              {isSuspended ? (
                <><PlayCircle className="h-3.5 w-3.5 mr-1.5" /> Reactivate Device</>
              ) : (
                <><PauseCircle className="h-3.5 w-3.5 mr-1.5" /> Suspend Device</>
              )}
            </Button>
          </div>

          {/* Cancel */}
          <div className="pt-1 border-t border-subtle">
            <Button
              size="sm"
              variant="ghost"
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200"
              disabled={loading}
              onClick={handleCancel}
            >
              <XCircle className="h-3.5 w-3.5 mr-1.5" />
              Cancel Subscription (expire now)
            </Button>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
