"use client";
import Header from "../../components/Header";
import CollectionTable from "../../components/CollectionTable";
import CollectionGallery from "../../components/CollectionGallery";
import PurchaseModal from "../../components/PurchaseModal";
import { useState, useMemo } from "react";
import type { Figure } from "../../components/types";
import { useCollection } from "../../components/CollectionStore";
import { useCurrency, formatCents } from "../../components/CurrencyContext";
import { FIGURES } from "../../components/mockData";

type View = "gallery" | "table";

export default function CollectionPage() {
  const [activeFigure, setActiveFigure] = useState<Figure | null>(null);
  const [ownedId, setOwnedId] = useState<string | null>(null);
  const [view, setView] = useState<View>("gallery");

  const { owned } = useCollection();
  const { toEurCents, fromEurCents, currency } = useCurrency();

  const { uniqueOwned, copies, spend } = useMemo(() => {
    const uniqueOwned = new Set(owned.map(o => o.figureId)).size;
    const copies = owned.length;
    let eur = 0;
    for (const o of owned) {
      const sum = (o.pricePaidCents ?? 0) + (o.taxCents ?? 0) + (o.shippingCents ?? 0);
      eur += toEurCents(sum, o.currency, o.fxPerEUR);
    }
    return { uniqueOwned, copies, spend: fromEurCents(eur, currency) };
  }, [owned, toEurCents, fromEurCents, currency]);

  return (
    <>
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">My Collection</h1>
          <div className="rounded-lg border border-[var(--border)] p-1">
            <button className={`px-3 py-2 rounded-md text-sm ${view==="gallery"?"bg-gray-100":""}`} onClick={()=>setView("gallery")}>Gallery</button>
            <button className={`px-3 py-2 rounded-md text-sm ${view==="table"?"bg-gray-100":""}`} onClick={()=>setView("table")}>Table</button>
          </div>
        </div>

        {/* Sticky summary */}
        <div className="card p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Catalog (all)" value={FIGURES.length.toString()} />
            <Stat label="Owned (unique)" value={uniqueOwned.toString()} />
            <Stat label="Owned (copies)" value={copies.toString()} />
            <Stat label="Total spend" value={formatCents(spend, currency)} />
          </div>
        </div>

        {view === "gallery" ? (
          <CollectionGallery
            onAdd={(f)=>{ setActiveFigure(f); setOwnedId(null); }}
            onEditOwned={(id, f)=>{ setActiveFigure(f); setOwnedId(id); }}
          />
        ) : (
          <CollectionTable onEdit={(id, fig)=>{ setOwnedId(id); setActiveFigure(fig); }} />
        )}
      </div>

      <PurchaseModal open={!!activeFigure} onClose={()=>{ setActiveFigure(null); setOwnedId(null); }} figure={activeFigure} ownedId={ownedId} />
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-600">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}
