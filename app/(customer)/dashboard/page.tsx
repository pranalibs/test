import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/server";
import { verifySession } from "@/lib/session";
import { RenewalPrompt } from "@/components/customer/RenewalPrompt";
import { AddDeviceDialog } from "@/components/customer/AddDeviceDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BillingSection } from "@/components/customer/BillingSection";

type Device = {
  id: string;
  device_name: string;
  device_id: string;
  device_location: string | null;
  dashboard_url: string | null;
  subscription_start: string;
  subscription_end: string;
  is_suspended: boolean;
};

function daysUntil(dateStr: string): number {
  const end = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function SubscriptionBadge({ days, isSuspended }: { days: number; isSuspended: boolean }) {
  if (isSuspended) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
        Suspended
      </span>
    );
  }
  if (days <= 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        Expired
      </span>
    );
  }
  if (days <= 7) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        {days}d left
      </span>
    );
  }
  if (days <= 30) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
        {days}d left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      Active · {days}d
    </span>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function CustomerDashboardPage() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("cs")?.value;

  if (!sessionCookie) redirect("/login");

  const email = verifySession(sessionCookie);
  if (!email) redirect("/login");

  // Fetch customer + all their devices
  const { data: customer } = await supabaseAdmin
    .from("customers")
    .select("id, name, email, devices(*)")
    .eq("email", email)
    .single();

  if (!customer) redirect("/login");

  const devices = (customer.devices ?? []) as Device[];

  return (
    <div className="min-h-screen bg-page">
      {/* Header */}
      <header className="border-b border-subtle bg-panel">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-brand">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-soft">Welcome back</p>
              <p className="text-sm font-semibold text-ink leading-tight">{customer.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AddDeviceDialog customerEmail={email as string} />
            <form action="/api/auth/customer/logout" method="POST">
              <button
                type="submit"
                className="text-sm text-soft hover:text-ink transition-colors px-3 py-1.5 rounded-lg hover:bg-subtle/50"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <Tabs defaultValue="devices" className="space-y-6">
          <div className="flex items-center justify-between">
            <TabsList className="bg-panel border border-subtle p-1 rounded-xl">
              <TabsTrigger value="devices" className="rounded-lg px-6">My Devices</TabsTrigger>
              <TabsTrigger value="billing" className="rounded-lg px-6">Billing</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="devices" className="mt-0">
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-ink">My Devices</h1>
              <p className="text-sm text-soft mt-0.5">
                {devices.length === 0
                  ? "No devices assigned yet."
                  : `${devices.length} device${devices.length !== 1 ? "s" : ""} on your account`}
              </p>
            </div>

            {devices.length === 0 ? (
              <div className="bg-panel border border-subtle rounded-2xl p-12 text-center">
                <p className="text-soft text-sm">No devices have been assigned to your account yet.</p>
                <p className="text-soft text-xs mt-1">Contact your administrator to get set up.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {devices.map((device) => {
                  const days = daysUntil(device.subscription_end);
                  const expired = days <= 0;
                  const showRenewal = !device.is_suspended && days <= 30;

                  return (
                    <div key={device.id}>
                      {showRenewal && (
                        <RenewalPrompt
                          deviceName={device.device_name}
                          deviceId={device.device_id}
                          daysLeft={days}
                        />
                      )}
                      <div className="bg-panel border border-subtle rounded-2xl p-5 shadow-sm">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <h2 className="text-base font-semibold text-ink">{device.device_name}</h2>
                              <SubscriptionBadge days={days} isSuspended={device.is_suspended} />
                            </div>

                            <div className="mt-1 flex items-center gap-3 flex-wrap">
                              <span className="font-mono text-xs text-soft bg-subtle/50 px-2 py-0.5 rounded">
                                {device.device_id}
                              </span>
                              {device.device_location && (
                                <span className="text-xs text-soft flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  {device.device_location}
                                </span>
                              )}
                            </div>

                            <div className="mt-3 flex items-center gap-1.5 text-xs text-soft">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>
                                {formatDate(device.subscription_start)} → {formatDate(device.subscription_end)}
                              </span>
                              {expired && !device.is_suspended && (
                                <span className="text-red-600 font-medium ml-1">· Expired</span>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0">
                            {device.dashboard_url && !expired && !device.is_suspended ? (
                              <a
                                href={device.dashboard_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-dark transition-colors"
                              >
                                Open Dashboard
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-subtle text-soft text-sm font-medium cursor-not-allowed"
                                title={
                                  device.is_suspended
                                    ? "Device is suspended — contact administrator"
                                    : expired
                                    ? "Subscription expired"
                                    : "No dashboard URL configured"
                                }
                              >
                                {device.is_suspended ? "Suspended" : expired ? "Expired" : "No URL"}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="billing" className="mt-0">
            <BillingSection initialDevices={devices} />
          </TabsContent>
        </Tabs>

        <p className="text-center text-xs text-soft mt-10">
          Need help?{" "}
          <a href="mailto:" className="text-brand hover:underline">
            Contact your administrator
          </a>
        </p>
      </main>
    </div>
  );
}
