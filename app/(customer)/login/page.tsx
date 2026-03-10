import { LoginForm } from "@/components/customer/LoginForm";

export default function CustomerLoginPage() {
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
          <h1 className="text-2xl font-semibold text-ink">Sign In</h1>
          <p className="text-sm text-soft mt-1">
            Enter your email and password to continue
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-panel border border-subtle rounded-2xl p-6 shadow-sm">
          <LoginForm />
        </div>

        <p className="text-center text-xs text-soft mt-6">
          Admin?{" "}
          <a href="/admin/login" className="text-brand hover:underline">
            Admin portal
          </a>
        </p>
      </div>
    </div>
  );
}
