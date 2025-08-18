"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password }),
      });

      const j = await r.json();
      if (!r.ok) {
        setErr(j?.error || "Could not register");
        return;
      }

      // sign them in immediately using credentials provider
      await signIn("credentials", {
        email,
        password,
        redirect: true,
        callbackUrl: "/", // send to home after login
      });
    } catch (e) {
      setErr("Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold mb-4">Create account</h1>

      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="text-sm text-gray-600">Name (optional)</label>
          <input
            className="field w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Email</label>
          <input
            className="field w-full"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <label className="text-sm text-gray-600">Password</label>
          <input
            className="field w-full"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
            minLength={8}
          />
        </div>

        {err && <div className="text-sm text-red-600">{err}</div>}

        <div className="flex items-center gap-2">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </button>
          <Link href="/auth/signin" className="btn btn-ghost">
            Sign in
          </Link>
        </div>
      </form>
    </div>
  );
}