"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  Settings,
  ExternalLink,
  Monitor,
  MapPin,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddDeviceDialog } from "@/components/admin/AddDeviceDialog";
import { daysUntil, formatDate } from "@/lib/utils";

interface Device {
  id: string;
  device_name: string;
  device_id: string;
  device_location: string | null;
  dashboard_url: string | null;
  subscription_start: string;
  subscription_end: string;
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

function SubscriptionBadge({ subscriptionEnd }: { subscriptionEnd: string }) {
  const days = daysUntil(subscriptionEnd);
  if (days < 0) return <Badge variant="danger">Expired</Badge>;
  if (days <= 7) return <Badge variant="danger">{days}d left</Badge>;
  if (days <= 30) return <Badge variant="warning">{days}d left</Badge>;
  return <Badge variant="success">{days}d left</Badge>;
}

function DeviceRow({
  device,
  onDeleted,
}: {
  device: Device;
  onDeleted: () => void;
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
    <tr className="border-b border-subtle last:border-0 hover:bg-page/50 transition-colors">
      <td className="px-4 py-3 pl-10">
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-soft shrink-0" />
          <div>
            <p className="text-sm font-medium text-ink">{device.device_name}</p>
            <p className="text-xs text-soft font-mono">{device.device_id}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        {device.device_location ? (
          <div className="flex items-center gap-1 text-sm text-soft">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {device.device_location}
          </div>
        ) : (
          <span className="text-xs text-soft">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 text-xs text-soft">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>{formatDate(device.subscription_start)}</span>
          <span className="mx-1">→</span>
          <span>{formatDate(device.subscription_end)}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <SubscriptionBadge subscriptionEnd={device.subscription_end} />
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
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
          <Button
            size="sm"
            variant="ghost"
            disabled
            title="Settings coming soon"
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </Button>
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
      </td>
    </tr>
  );
}

function CustomerRow({
  customer,
  onRefresh,
}: {
  customer: Customer;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* Customer header row */}
      <tr
        className="border-b border-subtle hover:bg-panel/80 cursor-pointer transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <td className="px-4 py-4" colSpan={4}>
          <div className="flex items-center gap-3">
            <span className="text-soft">
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">{customer.name}</p>
              <p className="text-xs text-soft">{customer.email}</p>
            </div>
            <Badge variant="secondary" className="ml-2">
              {customer.devices.length} device{customer.devices.length !== 1 ? "s" : ""}
            </Badge>
          </div>
        </td>
        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
          <AddDeviceDialog
            customerId={customer.id}
            customerName={customer.name}
            onSuccess={onRefresh}
          />
        </td>
      </tr>

      {/* Device rows */}
      {expanded && customer.devices.length === 0 && (
        <tr className="border-b border-subtle bg-page/30">
          <td colSpan={5} className="px-10 py-3 text-sm text-soft italic">
            No devices registered yet.
          </td>
        </tr>
      )}
      {expanded &&
        customer.devices.map((device) => (
          <tr key={device.id} className="bg-page/30">
            <DeviceRow device={device} onDeleted={onRefresh} />
          </tr>
        ))}
    </>
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
        <Monitor className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">No customers yet. Add your first customer to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-subtle text-xs text-soft uppercase tracking-wide">
            <th className="px-4 py-3 text-left font-medium">Customer / Device</th>
            <th className="px-4 py-3 text-left font-medium">Location</th>
            <th className="px-4 py-3 text-left font-medium">Subscription Period</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-left font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <CustomerRow
              key={customer.id}
              customer={customer}
              onRefresh={refresh}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
