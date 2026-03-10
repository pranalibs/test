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

  const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";
  const message = encodeURIComponent(
    `Hi, I have made the payment for renewal of my device "${deviceName}" (Device ID: ${deviceId}). Please find the payment screenshot attached. Kindly renew my subscription. Thank you.`
  );
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;

  return (
    <div
      className={`rounded-xl border px-4 py-4 mb-3 ${
        isExpired || isUrgent
          ? "bg-red-50 border-red-200"
          : "bg-amber-50 border-amber-200"
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-2 mb-3">
        <AlertTriangle
          className={`h-4 w-4 mt-0.5 shrink-0 ${
            isExpired || isUrgent ? "text-red-500" : "text-amber-500"
          }`}
        />
        <div>
          <p className={`text-sm font-semibold ${isExpired || isUrgent ? "text-red-700" : "text-amber-700"}`}>
            {isExpired
              ? "Subscription Expired"
              : isUrgent
              ? `Subscription expiring in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}!`
              : `Subscription expiring in ${daysLeft} days`}
          </p>
          <p className={`text-xs mt-0.5 ${isExpired || isUrgent ? "text-red-600" : "text-amber-600"}`}>
            Scan the QR code below to pay and send us the confirmation via WhatsApp.
          </p>
        </div>
      </div>

      {/* QR + WhatsApp row */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* PhonePe QR */}
        <div className="shrink-0 flex flex-col items-center gap-1">
          <div className="rounded-xl border border-subtle bg-white p-2 shadow-sm">
            <Image
              src="/phonepe-qr.png"
              alt="PhonePe Payment QR Code"
              width={120}
              height={120}
              className="rounded-lg"
              unoptimized
            />
          </div>
          <p className="text-xs text-soft text-center">Scan to pay via PhonePe</p>
        </div>

        {/* Instructions + WhatsApp button */}
        <div className="flex-1 space-y-3">
          <ol className="text-xs text-soft space-y-1 list-decimal list-inside">
            <li>Scan the QR code with PhonePe or any UPI app</li>
            <li>Complete the payment</li>
            <li>Take a screenshot of the payment confirmation</li>
            <li>Tap the WhatsApp button below to send us the screenshot</li>
          </ol>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#25D366] hover:bg-[#1ebe5d] text-white text-sm font-medium transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            Send Payment Screenshot on WhatsApp
          </a>

          <p className="text-xs text-soft">
            After we verify your payment, your subscription will be renewed manually within a few hours.
          </p>
        </div>
      </div>
    </div>
  );
}
