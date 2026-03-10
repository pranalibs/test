"use client";

import { useState } from "react";
import { LoginForm } from "@/components/customer/LoginForm";
import { SetupAccountForm } from "@/components/customer/SetupAccountForm";

export default function CustomerLoginPage() {
  const [view, setView] = useState<"login" | "setup">("login");

  return (
    <div className="min-h-screen bg-page flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand mb-4">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"
              />
            </svg>
          </div>
          {view === "login" ? (
            <>
              <h1 className="text-2xl font-semibold text-ink">Sign In</h1>
              <p className="text-sm text-soft mt-1">Enter your email and password to continue</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-semibold text-ink">Set Up Account</h1>
              <p className="text-sm text-soft mt-1">First-time setup — verify your device and create a password</p>
            </>
          )}
        </div>

        {/* Form Card */}
        <div className="bg-panel border border-subtle rounded-2xl p-6 shadow-sm">
          {view === "login" ? (
            <LoginForm onSwitchToSetup={() => setView("setup")} />
          ) : (
            <SetupAccountForm onSwitchToLogin={() => setView("login")} />
          )}
        </div>

        {/* Toggle link */}
        <p className="text-center text-sm text-soft mt-4">
          {view === "login" ? (
            <>
              First time here?{" "}
              <button
                type="button"
                className="text-brand hover:underline font-medium"
                onClick={() => setView("setup")}
              >
                Set up your account →
              </button>
            </>
          ) : (
            <>
              Already have a password?{" "}
              <button
                type="button"
                className="text-brand hover:underline font-medium"
                onClick={() => setView("login")}
              >
                Sign in →
              </button>
            </>
          )}
        </p>

        <p className="text-center text-xs text-soft mt-4">
          Admin?{" "}
          <a href="/admin/login" className="text-brand hover:underline">
            Admin portal
          </a>
        </p>
      </div>
    </div>
  );
}
