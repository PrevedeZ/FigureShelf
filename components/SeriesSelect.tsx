"use client";

import { useEffect, useState } from "react";

type Opt = { id: string; name: string };

async function safeJson<T = any>(r: Response): Promise<T | null> {
  const ct = r.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return null;
  try {
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export default function SeriesSelect({
  value,
  onChange,
  disabled,
  placeholder = "Select a series…",
}: {
  value?: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [opts, setOpts] = useState<Opt[]>([]);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/series", { cache: "no-store", credentials: "include" });
      const data = await safeJson<{ items?: Opt[] }>(r);
      setOpts(Array.isArray(data?.items) ? data!.items : []);
    } catch {
      setOpts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const handler = () => load();
    document.addEventListener("catalog:changed", handler as any);
    return () => document.removeEventListener("catalog:changed", handler as any);
  }, []);

  return (
    <select
      className="field w-full"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || loading}
    >
      <option value="">{loading ? "Loading…" : placeholder}</option>
      {opts.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}
