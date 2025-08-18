"use client";

import { useEffect, useMemo, useState } from "react";

type Series = { id: string; name: string; slug?: string };
type Figure = {
  id: string;
  name: string;
  character: string;
  variant?: string | null;
  image: string;
  releaseYear: number;
  releaseType: string | null;
  msrpCents: number;
  msrpCurrency: "EUR" | "USD" | "GBP" | "JPY";
  series?: { id: string; name: string };
};

function money(cents: number, ccy: string) {
  return `${(cents / 100).toFixed(2)} ${ccy}`;
}

async function safeJson<T = any>(r: Response): Promise<T | null> {
  const ct = r.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return null;
  try {
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

export default function AdminDockClient() {
  const [loading, setLoading] = useState(true);
  const [series, setSeries] = useState<Series[]>([]);
  const [figures, setFigures] = useState<Figure[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Create Series
  const [newSeriesName, setNewSeriesName] = useState("");

  // Create Figure form
  const [form, setForm] = useState({
    seriesId: "",
    name: "",
    character: "",
    line: "",
    image: "",
    releaseYear: new Date().getFullYear(),
    msrpCents: 0,
    msrpCurrency: "EUR" as Figure["msrpCurrency"],
  });

  const canCreateFigure = useMemo(() => {
    return (
      !!form.seriesId &&
      !!form.name.trim() &&
      !!form.character.trim() &&
      !!form.line.trim() &&
      !!form.image.trim() &&
      Number.isFinite(form.releaseYear) &&
      Number.isFinite(form.msrpCents)
    );
  }, [form]);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      // Try admin endpoints first
      const [sRes, fRes] = await Promise.all([
        fetch("/api/admin/series", { cache: "no-store", credentials: "include" }),
        fetch("/api/admin/figures", { cache: "no-store", credentials: "include" }),
      ]);

      const sJson = await safeJson<{ items?: Series[]; error?: string }>(sRes);
      const fJson = await safeJson<{ items?: Figure[]; error?: string }>(fRes);

      let seriesList: Series[] = Array.isArray(sJson?.items) ? sJson!.items! : [];
      let figuresList: Figure[] = Array.isArray(fJson?.items) ? fJson!.items! : [];

      // Fallback to public catalog if admin series fail/empty
      if (!sRes.ok || seriesList.length === 0) {
        const cat = await fetch("/api/catalog", { cache: "no-store", credentials: "include" });
        const catJson = await safeJson<{ series?: Series[] }>(cat);
        if (cat.ok && Array.isArray(catJson?.series)) {
          seriesList = catJson!.series!;
        } else if (!sRes.ok) {
          throw new Error(sJson?.error ?? `Series HTTP ${sRes.status}`);
        }
      }

      // Fallback for figures as well
      if (!fRes.ok || figuresList.length === 0) {
        const cat = await fetch("/api/catalog", { cache: "no-store", credentials: "include" });
        const catJson = await safeJson<{ figures?: Figure[] }>(cat);
        if (cat.ok && Array.isArray(catJson?.figures)) {
          figuresList = catJson!.figures!;
        } else if (!fRes.ok) {
          throw new Error(fJson?.error ?? `Figures HTTP ${fRes.status}`);
        }
      }

      setSeries(seriesList);
      setFigures(figuresList);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load admin data");
      setSeries([]);
      setFigures([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const onCat = () => load();
    document.addEventListener("catalog:changed", onCat as any);
    return () => document.removeEventListener("catalog:changed", onCat as any);
  }, []);

  async function createSeries() {
    if (!newSeriesName.trim()) return;
    const r = await fetch("/api/admin/series", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newSeriesName.trim() }),
    });
    const j = await safeJson<{ series?: Series; error?: string }>(r);
    if (!r.ok) {
      alert(j?.error ?? `Create series failed (${r.status})`);
      return;
    }
    setNewSeriesName("");
    document.dispatchEvent(new CustomEvent("catalog:changed"));
  }

  async function deleteSeries(id: string) {
    if (!confirm("Delete this series? It must have no figures.")) return;
    const r = await fetch(`/api/admin/series/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const j = await safeJson<{ ok?: boolean; error?: string }>(r);
    if (!r.ok) {
      alert(j?.error ?? `Delete failed (${r.status})`);
      return;
    }
    document.dispatchEvent(new CustomEvent("catalog:changed"));
  }

  async function createFigure() {
    if (!canCreateFigure) return;
    const r = await fetch("/api/admin/figures", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const j = await safeJson<{ figure?: Figure; error?: string }>(r);
    if (!r.ok) {
      alert(j?.error ?? `Create figure failed (${r.status})`);
      return;
    }
    // Reset only text/number fields; keep selected seriesId
    setForm((f) => ({
      ...f,
      name: "",
      character: "",
      line: "",
      image: "",
      msrpCents: 0,
    }));
    document.dispatchEvent(new CustomEvent("catalog:changed"));
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Admin Dock</h1>
        <button className="btn btn-ghost" onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "Refresh"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      {/* Series management */}
      <section className="card p-4 space-y-4">
        <div className="font-medium">Series</div>

        <div className="flex gap-2">
          <input
            className="field flex-1"
            placeholder="New series name"
            value={newSeriesName}
            onChange={(e) => setNewSeriesName(e.target.value)}
          />
          <button className="btn btn-primary" onClick={createSeries} disabled={!newSeriesName.trim()}>
            Add Series
          </button>
        </div>

        {/* Series list with delete */}
        <div className="overflow-x-auto">
          {series.length === 0 ? (
            <div className="text-sm text-gray-600">{loading ? "Loading…" : "No series yet."}</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2 pr-2">Name</th>
                  <th className="py-2 pr-2">Slug</th>
                  <th className="py-2 pr-2 w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {series.map((s) => (
                  <tr key={s.id} className="border-t border-[var(--border)]">
                    <td className="py-2 pr-2">{s.name}</td>
                    <td className="py-2 pr-2">{s.slug ?? "—"}</td>
                    <td className="py-2 pr-2">
                      <button className="btn btn-ghost" onClick={() => deleteSeries(s.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Create Figure */}
      <section className="card p-4 space-y-3">
        <div className="font-medium">Create Figure</div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            className="field"
            value={form.seriesId}
            onChange={(e) => setForm((f) => ({ ...f, seriesId: e.target.value }))}
          >
            <option value="">Select series…</option>
            {series.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <input
            className="field"
            placeholder="Figure name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />

          <input
            className="field"
            placeholder="Character"
            value={form.character}
            onChange={(e) => setForm((f) => ({ ...f, character: e.target.value }))}
          />

          <input
            className="field"
            placeholder="Line (e.g., S.H.Figuarts)"
            value={form.line}
            onChange={(e) => setForm((f) => ({ ...f, line: e.target.value }))}
          />

          <input
            className="field"
            placeholder="Image URL"
            value={form.image}
            onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))}
          />

          <input
            className="field"
            type="number"
            placeholder="Release year"
            value={form.releaseYear}
            onChange={(e) => setForm((f) => ({ ...f, releaseYear: Number(e.target.value || 0) }))}
          />

          <input
            className="field"
            type="number"
            placeholder="MSRP (cents)"
            value={form.msrpCents}
            onChange={(e) => setForm((f) => ({ ...f, msrpCents: Number(e.target.value || 0) }))}
          />

          <select
            className="field"
            value={form.msrpCurrency}
            onChange={(e) => setForm((f) => ({ ...f, msrpCurrency: e.target.value as any }))}
          >
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="GBP">GBP</option>
            <option value="JPY">JPY</option>
          </select>
        </div>

        <div className="flex justify-end">
          <button className="btn btn-primary" onClick={createFigure} disabled={!canCreateFigure}>
            Add Figure
          </button>
        </div>
      </section>

      {/* Figures table */}
      <section className="card p-4">
        <div className="mb-2 font-medium">Figures ({figures.length})</div>
        {figures.length === 0 ? (
          <div className="text-sm text-gray-600">{loading ? "Loading…" : "No figures yet."}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2 pr-2">Name</th>
                  <th className="py-2 pr-2">Character</th>
                  <th className="py-2 pr-2">Series</th>
                  <th className="py-2 pr-2">Year</th>
                  <th className="py-2 pr-2">MSRP</th>
                </tr>
              </thead>
              <tbody>
                {figures.map((f) => (
                  <tr key={f.id} className="border-t border-[var(--border)]">
                    <td className="py-2 pr-2">{f.name}</td>
                    <td className="py-2 pr-2">
                      {f.character}
                      {f.variant ? ` (${f.variant})` : ""}
                    </td>
                    {/* IMPORTANT: render the series NAME, not the whole object */}
                    <td className="py-2 pr-2">{f.series?.name ?? "—"}</td>
                    <td className="py-2 pr-2">{f.releaseYear}</td>
                    <td className="py-2 pr-2">{money(f.msrpCents, f.msrpCurrency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
