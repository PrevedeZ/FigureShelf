"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await res.json();
    if (!res.ok) { setErr(data?.error ?? "Registration failed"); return; }
    // auto sign-in
    const s = await signIn("credentials", { redirect: false, email, password });
    if (s?.ok) router.push("/account"); else router.push("/login");
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="max-w-md mx-auto card p-4">
        <h1 className="text-lg font-semibold mb-2">Create account</h1>
        <form className="space-y-3" onSubmit={onSubmit}>
          <input className="field" type="text" placeholder="Display name (optional)" value={name} onChange={e=>setName(e.target.value)} />
          <input className="field" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required />
          <input className="field" type="password" placeholder="Choose a password" value={password} onChange={e=>setPassword(e.target.value)} required />
          {err && <div className="text-sm text-red-600">{err}</div>}
          <div className="flex gap-2 justify-end">
            <Link href="/login" className="btn btn-ghost">Log in</Link>
            <button className="btn btn-primary" type="submit">Register</button>
          </div>
        </form>
      </div>
    </div>
  );
}
