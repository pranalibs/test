"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  ExternalLink,
  Monitor,
  MapPin,
  Calendar,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddDeviceDialog } from "@/components/admin/AddDeviceDialog";
import { ManageSubscriptionDialog } from "@/components/admin/ManageSubscriptionDialog";
import { daysUntil, formatDate } from "@/lib/utils";

interface Device {
  id: string;
  device_name: string;
  device_id: string;
  device_location: string | null;
  dashboard_url: string | null;
  subscription_start: string;
  subscription_end: string;
  is_suspended: boolean;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  created_at: string;
  devices: Device[];
}

interface Props {
  customers: Customer[];
}

function SubscriptionBadge({
  subscriptionEnd,
  isSuspended,
}: {
  subscriptionEnd: string;
  isSuspended: boolean;
}) {
  if (isSuspended)
    return (
      <Badge variant="secondary" className="bg-orange-100 text-orange-700">
        Suspended
      </Badge>
    );
  const days = daysUntil(subscriptionEnd);
  if (days < 0) return <Badge variant="danger">Expired</Badge>;
  if (days <= 7) return <Badge variant="danger">{days}d left</Badge>;
  if (days <= 30) return <Badge variant="warning">{days}d left</Badge>;
  return <Badge variant="success">{days}d left</Badge>;
}

function DeviceCard({
  device,
  onDeleted,
  onRefresh,
}: {
  device: Device;
  onDeleted: () => void;
  onRefresh: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete device "${device.device_name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await fetch(`/api/devices/${device.id}`, { method: "DELETE" });
    setDeleting(false);
    onDeleted();
  }

  return (
    <div className="border border-subtle rounded-lg bg-panel flex flex-col gap-3 p-4">
      {/* Header: name, ID, status */}
      <div className="flex items-start gap-2">
        <Monitor className="h-4 w-4 text-soft shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink truncate">{device.device_name}</p>
          <p className="text-xs text-soft font-mono">{device.device_id}</p>
        </div>
        <SubscriptionBadge
          subscriptionEnd={device.subscription_end}
          isSuspended={device.is_suspended}
        />
      </div>

      {/* Details: location + subscription period */}
      <div className="flex flex-wrap gap-3 text-xs text-soft">
        {device.device_location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {device.device_location}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          {formatDate(device.subscription_start)} → {formatDate(device.subscription_end)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 justify-end border-t border-subtle pt-2 -mb-1">
        {device.dashboard_url ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => window.open(device.dashboard_url!, "_blank")}
            title="Open Dashboard"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Dashboard
          </Button>
        ) : (
          <Button size="sm" variant="ghost" disabled title="No dashboard URL set">
            <ExternalLink className="h-3.5 w-3.5" />
            Dashboard
          </Button>
        )}
        <ManageSubscriptionDialog
          deviceId={device.id}
          deviceName={device.device_name}
          subscriptionEnd={device.subscription_end}
          isSuspended={device.is_suspended}
          onSuccess={onRefresh}
        />
        <Button
          size="sm"
          variant="ghost"
          className="text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={handleDelete}
          disabled={deleting}
          title="Delete device"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {deleting ? "..." : "Delete"}
        </Button>
      </div>
    </div>
  );
}

function CustomerCard({
  customer,
  onRefresh,
}: {
  customer: Customer;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // Generate initials for avatar
  const initials = customer.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="border border-subtle rounded-xl overflow-hidden">
      {/* Header row */}
      <button
        type="button"
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-panel/80 transition-colors text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="text-soft shrink-0">
          {expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </span>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
          <span className="text-xs font-semibold text-brand">{initials}</span>
        </div>

        {/* Customer info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink">{customer.name}</p>
          <p className="text-xs text-soft">{customer.email}</p>
        </div>

        {/* Device count + Add Device */}
        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <Badge variant="secondary">
            {customer.devices.length} device{customer.devices.length !== 1 ? "s" : ""}
          </Badge>
          <AddDeviceDialog
            customerId={customer.id}
            customerName={customer.name}
            onSuccess={onRefresh}
          />
        </div>
      </button>

      {/* Expanded: device cards */}
      {expanded && (
        <div className="border-t border-subtle bg-page/40 p-4">
          {customer.devices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-soft gap-2">
              <Monitor className="h-8 w-8 opacity-30" />
              <p className="text-sm">No devices registered yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {customer.devices.map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  onDeleted={onRefresh}
                  onRefresh={onRefresh}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function CustomerTable({ customers }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function refresh() {
    startTransition(() => router.refresh());
  }

  if (customers.length === 0) {
    return (
      <div className="text-center py-16 text-soft">
        <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No customers yet. Add your first customer to get started.</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {customers.map((customer) => (
        <CustomerCard
          key={customer.id}
          customer={customer}
          onRefresh={refresh}
        />
      ))}
    </div>
  );
}
