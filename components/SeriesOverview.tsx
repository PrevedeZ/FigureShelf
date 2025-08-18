"use client";
import { useEffect, useMemo, useState } from "react";
import { useCatalog } from "./catalog";
import { useCollection } from "./CollectionStore";
import { useCurrency, formatCents } from "./CurrencyContext";
import type { CCY, Figure as TFigure } from "./types"; // <- use FE Figure type
import PurchaseModal from "./PurchaseModal";
import OwnedManagerModal from "./OwnedManagerModal";
import WishModal from "./WishModal";

/* ---------- helpers ---------- */
function clamp(n: number, min = 0, max = 100) { return Math.max(min, Math.min(max, n)); }
function asCCY(c: string): CCY {
  const allowed = ["EUR", "USD", "GBP", "JPY"] as const;
  return (allowed.includes(c as CCY) ? (c as CCY) : "EUR");
}

/* ---------- small UI atoms ---------- */
function Section({ title, subtitle, children }:{ title:string; subtitle?:string; children:React.ReactNode }) {
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
function BigRing({ pct, label, sub }:{ pct:number; label:string; sub:string }) {
  const clamped = clamp(pct);
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-24 h-24 rounded-full"
           style={{ background: `conic-gradient(var(--accent) ${clamped}%, #e5e7eb 0%)` }}>
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
function Stat({ label, value }:{ label:string; value:string }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-[11px] uppercase tracking-wide text-gray-600">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

/* ---------- drawer ---------- */
type DrillTab = "owned" | "wishlist";
function Drawer({ open, title, onClose, children }:{
  open:boolean; title:string; onClose:()=>void; children:React.ReactNode;
}) {
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

/* ---------- lists ---------- */
function OwnedList({
  series, onManage, onAddAnother,
}: {
  series: string;
  onManage: (f: TFigure)=>void;
  onAddAnother: (f: TFigure)=>void;
}) {
  const { owned } = useCollection();
  const { byId } = useCatalog();
  const { toEurCents } = useCurrency();

  const rows = useMemo(() => {
    const agg = new Map<string, { qty: number; eurSpend: number }>();
    for (const o of owned) {
      const f = byId.get(o.figureId);
      if (!f || f.series !== series) continue;
      const line = (o.pricePaidCents ?? 0) + (o.taxCents ?? 0) + (o.shippingCents ?? 0);
      const rec = agg.get(f.id) ?? { qty: 0, eurSpend: 0 };
      rec.qty += 1;
      rec.eurSpend += toEurCents(line, o.currency, o.fxPerEUR ?? undefined);
      agg.set(f.id, rec);
    }
    return [...agg.entries()]
      // Cast catalog figure to FE type to satisfy TS
      .map(([id, v]) => ({ figure: byId.get(id)! as unknown as TFigure, qty: v.qty, spendEur: v.eurSpend }))
      .sort((a,b)=>a.figure.name.localeCompare(b.figure.name));
  }, [owned, byId, series, toEurCents]);

  if (rows.length === 0) return <div className="card p-6 text-center text-gray-600">No owned figures yet.</div>;

  return (
    <div className="grid grid-cols-1 gap-3">
      {rows.map(({ figure:f, qty, spendEur }) => (
        <div key={f.id} className="card p-3 flex gap-3">
          <img src={f.image} alt={f.name} className="w-20 h-20 object-cover rounded-md border border-[var(--border)]" />
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate">{f.name}</div>
            <div className="text-sm text-gray-600">Qty: <b>{qty}</b> · Spend (EUR): <b>{(spendEur/100).toFixed(2)}</b></div>
            <div className="mt-2 flex gap-2">
              <button className="btn btn-ghost h-9" onClick={() => onManage(f)}>Manage</button>
              <button className="btn btn-primary h-9" onClick={() => onAddAnother(f)}>Add another</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function WishList({
  series, onEditWish, onPurchase,
}: {
  series: string;
  onEditWish: (f: TFigure)=>void;
  onPurchase: (f: TFigure)=>void;
}) {
  const { wishlist } = useCollection();
  const { byId } = useCatalog();

  const list = useMemo(() => {
    const ids = new Set<string>();
    const out: TFigure[] = [];
    for (const w of wishlist) {
      const f = byId.get(w.figureId);
      if (!f || f.series !== series) continue;
      if (ids.has(f.id)) continue;
      ids.add(f.id);
      out.push(f as unknown as TFigure);
    }
    return out.sort((a,b)=>a.name.localeCompare(b.name));
  }, [wishlist, byId, series]);

  if (list.length === 0) return <div className="card p-6 text-center text-gray-600">No wishlist entries for this series.</div>;

  return (
    <div className="grid grid-cols-1 gap-3">
      {list.map((f) => (
        <div key={f.id} className="card p-3 flex gap-3">
          <img src={f.image} alt={f.name} className="w-20 h-20 object-cover rounded-md border border-[var(--border)]" />
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate">{f.name}</div>
            <div className="mt-2 flex gap-2">
              <button className="btn btn-primary h-9" onClick={() => onPurchase(f)}>Purchase</button>
              <button className="btn btn-ghost h-9" onClick={() => onEditWish(f)}>Edit wish</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- main ---------- */
type Row = {
  series: string;
  catalog: number;
  unique: number;
  copies: number;              // duplicates only
  wishlist: number;
  spendDisplayCents: number;
  pct: number;
  missingNames: string[];
};

export default function SeriesOverview() {
  const { series, figures, byId } = useCatalog();
  const { owned, wishlist } = useCollection();
  const { toEurCents, fromEurCents, currency } = useCurrency();
  const displayCCY = asCCY(currency);

  const [drillSeries, setDrillSeries] = useState<string | null>(null);
  const [drillTab, setDrillTab] = useState<"owned" | "wishlist">("owned");
  const [buyFigure, setBuyFigure] = useState<TFigure | null>(null);
  const [manageFigure, setManageFigure] = useState<TFigure | null>(null);
  const [wishFigure, setWishFigure] = useState<TFigure | null>(null);
  const [editOwnedId, setEditOwnedId] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<"name" | "pct" | "spend" | "wish">("name");

  // DB-truth for total copies (duplicates)
  const [dbOwnedCopies, setDbOwnedCopies] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/owned/count", { cache: "no-store", credentials: "include" });
        const j = await r.json().catch(() => ({ count: null }));
        if (alive) setDbOwnedCopies(typeof j.count === "number" ? j.count : null);
      } catch { if (alive) setDbOwnedCopies(null); }
    })();
    return () => { alive = false; };
  }, [owned.length]);

  const { rows, total } = useMemo(() => {
    const figsBySeries = new Map<string, { id: string; name: string }[]>();
    for (const s of series) figsBySeries.set(s, []);
    for (const f of figures) {
      if (!figsBySeries.has(f.series)) figsBySeries.set(f.series, []);
      figsBySeries.get(f.series)!.push({ id: f.id, name: f.name });
    }

    const ownedByFigureId = new Map<string, number>();
    for (const o of owned) ownedByFigureId.set(o.figureId, (ownedByFigureId.get(o.figureId) || 0) + 1);

    let tSeries = series.length;
    let tCatalog = figures.length;

    // duplicates only
    const tCopies = [...ownedByFigureId.values()].reduce((sum, c) => sum + Math.max(c - 1, 0), 0);

    let tSpendEur = 0;
    for (const o of owned) {
      const line = (o.pricePaidCents ?? 0) + (o.taxCents ?? 0) + (o.shippingCents ?? 0);
      tSpendEur += toEurCents(line, o.currency, o.fxPerEUR ?? undefined);
    }
    const tSpendDisplay = fromEurCents(tSpendEur, displayCCY);

    const wishedFigureIds = new Set(wishlist.map(w => w.figureId));

    const out: Row[] = [];
    let tUnique = 0;

    for (const sName of series) {
      const list = figsBySeries.get(sName) || [];
      const catalog = list.length;

      const ownedUniqueIds = new Set<string>();
      let dupCopiesInSeries = 0;

      for (const f of list) {
        const cnt = ownedByFigureId.get(f.id) || 0;
        if (cnt > 0) ownedUniqueIds.add(f.id);
        if (cnt > 1) dupCopiesInSeries += (cnt - 1);
      }

      const unique = ownedUniqueIds.size;
      const copies = dupCopiesInSeries;

      const wishlistCount = [...wishedFigureIds].filter(id => {
        const fig = byId.get(id);
        return fig && fig.series === sName;
      }).length;

      let eurSpend = 0;
      for (const o of owned) {
        const f = byId.get(o.figureId);
        if (!f || f.series !== sName) continue;
        const line = (o.pricePaidCents ?? 0) + (o.taxCents ?? 0) + (o.shippingCents ?? 0);
        eurSpend += toEurCents(line, o.currency, o.fxPerEUR ?? undefined);
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

  return (
    <>
      <div className="space-y-6">
        {/* Totals */}
        <Section title="Totals" subtitle="Overall collection KPIs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <BigRing pct={(total.unique / (total.catalog || 1)) * 100}
                     label="Collection Completion"
                     sub={`${total.unique}/${total.catalog} unique`} />
            <Stat label="Series" value={`${total.series}`} />
            <Stat label="Owned (copies)" value={`${dbOwnedCopies ?? total.copies}`} />
            <Stat label="Total Spend" value={formatCents(total.spendDisplayCents, asCCY(currency))} />
          </div>
        </Section>

        {/* Filters */}
        <Section title="Filters" subtitle="Find series quickly">
          <div className="flex flex-wrap items-center gap-2">
            <input className="field h-11 text-base w-full sm:w-80"
                   placeholder="Search series…"
                   value={q}
                   onChange={(e) => setQ(e.target.value)} />
            <div className="ml-auto flex items-center gap-2">
              <label className="text-sm text-gray-600">Sort by</label>
              <select className="field h-11 text-base"
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value as any)}>
                <option value="name">Name (A–Z)</option>
                <option value="pct">Completion %</option>
                <option value="spend">Spend</option>
                <option value="wish">Wishlist</option>
              </select>
            </div>
          </div>
        </Section>

        {/* Cards */}
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

                  <div className="grid grid-cols-2 gap-3">
                    <button className="card p-4 text-left hover:bg-gray-50"
                            onClick={() => { setDrillSeries(r.series); setDrillTab("owned"); }}>
                      <div className="text-[11px] uppercase tracking-wide text-gray-600">Owned (copies)</div>
                      <div className="mt-1 text-2xl font-semibold">{r.copies}</div>
                    </button>
                    <button className="card p-4 text-left hover:bg-gray-50"
                            onClick={() => { setDrillSeries(r.series); setDrillTab("wishlist"); }}>
                      <div className="text-[11px] uppercase tracking-wide text-gray-600">Wishlist</div>
                      <div className="mt-1 text-2xl font-semibold">{r.wishlist}</div>
                    </button>
                    <Stat label="Spend" value={formatCents(r.spendDisplayCents, asCCY(currency))} />
                  </div>

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

      {/* Drawer */}
      <Drawer open={!!drillSeries} title={drillSeries ? `Series · ${drillSeries}` : ""} onClose={() => setDrillSeries(null)}>
        <div className="mb-3 border-b border-[var(--border)]">
          <div className="flex gap-3">
            <button className={`px-4 py-2 -mb-px border-b-2 text-sm ${drillTab === "owned" ? "border-[var(--accent)] font-semibold" : "border-transparent text-gray-600"}`} onClick={() => setDrillTab("owned")}>Owned</button>
            <button className={`px-4 py-2 -mb-px border-b-2 text-sm ${drillTab === "wishlist" ? "border-[var(--accent)] font-semibold" : "border-transparent text-gray-600"}`} onClick={() => setDrillTab("wishlist")}>Wishlist</button>
          </div>
        </div>

        {drillTab === "owned" && (
          <OwnedList
            series={drillSeries!}
            onManage={(f)=>setManageFigure(f)}
            onAddAnother={(f)=>{ setBuyFigure(f); setEditOwnedId(null); }}
          />
        )}
        {drillTab === "wishlist" && (
          <WishList
            series={drillSeries!}
            onEditWish={(f)=>setWishFigure(f)}
            onPurchase={(f)=>{ setBuyFigure(f); setEditOwnedId(null); }}
          />
        )}
      </Drawer>

      {/* Modals */}
      <PurchaseModal open={!!buyFigure} onClose={() => { setBuyFigure(null); setEditOwnedId(null); }} figure={buyFigure} ownedId={editOwnedId} />
      <OwnedManagerModal open={!!manageFigure} onClose={() => setManageFigure(null)} figure={manageFigure} onEditOwned={(ownedId) => {
        if (!manageFigure) return;
        setBuyFigure(manageFigure);
        setEditOwnedId(ownedId);
        setManageFigure(null);
      }} />
      <WishModal open={!!wishFigure} onClose={() => setWishFigure(null)} figure={wishFigure} />
    </>
  );
}
