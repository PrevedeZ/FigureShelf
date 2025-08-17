"use client";
import { useMemo, useState } from "react";
import { useCatalog } from "./catalog";
import { useCollection } from "./CollectionStore";
import { useCurrency, formatCents } from "./CurrencyContext";
import type { CCY, Figure } from "./types";
import PurchaseModal from "./PurchaseModal";
import OwnedManagerModal from "./OwnedManagerModal";
import WishModal from "./WishModal";

/* ---------- helpers ---------- */
function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}
function asCCY(c: string): CCY {
  const allowed = ["EUR", "USD", "GBP", "JPY"] as const;
  return (allowed.includes(c as CCY) ? (c as CCY) : "EUR");
}

/* ---------- UI atoms ---------- */
function Section({
  title, subtitle, children,
}: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        {subtitle && <div className="text-sm text-gray-600">{subtitle}</div>}
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <div className="card p-4">{children}</div>
    </section>
  );
}

/** Large circular progress with center label and X/X under it */
function BigRing({ pct, label, sub }: { pct: number; label: string; sub: string }) {
  const clamped = clamp(pct);
  return (
    <div className="flex items-center gap-4">
      <div
        className="relative w-24 h-24 rounded-full"
        style={{ background: `conic-gradient(var(--accent) ${clamped}%, #e5e7eb 0%)` }}
        aria-label={`Completion ${clamped.toFixed(0)}%`}
      >
        <div className="absolute inset-[8px] rounded-full bg-white" />
        <div className="absolute inset-0 grid place-items-center text-xl font-semibold">
          {clamped.toFixed(0)}%
        </div>
      </div>
      <div>
        <div className="text-base font-semibold">{label}</div>
        <div className="text-sm text-gray-600">{sub}</div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-[11px] uppercase tracking-wide text-gray-600">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

type Row = {
  series: string;
  catalog: number;
  unique: number;
  copies: number;
  wishlist: number;
  spendDisplayCents: number;
  pct: number;
  missingNames: string[];
};

/* ---------- DRILLDOWN PANEL ---------- */
type DrillTab = "owned" | "wishlist";
function Drawer({
  open, title, onClose, children,
}: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[40rem] bg-white shadow-xl flex flex-col">
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <div className="font-semibold">{title}</div>
          <button className="btn btn-ghost h-9" onClick={onClose}>✕</button>
        </div>
        <div className="flex-1 overflow-auto p-4">{children}</div>
      </div>
    </div>
  );
}

export default function SeriesOverview() {
  const { series, figures, byId } = useCatalog();
  const { owned, wishlist } = useCollection();
  const { toEurCents, fromEurCents, currency } = useCurrency();
  const displayCCY = asCCY(currency);

  // Drilldown state + modals used inside the drawer
  const [drillSeries, setDrillSeries] = useState<string | null>(null);
  const [drillTab, setDrillTab] = useState<DrillTab>("owned");
  const [buyFigure, setBuyFigure] = useState<Figure | null>(null);
  const [manageFigure, setManageFigure] = useState<Figure | null>(null);
  const [wishFigure, setWishFigure] = useState<Figure | null>(null);
  const [editOwnedId, setEditOwnedId] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<"name" | "pct" | "spend" | "wish">("name");

  // Build report rows and totals
  const { rows, total } = useMemo(() => {
    const figsBySeries = new Map<string, { id: string; name: string }[]>();
    for (const s of series) figsBySeries.set(s, []);
    for (const f of figures) {
      if (!figsBySeries.has(f.series)) figsBySeries.set(f.series, []);
      figsBySeries.get(f.series)!.push({ id: f.id, name: f.name });
    }

    const ownedByFigureId = new Map<string, number>();
    for (const o of owned) ownedByFigureId.set(o.figureId, (ownedByFigureId.get(o.figureId) || 0) + 1);

    const wishedFigureIds = new Set(wishlist.map(w => w.figureId));

    const out: Row[] = [];
    let tSeries = series.length;
    let tCatalog = figures.length;
    let tUnique = 0;
    let tCopies = owned.length;
    let tSpendEur = 0;

    for (const o of owned) {
      const line = (o.pricePaidCents ?? 0) + (o.taxCents ?? 0) + (o.shippingCents ?? 0);
      tSpendEur += toEurCents(line, o.currency, o.fxPerEUR);
    }
    const tSpendDisplay = fromEurCents(tSpendEur, displayCCY);

    for (const sName of series) {
      const list = figsBySeries.get(sName) || [];
      const catalog = list.length;

      const ownedUniqueIds = new Set<string>();
      const ownedCopiesInSeries: number[] = [];
      for (const f of list) {
        const copies = ownedByFigureId.get(f.id) || 0;
        if (copies > 0) ownedUniqueIds.add(f.id);
        if (copies > 0) ownedCopiesInSeries.push(copies);
      }

      const unique = ownedUniqueIds.size;
      const copies = ownedCopiesInSeries.reduce((a, b) => a + b, 0);
      const wishlistCount = [...wishedFigureIds].filter(id => {
        const fig = byId.get(id);
        return fig && fig.series === sName;
      }).length;

      let eurSpend = 0;
      for (const o of owned) {
        const f = byId.get(o.figureId);
        if (!f || f.series !== sName) continue;
        const line = (o.pricePaidCents ?? 0) + (o.taxCents ?? 0) + (o.shippingCents ?? 0);
        eurSpend += toEurCents(line, o.currency, o.fxPerEUR);
      }
      const spendDisplay = fromEurCents(eurSpend, displayCCY);
      const pct = catalog > 0 ? (unique / catalog) * 100 : 0;

      const missingNames = list
        .filter(f => !ownedUniqueIds.has(f.id))
        .map(f => f.name)
        .sort((a, b) => a.localeCompare(b));

      out.push({ series: sName, catalog, unique, copies, wishlist: wishlistCount, spendDisplayCents: spendDisplay, pct, missingNames });
      tUnique += unique;
    }

    const filtered = out.filter(r => !q.trim() || r.series.toLowerCase().includes(q.toLowerCase()));
    filtered.sort((a, b) => {
      switch (sortKey) {
        case "pct":   return b.pct - a.pct || a.series.localeCompare(b.series);
        case "spend": return b.spendDisplayCents - a.spendDisplayCents || a.series.localeCompare(b.series);
        case "wish":  return b.wishlist - a.wishlist || a.series.localeCompare(b.series);
        case "name":
        default:      return a.series.localeCompare(b.series);
      }
    });

    return {
      rows: filtered,
      total: { series: tSeries, catalog: tCatalog, unique: tUnique, copies: tCopies, spendDisplayCents: tSpendDisplay },
    };
  }, [series, figures, byId, owned, wishlist, q, sortKey, toEurCents, fromEurCents, displayCCY]);

  // Build drilldown data for the selected series
  const { ownedList, wishList } = useMemo(() => {
    if (!drillSeries) return { ownedList: [], wishList: [] as Figure[] };

    // Owned aggregation per figure within the series
    const agg = new Map<string, { qty: number; eurSpend: number }>();
    for (const o of owned) {
      const f = byId.get(o.figureId);
      if (!f || f.series !== drillSeries) continue;
      const rec = agg.get(f.id) ?? { qty: 0, eurSpend: 0 };
      const line = (o.pricePaidCents ?? 0) + (o.taxCents ?? 0) + (o.shippingCents ?? 0);
      rec.qty += 1;
      rec.eurSpend += toEurCents(line, o.currency, o.fxPerEUR);
      agg.set(f.id, rec);
    }
    const ownedList = [...agg.entries()]
      .map(([figureId, v]) => {
        const f = byId.get(figureId)!;
        return { figure: f, qty: v.qty, spendDisp: fromEurCents(v.eurSpend, displayCCY) };
      })
      .sort((a, b) => a.figure.name.localeCompare(b.figure.name));

    // Wishlist flat list for the series (unique)
    const wishIds = new Set<string>();
    const wishList: Figure[] = [];
    for (const w of wishlist) {
      const f = byId.get(w.figureId);
      if (!f || f.series !== drillSeries) continue;
      if (wishIds.has(f.id)) continue;
      wishIds.add(f.id);
      wishList.push(f);
    }
    wishList.sort((a, b) => a.name.localeCompare(b.name));

    return { ownedList, wishList };
  }, [drillSeries, owned, wishlist, byId, toEurCents, fromEurCents, displayCCY]);

  /* ---------- render ---------- */
  return (
    <>
      <div className="space-y-6">
        {/* Section: Totals */}
        <Section title="Totals" subtitle="Overall collection KPIs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <BigRing pct={(total.unique / (total.catalog || 1)) * 100} label="Collection Completion" sub={`${total.unique}/${total.catalog} unique`} />
            <Stat label="Series" value={`${total.series}`} />
            <Stat label="Owned (copies)" value={`${total.copies}`} />
            <Stat label="Total Spend" value={formatCents(total.spendDisplayCents, displayCCY)} />
          </div>
        </Section>

        {/* Section: Controls */}
        <Section title="Filters" subtitle="Find series quickly">
          <div className="flex flex-wrap items-center gap-2">
            <input
              className="field h-11 text-base w-full sm:w-80"
              placeholder="Search series…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="ml-auto flex items-center gap-2">
              <label className="text-sm text-gray-600">Sort by</label>
              <select
                className="field h-11 text-base"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as any)}
              >
                <option value="name">Name (A–Z)</option>
                <option value="pct">Completion %</option>
                <option value="spend">Spend</option>
                <option value="wish">Wishlist</option>
              </select>
            </div>
          </div>
        </Section>

        {/* Section: Per-series cards */}
        <Section title="Completion by Series" subtitle="Progress and quick actions">
          {rows.length === 0 ? (
            <div className="p-6 text-center text-gray-600">No series match your search.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {rows.map((r) => (
                <div key={r.series} className="card p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="text-base font-semibold">{r.series}</div>
                    <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                      Catalog: {r.catalog}
                    </span>
                  </div>

                  <BigRing pct={r.pct} label="Completion" sub={`${r.unique}/${r.catalog} unique`} />

                  {/* KPIs are now buttons for drilldowns */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      className="card p-4 text-left hover:bg-gray-50"
                      onClick={() => { setDrillSeries(r.series); setDrillTab("owned"); }}
                    >
                      <div className="text-[11px] uppercase tracking-wide text-gray-600">Owned (copies)</div>
                      <div className="mt-1 text-2xl font-semibold">{r.copies}</div>
                    </button>

                    <button
                      className="card p-4 text-left hover:bg-gray-50"
                      onClick={() => { setDrillSeries(r.series); setDrillTab("wishlist"); }}
                    >
                      <div className="text-[11px] uppercase tracking-wide text-gray-600">Wishlist</div>
                      <div className="mt-1 text-2xl font-semibold">{r.wishlist}</div>
                    </button>

                    <Stat label="Spend" value={formatCents(r.spendDisplayCents, displayCCY)} />
                  </div>

                  {/* Missing preview stays as helpful context */}
                  {r.missingNames.length > 0 ? (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">Missing</div>
                      <div className="flex flex-wrap gap-1">
                        {r.missingNames.slice(0, 3).map(name => (
                          <span key={name} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                            {name}
                          </span>
                        ))}
                        {r.missingNames.length > 3 && (
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                            +{r.missingNames.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-green-700">Complete set collected 🎉</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Drilldown Drawer */}
      <Drawer
        open={!!drillSeries}
        title={drillSeries ? `Series · ${drillSeries}` : ""}
        onClose={() => setDrillSeries(null)}
      >
        {/* Tabs */}
        <div className="mb-3 border-b border-[var(--border)]">
          <div className="flex gap-3">
            <button
              className={`px-4 py-2 -mb-px border-b-2 text-sm ${
                drillTab === "owned" ? "border-[var(--accent)] font-semibold" : "border-transparent text-gray-600"
              }`}
              onClick={() => setDrillTab("owned")}
            >
              Owned
            </button>
            <button
              className={`px-4 py-2 -mb-px border-b-2 text-sm ${
                drillTab === "wishlist" ? "border-[var(--accent)] font-semibold" : "border-transparent text-gray-600"
              }`}
              onClick={() => setDrillTab("wishlist")}
            >
              Wishlist
            </button>
          </div>
        </div>

        {/* Owned list */}
        {drillTab === "owned" && (
          ownedList.length === 0 ? (
            <div className="card p-6 text-center text-gray-600">No owned figures yet.</div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {ownedList.map(({ figure: f, qty, spendDisp }) => (
                <div key={f.id} className="card p-3 flex gap-3">
                  <img src={f.image} alt={f.name} className="w-20 h-20 object-cover rounded-md border border-[var(--border)]" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{f.name}</div>
                    <div className="text-sm text-gray-600">
                      Qty: <span className="font-medium">{qty}</span>
                      {" · "}
                      Spend: <span className="font-medium">{formatCents(spendDisp, displayCCY)}</span>
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button className="btn btn-ghost h-9" onClick={() => setManageFigure(f)}>Manage</button>
                      <button className="btn btn-primary h-9" onClick={() => { setBuyFigure(f); setEditOwnedId(null); }}>Add another</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Wishlist list */}
        {drillTab === "wishlist" && (
          wishList.length === 0 ? (
            <div className="card p-6 text-center text-gray-600">No wishlist entries for this series.</div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {wishList.map((f) => (
                <div key={f.id} className="card p-3 flex gap-3">
                  <img src={f.image} alt={f.name} className="w-20 h-20 object-cover rounded-md border border-[var(--border)]" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{f.name}</div>
                    <div className="mt-2 flex gap-2">
                      <button className="btn btn-primary h-9" onClick={() => { setBuyFigure(f); setEditOwnedId(null); }}>Purchase</button>
                      <button className="btn btn-ghost h-9" onClick={() => setWishFigure(f)}>Edit wish</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </Drawer>

      {/* Modals used by the drilldown actions */}
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
