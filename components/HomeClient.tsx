// components/HomeClient.tsx
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import FiguresGrid from "./FiguresGrid";
import PurchaseModal from "./PurchaseModal";
import WishModal from "./WishModal";
import OwnedManagerModal from "./OwnedManagerModal";
import { useCatalog } from "./catalog";
import { useCollection } from "./CollectionStore";
import { useCurrency, formatCents } from "./CurrencyContext";
import type { CCY, Figure } from "./types";
import { toAppFigures } from "./figureAdapter";

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

/* ---------- KPI bar (DB when unfiltered; client when filtered) ---------- */
function KpiBar({ selectedSeries }: { selectedSeries: string[] }) {
  const { owned } = useCollection();
  const { byId } = useCatalog();
  const { toEurCents, fromEurCents, currency } = useCurrency();
  const display = asCCY(currency);

  const [dbCounts, setDbCounts] = useState<{ copies: number; unique: number }>({ copies: 0, unique: 0 });

  const fetchDbSummary = useCallback(async () => {
    try {
      const urls = ["/api/owned/summary", "/api/owned-summary"];
      for (const url of urls) {
        const r = await fetch(url, { cache: "no-store", credentials: "include" });
        if (!r.ok) continue;
        const j = await r.json();
        if (typeof j?.copies === "number" && typeof j?.unique === "number") {
          setDbCounts({ copies: j.copies, unique: j.unique });
          return;
        }
      }
    } catch {
      // ignore; we'll fall back to client calc if needed
    }
  }, []);

  // Initial fetch ONLY when no filters
  useEffect(() => {
    if (selectedSeries.length === 0) fetchDbSummary();
  }, [selectedSeries.length, fetchDbSummary]);

  // Realtime: when collection changes, re-fetch server totals if unfiltered
  useEffect(() => {
    const onOwnedChanged = () => {
      if (selectedSeries.length === 0) fetchDbSummary();
    };
    document.addEventListener("owned:changed", onOwnedChanged);
    return () => document.removeEventListener("owned:changed", onOwnedChanged);
  }, [selectedSeries.length, fetchDbSummary]);

  // Always compute client-side numbers (used when filtered, and as fallback)
  const clientAgg = useMemo(() => {
    const filter = selectedSeries.length ? new Set(selectedSeries) : null;

    let copies = 0;
    const uniqueSet = new Set<string>();
    let eurSpend = 0;

    for (const o of owned) {
      const f = byId.get(o.figureId);
      if (!f) continue;
      if (filter && !filter.has(f.series)) continue;

      // First instance → unique; subsequent instances → copies
      if (!uniqueSet.has(f.id)) uniqueSet.add(f.id);
      else copies += 1;

      const line = (o.pricePaidCents ?? 0) + (o.taxCents ?? 0) + (o.shippingCents ?? 0);
      eurSpend += toEurCents(line, o.currency, o.fxPerEUR ?? undefined);
    }

    return {
      unique: uniqueSet.size,
      copies,
      spendDisplayCents: fromEurCents(eurSpend, display),
    };
  }, [owned, byId, selectedSeries, toEurCents, fromEurCents, display]);

  // Pick source: DB when unfiltered, client when filtered
  const useDb = selectedSeries.length === 0;
  const unique = useDb ? dbCounts.unique : clientAgg.unique;
  const copies = useDb ? dbCounts.copies : clientAgg.copies;
  const spendDisplayCents = clientAgg.spendDisplayCents; // spend is fine client-side

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
  const { figures: rawFigures, loading } = useCatalog();
  const figures: Figure[] = useMemo(() => toAppFigures(rawFigures ?? []), [rawFigures]);

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

      {/* KPIs that follow the grid’s series filter */}
      <KpiBar selectedSeries={selectedSeries} />

      {loading ? (
        <div className="card p-6 text-center text-gray-600">Loading…</div>
      ) : (
        <FiguresGrid
          figures={figures}
          onAdd={(f) => { setActiveFigure(f); setEditOwnedId(null); }}
          onEditOwned={(ownedId, f) => { setActiveFigure(f); setEditOwnedId(ownedId); }}
          onOpenWish={(f) => setWishFigure(f)}
          onManageOwned={(f) => setManageFigure(f)}
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
      <WishModal open={!!wishFigure} onClose={() => setWishFigure(null)} figure={wishFigure} />
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
