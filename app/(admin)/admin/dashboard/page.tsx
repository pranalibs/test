import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/server";
import { CustomerTable } from "@/components/admin/CustomerTable";
import { DashboardHeader } from "@/components/admin/DashboardHeader";
import { SignOutButton } from "@/components/admin/SignOutButton";

async function getAdminUser() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

async function getCustomers() {
  const { data, error } = await supabaseAdmin
    .from("customers")
    .select(`
      id, name, email, created_at,
      devices (
        id, device_name, device_id, device_location,
        dashboard_url, subscription_start, subscription_end
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching customers:", error);
    return [];
  }
  return data ?? [];
}

export default async function DashboardPage() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  const customers = await getCustomers();

  return (
    <div className="min-h-screen bg-page">
      {/* Top Nav */}
      <header className="bg-dark border-b border-[#2A2A2A] sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="text-white font-semibold text-sm">Customer Management</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[#8B8B8B] text-sm hidden sm:block">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <DashboardHeader customerCount={customers.length} />

        {/* Customer Table Card */}
        <div className="bg-panel border border-subtle rounded-2xl shadow-sm overflow-hidden">
          <CustomerTable customers={customers} />
        </div>
      </main>
    </div>
  );
}
