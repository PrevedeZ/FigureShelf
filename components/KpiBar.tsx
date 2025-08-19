// components/KpiBar.tsx
"use client";

import { useMemo } from "react";
import { useCollection } from "./CollectionStore";
import { useCatalog } from "./catalog";
import { useCurrency, formatCents } from "./CurrencyContext";

/** small UI helper */
function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-[11px] uppercase tracking-wide text-gray-600">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

/**
 * Realtime KPI bar.
 * - Computes from in-memory collection state (useCollection) so it re-renders instantly.
 * - Optional series filtering: when `selectedSeries` is provided, only those series are counted.
 */
export default function KpiBar({ selectedSeries = [] as string[] }) {
  const { owned } = useCollection();
  const { byId } = useCatalog();
  const { currency, convert } = useCurrency();

  const { uniqueCount, copiesCount, spendDisplayCents } = useMemo(() => {
    const filter = selectedSeries.length ? new Set(selectedSeries) : null;

    // count per figureId
    const perFigure = new Map<string, number>();
    let spendDisplay = 0;

    for (const o of owned) {
      const f = byId.get(o.figureId);
      if (!f) continue;
      if (filter && !filter.has(f.series)) continue;

      perFigure.set(o.figureId, (perFigure.get(o.figureId) ?? 0) + 1);

      // convert each line into the *current* display currency and sum
      const line =
        (o.pricePaidCents ?? 0) + (o.taxCents ?? 0) + (o.shippingCents ?? 0);
      spendDisplay += convert(line, o.currency, currency);
    }

    let uniques = 0;
    let copies = 0;
    for (const [, count] of perFigure) {
      if (count >= 1) uniques += 1;
      if (count > 1) copies += count - 1; // only duplicates count as copies
    }

    return {
      uniqueCount: uniques,
      copiesCount: copies,
      spendDisplayCents: spendDisplay,
    };
  }, [owned, byId, selectedSeries, convert, currency]);

  return (
    <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <Card label="Owned (unique)" value={String(uniqueCount)} />
      <Card label="Owned (copies)" value={String(copiesCount)} />
      <Card label="Spend" value={formatCents(spendDisplayCents, currency)} />
    </section>
  );
}
