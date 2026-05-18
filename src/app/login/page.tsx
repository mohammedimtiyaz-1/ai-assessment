"use client";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: searchParams.get("callbackUrl") || "/dashboard",
    });

    if (result?.error) {
      setError("Invalid credentials");
      setLoading(false);
    } else if (result?.ok) {
      router.push(searchParams.get("callbackUrl") || "/dashboard");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2 font-bold text-2xl">
          <span>AI Assessment</span>
        </div>
        <div className="rounded-lg border bg-slate-900 p-6">
          <div className="mb-4">
            <h3 className="text-xl font-semibold">Sign in</h3>
            <p className="text-sm text-slate-400">Enter your credentials to continue</p>
          </div>
          {error && (
            <div className="mb-4 rounded-md bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <input id="email" name="email" type="email" required className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <input id="password" name="password" type="password" required className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm" />
            </div>
            <button type="submit" disabled={loading} className="w-full rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <div className="mt-4 flex items-center justify-between text-sm">
            <Link href="/forgot-password" className="text-purple-400 hover:underline">
              Forgot password?
            </Link>
            <Link href="/signup" className="text-purple-400 hover:underline">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
