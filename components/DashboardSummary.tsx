"use client";
import { useMemo } from "react";
import { useCollection } from "./CollectionStore";
import { useCurrency, formatCents } from "./CurrencyContext";
import { useCatalog } from "./catalog";

/** Dashboard cards with correct EUR normalization and display currency formatting */
export default function DashboardSummary() {
  const { owned } = useCollection();
  const { figures } = useCatalog();
  const { toEurCents, fromEurCents, convert, currency } = useCurrency();

  const stats = useMemo(() => {
    const copies = owned.length;
    const unique = new Set(owned.map(o => o.figureId)).size;

    // Spend: sum( (price+tax+ship) -> EUR ) then render in chosen display currency
    let eurSpend = 0;
    for (const o of owned) {
      const total = (o.pricePaidCents ?? 0) + (o.taxCents ?? 0) + (o.shippingCents ?? 0);
      eurSpend += toEurCents(total, o.currency, o.fxPerEUR);
    }
    const spendDisplay = fromEurCents(eurSpend, currency);

    // MSRP total (owned copies): find the figure’s MSRP, convert from its MSRP currency to display currency, multiply by copies count
    let msrpCopiesDisplay = 0;
    if (figures && figures.length) {
      const byId = new Map(figures.map(f => [f.id, f]));
      for (const o of owned) {
        const f = byId.get(o.figureId);
        if (!f) continue;
        msrpCopiesDisplay += convert(f.msrpCents, f.msrpCurrency as any, currency);
      }
    }

    return { copies, unique, spendDisplay, msrpCopiesDisplay };
  }, [owned, figures, toEurCents, fromEurCents, convert, currency]);

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card label="Owned (unique)" value={String(stats.unique)} />
      <Card label="Owned (copies)" value={String(stats.copies)} />
      <Card label="Spend" value={formatCents(stats.spendDisplay, currency)} />
      <Card label="MSRP (copies)" value={formatCents(stats.msrpCopiesDisplay, currency)} />
    </section>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-gray-600">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-center">{value}</div>
    </div>
  );
}
