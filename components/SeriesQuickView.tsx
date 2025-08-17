"use client";
import Link from "next/link";
import { useMemo } from "react";
import { useCatalog } from "./catalog";
import { useCollection } from "./CollectionStore";

/** Tiny ring using conic-gradient, 0–100% */
function MiniRing({ pct }: { pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct || 0));
  return (
    <div
      className="relative w-10 h-10 rounded-full"
      style={{ background: `conic-gradient(var(--accent) ${clamped}%, #e5e7eb 0%)` }}
      aria-label={`Completion ${clamped.toFixed(0)}%`}
    >
      <div className="absolute inset-[3px] rounded-full bg-white" />
      <div className="absolute inset-0 grid place-items-center text-[10px] font-semibold">
        {clamped.toFixed(0)}%
      </div>
    </div>
  );
}

export default function SeriesQuickView({ open = false }: { open?: boolean }) {
  const { series, figures } = useCatalog();
  const { owned } = useCollection();

  const rows = useMemo(() => {
    const bySeries = new Map<string, { id: string; name: string }[]>();
    for (const s of series) bySeries.set(s, []);
    for (const f of figures) {
      if (!bySeries.has(f.series)) bySeries.set(f.series, []);
      bySeries.get(f.series)!.push({ id: f.id, name: f.name });
    }
    const ownedSet = new Set(owned.map(o => o.figureId));

    const out = series.map(s => {
      const list = bySeries.get(s) ?? [];
      const catalog = list.length;
      const unique = list.reduce((acc, item) => acc + (ownedSet.has(item.id) ? 1 : 0), 0);
      const pct = catalog > 0 ? (unique / catalog) * 100 : 0;
      return { series: s, catalog, unique, pct };
    });

    out.sort((a, b) => b.pct - a.pct || a.series.localeCompare(b.series));
    return out;
  }, [series, figures, owned]);

  if (!open || !rows.length) return null;

  return (
    <div
      className="absolute left-0 top-full mt-2 w-[min(90vw,56rem)] rounded-xl border border-[var(--border)] bg-white shadow-card p-3 z-50"
      role="menu"
    >
      <div className="px-2 pb-2 text-xs uppercase tracking-wide text-gray-500">
        Series Quick View
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {rows.slice(0, 12).map(r => (
          <Link
            key={r.series}
            href={`/?series=${encodeURIComponent(r.series)}`}
            className="group/item rounded-lg border border-[var(--border)] p-3 hover:bg-gray-50 transition"
            role="menuitem"
          >
            <div className="flex items-center gap-3">
              <MiniRing pct={r.pct} />
              <div className="min-w-0">
                <div className="truncate font-medium">{r.series}</div>
                <div className="text-xs text-gray-600">
                  {r.unique}/{r.catalog} collected
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="pt-2 text-right">
        <Link href="/series" className="text-sm text-[var(--accent)] hover:underline">
          View full report →
        </Link>
      </div>
    </div>
  );
}
