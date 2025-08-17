"use client";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function SignIn() {
  const { status } = useSession();
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const e = params.get("error");
    if (e) setErr(e.replace(/_/g, " "));
  }, [params]);

  // Redirect after we are authenticated (do NOT redirect while rendering)
  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [status, router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (!res?.ok) setErr(res?.error || "Sign-in failed");
  };

  // While authenticated and redirecting, render a small placeholder (no setState here)
  if (status === "authenticated") {
    return (
      <main className="min-h-screen grid place-items-center">
        <div className="text-sm text-gray-600">Signing in…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen grid place-items-center px-4">
      <form onSubmit={submit} className="card p-6 w-full max-w-sm space-y-4">
        <h1 className="text-lg font-semibold">Sign in</h1>
        <div>
          <label className="text-xs text-gray-600">Email</label>
          <input className="field h-11 text-base w-full" type="email"
                 value={email} onChange={(e)=>setEmail(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-gray-600">Password</label>
          <input className="field h-11 text-base w-full" type="password"
                 value={password} onChange={(e)=>setPassword(e.target.value)} />
        </div>
        {err && <div className="text-sm text-red-600">{err}</div>}
        <button className="btn btn-primary h-11 w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
        <Link href="/" className="text-sm text-gray-600 text-center block">Back to home</Link>
      </form>
    </main>
  );
}
