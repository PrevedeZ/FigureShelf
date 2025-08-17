"use client";

import { useMemo, useState } from "react";
import Header from "../../components/Header";
import { useCatalog } from "../../components/catalog";
import { useCollection } from "../../components/CollectionStore";
import { useCurrency, formatCents } from "../../components/CurrencyContext";
import type { Figure } from "../../components/types";

import PurchaseModal from "../../components/PurchaseModal";
import OwnedManagerModal from "../../components/OwnedManagerModal";
import WishModal from "../../components/WishModal";

export default function MyCollectionPage() {
  // DB-backed figures/series
  const { figures, byId, loading } = useCatalog();

  // User’s collection (owned + wishlist)
  const { owned, wishlist } = useCollection() as any;

  // Currency helpers
  const { toEurCents, fromEurCents, currency } = useCurrency();

  // Modals state
  const [buyFigure, setBuyFigure] = useState<Figure | null>(null);
  const [manageFigure, setManageFigure] = useState<Figure | null>(null);
  const [wishFigure, setWishFigure] = useState<Figure | null>(null);
  const [editOwnedId, setEditOwnedId] = useState<string | null>(null);

  // ---- Derive summary & groups ----
  const { totals, ownedGroups, wishGroups } = useMemo(() => {
    // Map figureId -> { qty, spendEUR }
    const perFigure = new Map<
      string,
      { qty: number; eurSpend: number }
    >();

    let eurTotal = 0;
    for (const o of owned ?? []) {
      const line = (o.pricePaidCents ?? 0) + (o.taxCents ?? 0) + (o.shippingCents ?? 0);
      const eur = toEurCents(line, o.currency, o.fxPerEUR);
      eurTotal += eur;

      const rec = perFigure.get(o.figureId) ?? { qty: 0, eurSpend: 0 };
      rec.qty += 1;
      rec.eurSpend += eur;
      perFigure.set(o.figureId, rec);
    }

    // Build owned groups by series
    const bySeriesOwned = new Map<
      string,
      { figure: Figure; qty: number; spendDisp: number }[]
    >();

    for (const [figId, agg] of perFigure.entries()) {
      const f = byId.get(figId) as Figure | undefined;
      if (!f) continue;
      const arr = bySeriesOwned.get(f.series) ?? [];
      arr.push({
        figure: f,
        qty: agg.qty,
        spendDisp: fromEurCents(agg.eurSpend, currency),
      });
      bySeriesOwned.set(f.series, arr);
    }

    // Sort figures by name within each series
    for (const arr of bySeriesOwned.values()) {
      arr.sort((a, b) => a.figure.name.localeCompare(b.figure.name));
    }

    // Build wishlist groups by series
    const bySeriesWish = new Map<string, Figure[]>();
    for (const w of wishlist ?? []) {
      const f = byId.get(w.figureId) as Figure | undefined;
      if (!f) continue;
      const arr = bySeriesWish.get(f.series) ?? [];
      arr.push(f);
      bySeriesWish.set(f.series, arr);
    }
    for (const arr of bySeriesWish.values()) {
      // unique figures (just in case)
      const uniq = new Map(arr.map((f) => [f.id, f]));
      const sorted = [...uniq.values()].sort((a, b) => a.name.localeCompare(b.name));
      const series = sorted[0]?.series ?? "";
      bySeriesWish.set(series, sorted);
    }

    // Totals
    const uniqueOwned = perFigure.size;
    const copiesOwned = owned?.length ?? 0;
    const totalSpendDisp = fromEurCents(eurTotal, currency);

    return {
      totals: { uniqueOwned, copiesOwned, totalSpendDisp },
      ownedGroups: bySeriesOwned,
      wishGroups: bySeriesWish,
    };
  }, [owned, wishlist, byId, fromEurCents, toEurCents, currency]);

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        <h1 className="text-xl font-semibold">My Collection</h1>

        {/* Summary cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SummaryCard label="Owned (unique)" value={String(totals.uniqueOwned)} />
          <SummaryCard label="Owned (copies)" value={String(totals.copiesOwned)} />
          <SummaryCard label="Total Spend" value={formatCents(totals.totalSpendDisp, currency as any)} />
        </section>

        {/* Owned by series */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Owned by Series</h2>
          {loading ? (
            <div className="card p-6 text-center text-gray-600">Loading…</div>
          ) : ownedGroups.size === 0 ? (
            <div className="card p-6 text-center text-gray-600">
              You don’t own any figures yet.
            </div>
          ) : (
            [...ownedGroups.entries()]
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([series, items]) => (
                <div key={series} className="card p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-base font-semibold">{series}</div>
                    <div className="text-sm text-gray-600">
                      {items.length} figure{items.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {items.map(({ figure: f, qty, spendDisp }) => (
                      <div key={f.id} className="card p-3 flex gap-3">
                        <img
                          src={f.image}
                          alt={f.name}
                          className="w-20 h-20 object-cover rounded-md border border-[var(--border)]"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{f.name}</div>
                          <div className="text-sm text-gray-600">
                            Qty: <span className="font-medium">{qty}</span>
                            {" · "}
                            Spend: <span className="font-medium">{formatCents(spendDisp, currency as any)}</span>
                          </div>
                          <div className="mt-2 flex gap-2">
                            <button
                              className="btn btn-ghost h-9"
                              onClick={() => setManageFigure(f)}
                            >
                              Manage
                            </button>
                            <button
                              className="btn btn-primary h-9"
                              onClick={() => { setBuyFigure(f); setEditOwnedId(null); }}
                            >
                              Add another
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
          )}
        </section>

        {/* Wishlist by series */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Wishlist</h2>
          {wishGroups.size === 0 ? (
            <div className="card p-6 text-center text-gray-600">
              Your wishlist is empty.
            </div>
          ) : (
            [...wishGroups.entries()]
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([series, list]) => (
                <div key={series} className="card p-4">
                  <div className="mb-3 text-base font-semibold">{series}</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {list.map((f) => (
                      <div key={f.id} className="card p-3 flex gap-3">
                        <img
                          src={f.image}
                          alt={f.name}
                          className="w-20 h-20 object-cover rounded-md border border-[var(--border)]"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{f.name}</div>
                          <div className="mt-2 flex gap-2">
                            <button
                              className="btn btn-primary h-9"
                              onClick={() => { setBuyFigure(f); setEditOwnedId(null); }}
                            >
                              Purchase
                            </button>
                            <button
                              className="btn btn-ghost h-9"
                              onClick={() => setWishFigure(f)}
                            >
                              Edit wish
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
          )}
        </section>
      </main>

      {/* Modals */}
      <PurchaseModal
        open={!!buyFigure}
        onClose={() => { setBuyFigure(null); setEditOwnedId(null); }}
        figure={buyFigure}
        ownedId={editOwnedId}
      />

      <OwnedManagerModal
        open={!!manageFigure}
        onClose={() => setManageFigure(null)}
        figure={manageFigure}
        onEditOwned={(ownedId) => {
          if (!manageFigure) return;
          setBuyFigure(manageFigure);
          setEditOwnedId(ownedId);
          setManageFigure(null);
        }}
      />

      <WishModal
        open={!!wishFigure}
        onClose={() => setWishFigure(null)}
        figure={wishFigure}
      />
    </>
  );
}

/* ---------- small UI atom ---------- */
function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-[11px] uppercase tracking-wide text-gray-600">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
