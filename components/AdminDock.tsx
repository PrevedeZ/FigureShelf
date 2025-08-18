// components/AdminDock.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useCatalog } from "./catalog";

type AdminFigureRow = {
  id: string;
  name: string;
  seriesId: string | null;
  seriesName: string | null;
};

type AdminPayload = {
  series: { id: string; name: string }[];
  figures: AdminFigureRow[];
};

export default function AdminDock() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === "ADMIN";
  const { refreshCatalog } = useCatalog();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdminPayload>({ series: [], figures: [] });

  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch("/api/admin/figures", { cache: "no-store", credentials: "include" });
        const j = await r.json();
        if (!alive) return;
        setData(j);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!q.trim()) return data.figures;
    const qq = q.toLowerCase();
    return data.figures.filter(
      (f) =>
        f.name.toLowerCase().includes(qq) ||
        (f.seriesName ?? "").toLowerCase().includes(qq)
    );
  }, [q, data.figures]);

  const assign = async (figureId: string, newSeriesId: string) => {
    const res = await fetch("/api/admin/figures", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ figureId, seriesId: newSeriesId }),
    });
    if (!res.ok) {
      alert("Failed to update assignment.");
      return;
    }
    // update local state quickly
    setData((prev) => ({
      ...prev,
      figures: prev.figures.map((f) =>
        f.id === figureId
          ? {
              ...f,
              seriesId: newSeriesId,
              seriesName: prev.series.find((s) => s.id === newSeriesId)?.name ?? null,
            }
          : f
      ),
    }));
    // inform the rest of the app
    window.dispatchEvent(new Event("catalog:changed"));
    await refreshCatalog();
  };

  if (!isAdmin) {
    return <div className="card p-4 text-red-700">Admin only.</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Admin Dock</h1>

      <div className="card p-3 flex items-center gap-2">
        <input
          className="field h-10 w-full sm:w-96"
          placeholder="Search figures or series…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="card p-0 overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2">Figure</th>
              <th className="text-left px-3 py-2">Series</th>
              <th className="text-left px-3 py-2 w-64">Assign</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-gray-600">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-center text-gray-600">
                  No rows.
                </td>
              </tr>
            ) : (
              filtered.map((f) => (
                <tr key={f.id} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2">{f.name}</td>
                  <td className="px-3 py-2">{f.seriesName ?? <em>Unassigned</em>}</td>
                  <td className="px-3 py-2">
                    <select
                      className="field h-9"
                      value={f.seriesId ?? ""}
                      onChange={(e) => assign(f.id, e.target.value)}
                    >
                      <option value="">— Select series —</option>
                      {data.series.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
