"use client";

import Image from "next/image";
import { AlertTriangle, MessageCircle } from "lucide-react";

interface Props {
  deviceName: string;
  deviceId: string;
  daysLeft: number;
}

export function RenewalPrompt({ deviceName, deviceId, daysLeft }: Props) {
  const isUrgent = daysLeft <= 7;
  const isExpired = daysLeft <= 0;

  return (
    <div
      className={`rounded-xl border px-4 py-4 mb-3 ${
        isExpired || isUrgent
          ? "bg-red-50 border-red-200 shadow-sm"
          : "bg-amber-50 border-amber-200 shadow-sm"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 p-1.5 rounded-lg ${isExpired || isUrgent ? "bg-red-100" : "bg-amber-100"}`}>
            <AlertTriangle
              className={`h-4 w-4 ${
                isExpired || isUrgent ? "text-red-600" : "text-amber-600"
              }`}
            />
          </div>
          <div>
            <p className={`text-sm font-bold ${isExpired || isUrgent ? "text-red-800" : "text-amber-800"}`}>
              {isExpired
                ? "Subscription Expired"
                : `Subscription expiring in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}!`}
            </p>
            <p className={`text-xs mt-0.5 font-medium ${isExpired || isUrgent ? "text-red-700/70" : "text-amber-700/70"}`}>
              Please renew to maintain uninterrupted access to your dashboard.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            const tabsList = document.querySelector('[role="tablist"]');
            const billingTab = tabsList?.querySelector('[value="billing"]') as HTMLButtonElement;
            billingTab?.click();
          }}
          className={`shrink-0 px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 ${
            isExpired || isUrgent
              ? "bg-red-600 text-white hover:bg-red-700 shadow-sm"
              : "bg-amber-600 text-white hover:bg-amber-700 shadow-sm"
          }`}
        >
          Renew Now
        </button>
      </div>
    </div>
  );
}
