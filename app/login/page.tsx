"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      setError("That password didn't work — try again.");
      setSubmitting(false);
      return;
    }

    router.push(searchParams.get("from") || "/");
    router.refresh();
  }

  return (
    <div className="max-w-sm rounded-md border border-navy/10 bg-white/90 p-8 shadow-xl backdrop-blur-sm">
      <p className="font-sans text-xs font-semibold uppercase tracking-widest text-gold">
        AI R&amp;A Submissions
      </p>
      <h1 className="mt-3 font-serif text-2xl text-navy">Enter the team password</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-sm border border-navy/20 px-4 py-2.5 text-sm text-navy outline-none focus:border-teal"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !password}
          className="w-full rounded-sm bg-teal px-7 py-2.5 font-sans text-sm font-semibold uppercase tracking-wider text-white shadow-md transition hover:-translate-y-0.5 hover:bg-teal/90 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Checking…" : "Enter"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="relative left-1/2 right-1/2 -mx-[50vw] flex w-screen min-h-[80vh] items-center justify-center px-6">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
