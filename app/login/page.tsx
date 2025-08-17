"use client";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    const res = await signIn("credentials", { redirect: false, email, password });
    if (res?.ok) router.push("/"); else setErr("Invalid email or password");
  };

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="max-w-md mx-auto card p-4">
          <h1 className="text-lg font-semibold mb-2">Log in</h1>
          <form className="space-y-3" onSubmit={onSubmit}>
            <input className="field" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} required />
            <input className="field" type="password" placeholder="Your password" value={password} onChange={e=>setPassword(e.target.value)} required />
            {err && <div className="text-sm text-red-600">{err}</div>}
            <div className="flex gap-2 justify-end">
              <Link href="/register" className="btn btn-ghost">Register</Link>
              <button className="btn btn-primary" type="submit">Log in</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
