"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Users } from "lucide-react";
import { AddCustomerDialog } from "@/components/admin/AddCustomerDialog";

interface Props {
  customerCount: number;
}

export function DashboardHeader({ customerCount }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  function refresh() {
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-semibold text-ink flex items-center gap-2">
          <Users className="h-5 w-5 text-brand" />
          Customers
        </h1>
        <p className="text-sm text-soft mt-0.5">
          {customerCount} customer{customerCount !== 1 ? "s" : ""} registered
        </p>
      </div>
      <AddCustomerDialog onSuccess={refresh} />
    </div>
  );
}
