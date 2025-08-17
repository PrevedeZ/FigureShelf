"use client";
import Header from "../../../components/Header";
import FiguresGrid from "../../../components/FiguresGrid";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useCollection } from "../../../components/CollectionStore";
import { useCurrency, formatCents } from "../../../components/CurrencyContext";
import PurchaseModal from "../../../components/PurchaseModal";
import WishModal from "../../../components/WishModal";
import OwnedManagerModal from "../../../components/OwnedManagerModal";
import type { Figure } from "../../../components/types";
import { useCatalog } from "../../../components/catalog";

function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
function Ring({ progress }: { progress: number }) {
  const pct = Math.max(0, Math.min(100, progress));
  const bg = `conic-gradient(var(--accent) ${pct * 3.6}deg, #e5e7eb 0deg)`;
  return (
    <div className="relative h-14 w-14">
      <div className="h-14 w-14 rounded-full" style={{ background: bg }} />
      <div className="absolute inset-1 rounded-full bg-white border border-[var(--border)] flex items-center justify-center text-sm font-semibold">{pct}%</div>
    </div>
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

export default function SeriesListPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const { figures: allFigures, loading } = useCatalog();

  const seriesName = useMemo(() => {
    if (!allFigures) return null;
    const all = Array.from(new Set(allFigures.map((f) => f.series)));
    const map = new Map(all.map((s) => [slugify(s), s]));
    return map.get(String(slug));
  }, [slug, allFigures]);

  const filtered = useMemo(() => {
    if (!allFigures) return [];
    if (!seriesName) return allFigures;
    return allFigures.filter((f) => f.series === seriesName);
  }, [seriesName, allFigures]);

  const { owned } = useCollection();
  const { toEurCents, fromEurCents, currency } = useCurrency();

  const { catalog, uniqueOwned, copies, spend, progress } = useMemo(() => {
    const ids = new Set(filtered.map((f) => f.id));
    const catalog = filtered.length;
    const ownedInSeries = owned.filter((o) => ids.has(o.figureId));
    const uniqueOwned = new Set(ownedInSeries.map((o) => o.figureId)).size;
    const copies = ownedInSeries.length;
    let eur = 0;
    for (const o of ownedInSeries) {
      const sum = (o.pricePaidCents ?? 0) + (o.taxCents ?? 0) + (o.shippingCents ?? 0);
      eur += toEurCents(sum, o.currency, o.fxPerEUR);
    }
    const progress = catalog ? Math.round((uniqueOwned / catalog) * 100) : 0;
    return { catalog, uniqueOwned, copies, spend: fromEurCents(eur, currency), progress };
  }, [owned, filtered, toEurCents, fromEurCents, currency]);

  const [activeFigure, setActiveFigure] = useState<Figure | null>(null);
  const [editOwnedId, setEditOwnedId] = useState<string | null>(null);
  const [wishFigure, setWishFigure] = useState<Figure | null>(null);
  const [manageFigure, setManageFigure] = useState<Figure | null>(null);

  return (
    <>
      <Header />
      <div className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        <h1 className="text-xl font-semibold">{seriesName ?? "All Figures"}</h1>

        {seriesName && (
          <div className="card p-4 flex items-center gap-4">
            <Ring progress={progress} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
              <Stat label="Catalog" value={catalog.toString()} />
              <Stat label="Owned (unique)" value={uniqueOwned.toString()} />
              <Stat label="Owned (copies)" value={copies.toString()} />
              <Stat label="Spend" value={formatCents(spend, currency)} />
            </div>
          </div>
        )}

        {loading ? (
          <div className="card p-6 text-center text-gray-600">Loading…</div>
        ) : (
          <FiguresGrid
            figures={filtered}
            onAdd={(f) => { setActiveFigure(f); setEditOwnedId(null); }}
            onEditOwned={(ownedId, f) => { setActiveFigure(f); setEditOwnedId(ownedId); }}
            onOpenWish={(f) => setWishFigure(f)}
            onManageOwned={(f) => setManageFigure(f)}
          />
        )}

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
    </>
  );
}
