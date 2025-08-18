"use client";

import { useState, useEffect, useMemo } from "react";
import FiguresGrid from "./FiguresGrid";
import PurchaseModal from "./PurchaseModal";
import WishModal from "./WishModal";
import OwnedManagerModal from "./OwnedManagerModal";
import { useCatalog } from "./catalog";
import { useCollection } from "./CollectionStore";
import { useCurrency, formatCents } from "./CurrencyContext";
import type { CCY, Figure } from "./types";

/* ---------- helpers ---------- */
function asCCY(c: string): CCY {
  const ok = ["EUR", "USD", "GBP", "JPY"] as const;
  return ok.includes(c as CCY) ? (c as CCY) : "EUR";
}
function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-[11px] uppercase tracking-wide text-gray-600">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

/* ---------- KPI bar (DB totals when no series are filtered) ---------- */
function KpiBar({ selectedSeries }: { selectedSeries: string[] }) {
  const { owned } = useCollection();
  const { byId } = useCatalog();
  const { toEurCents, fromEurCents, currency } = useCurrency();
  const display = asCCY(currency);

  const [dbCounts, setDbCounts] = useState<{ copies: number; unique: number }>({ copies: 0, unique: 0 });

  const fetchSummary = async () => {
    if (selectedSeries.length > 0) return; // DB summary is only for "global" view
    const urls = ["/api/owned/summary", "/api/owned-summary"]; // support both routes
    for (const url of urls) {
      try {
        const r = await fetch(url, { cache: "no-store", credentials: "include" });
        if (!r.ok) continue;
        const j = await r.json();
        if (typeof j?.copies === "number" && typeof j?.unique === "number") {
          setDbCounts({ copies: j.copies, unique: j.unique });
          return;
        }
      } catch {}
    }
    setDbCounts({ copies: 0, unique: 0 });
  };

  // initial + refetch when switching between “global” and “filtered” modes
  useEffect(() => { fetchSummary(); }, [selectedSeries.length]);

  // live updates: re-fetch DB summary whenever collection changes (only if in global mode)
  useEffect(() => {
    const h = () => fetchSummary();
    document.addEventListener("owned:changed", h);
    document.addEventListener("wishlist:changed", h);
    return () => {
      document.removeEventListener("owned:changed", h);
      document.removeEventListener("wishlist:changed", h);
    };
  }, []);

  // Client-side aggregation (used when you filter by series)
  const { copies, unique, spendDisplayCents } = useMemo(() => {
    const filter = selectedSeries.length ? new Set(selectedSeries) : null;

    let copies = 0;
    const uniqueSet = new Set<string>();
    let eurSpend = 0;

    for (const o of owned) {
      const f = byId.get(o.figureId);
      if (!f) continue;
      if (filter && !filter.has(f.series)) continue;

      copies += 1;
      uniqueSet.add(f.id);

      const line = (o.pricePaidCents ?? 0) + (o.taxCents ?? 0) + (o.shippingCents ?? 0);
      eurSpend += toEurCents(line, o.currency, o.fxPerEUR ?? undefined);
    }

    const useDb = !filter;
    return {
      copies: useDb ? dbCounts.copies : copies,
      unique: useDb ? dbCounts.unique : uniqueSet.size,
      spendDisplayCents: fromEurCents(eurSpend, display),
    };
  }, [owned, byId, selectedSeries, dbCounts, toEurCents, fromEurCents, display]);

  return (
    <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <Card label="Owned (unique)" value={String(unique)} />
      <Card label="Owned (copies)" value={String(copies)} />
      <Card label="Spend" value={formatCents(spendDisplayCents, display)} />
    </section>
  );
}

/* ---------- page client ---------- */
export default function HomeClient() {
  const { figures, loading } = useCatalog();

  // series filters coming from the grid
  const [selectedSeries, setSelectedSeries] = useState<string[]>([]);

  // modals
  const [activeFigure, setActiveFigure] = useState<Figure | null>(null);
  const [editOwnedId, setEditOwnedId] = useState<string | null>(null);
  const [wishFigure, setWishFigure] = useState<Figure | null>(null);
  const [manageFigure, setManageFigure] = useState<Figure | null>(null);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">All Figures</h1>

      {/* KPIs that follow the grid’s series filter (and DB totals when unfiltered) */}
      <KpiBar selectedSeries={selectedSeries} />

      {loading ? (
        <div className="card p-6 text-center text-gray-600">Loading…</div>
      ) : (
        <FiguresGrid
          figures={figures ?? []}
          onAdd={(f) => { setActiveFigure(f); setEditOwnedId(null); }}
          onEditOwned={(ownedId, f) => { setActiveFigure(f); setEditOwnedId(ownedId); }}
          onOpenWish={(f) => setWishFigure(f)}
          onManageOwned={(f) => setManageFigure(f)}
          /* tell KPI bar which series are selected */
          onSeriesFilterChange={setSelectedSeries}
        />
      )}

      {/* Modals */}
      <PurchaseModal
        open={!!activeFigure}
        onClose={() => { setActiveFigure(null); setEditOwnedId(null); }}
        figure={activeFigure}
        ownedId={editOwnedId}
      />
      <WishModal
        open={!!wishFigure}
        onClose={() => setWishFigure(null)}
        figure={wishFigure}
      />
      <OwnedManagerModal
        open={!!manageFigure}
        onClose={() => setManageFigure(null)}
        figure={manageFigure}
        onEditOwned={(ownedId) => {
          if (!manageFigure) return;
          setActiveFigure(manageFigure);
          setEditOwnedId(ownedId);
          setManageFigure(null);
        }}
      />
    </div>
  );
}
