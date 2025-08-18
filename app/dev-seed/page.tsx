// app/dev-seed/page.tsx
"use client";
import { useState } from "react";

export default function DevSeedPage() {
  const [out, setOut] = useState<string>("");

  const run = async () => {
    setOut("Seeding…");
    try {
      const r = await fetch("/api/dev/seed", { method: "POST" });
      const j = await r.json();
      setOut(JSON.stringify(j, null, 2));
    } catch (e: any) {
      setOut(String(e?.message || e));
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-3">
      <h1 className="text-xl font-semibold">Dev Seed</h1>
      <button className="btn btn-primary" onClick={run}>Seed DB</button>
      <pre className="card p-3 overflow-auto text-sm">{out}</pre>
    </div>
  );
}
