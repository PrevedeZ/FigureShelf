"use client";
import Image from "next/image";
import { useMemo } from "react";
import type { Figure } from "./types";
import { useCollection } from "./CollectionStore";
import { useCurrency, formatCents } from "./CurrencyContext";
import { useCatalog } from "./catalog";

export default function CollectionGallery(
  { onAdd, onEditOwned }:
  { onAdd: (f: Figure) => void; onEditOwned: (ownedId: string, f: Figure) => void }
) {
  const { figures } = useCatalog();
  const { ownedByFigure, ownedCountForFigure, sellOne } = useCollection();
  const { fromEurCents, toEurCents, currency } = useCurrency();

  const groups = useMemo(() => {
    if (!figures) return [];
    const map = new Map<string, { fig: Figure; eurTotal: number; copies: ReturnType<typeof ownedByFigure> }>();
    for (const fig of figures) {
      const copies = ownedByFigure(fig.id);
      if (!copies.length) continue;
      let eur = 0;
      for (const o of copies) {
        const sum = (o.pricePaidCents ?? 0) + (o.taxCents ?? 0) + (o.shippingCents ?? 0);
        eur += toEurCents(sum, o.currency, o.fxPerEUR);
      }
      map.set(fig.id, { fig, eurTotal: eur, copies });
    }
    return Array.from(map.values()).sort((a,b)=>a.fig.name.localeCompare(b.fig.name));
  }, [figures, ownedByFigure, toEurCents]);

  if (!figures) return <div className="card p-8 text-center text-gray-600">Loading…</div>;
  if (groups.length === 0) return <div className="card p-8 text-center text-gray-600">No owned items yet.</div>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
      {groups.map(({ fig, eurTotal, copies }) => {
        const display = fromEurCents(eurTotal, currency);
        const count = ownedCountForFigure(fig.id);
        const latest = copies[0];
        return (
          <div key={fig.id} className="card overflow-hidden flex flex-col">
            <div className="relative aspect-[4/5]">
              <Image src={fig.image} alt={fig.name} fill className="object-cover" />
              <div className="absolute left-2 top-2 badge">{fig.series}</div>
              <div className="absolute right-2 top-2 badge">Owned ×{count}</div>
            </div>
            <div className="p-3 flex flex-col gap-2">
              <div className="text-center">
                <div className="font-semibold leading-snug">{fig.name}</div>
                <div className="text-sm text-gray-600">{fig.character} · {fig.releaseYear}</div>
              </div>
              <div className="text-sm text-center text-gray-700">Spend (all copies): <strong>{formatCents(display, currency)}</strong></div>
              <div className="flex items-center justify-center gap-2">
                <button className="btn btn-ghost" onClick={()=>sellOne(fig.id)} aria-label="Sell one">−</button>
                <div className="px-3 py-1 rounded-md border border-[var(--border)] min-w-10 text-center">{count}</div>
                <button className="btn btn-ghost" onClick={()=>onAdd(fig)} aria-label="Add another">+</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button className="btn btn-primary" onClick={()=>onAdd(fig)}>Add copy</button>
                <button className="btn btn-ghost" onClick={()=>onEditOwned(latest.id, fig)}>Edit latest</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
