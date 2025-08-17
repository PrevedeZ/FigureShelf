"use client";
import { useEffect, useMemo, useState } from "react";
import { useCollection } from "./CollectionStore";
import { useCatalog } from "./catalog";
import { useCurrency, formatCents } from "./CurrencyContext";
import type { CCY } from "./types";

function asCCY(c: string): CCY {
  const ok = ["EUR", "USD", "GBP", "JPY"] as const;
  return (ok.includes(c as CCY) ? (c as CCY) : "EUR");
}

export default function DashboardSummary() {
  const { owned } = useCollection();
  const { byId } = useCatalog();
  const { toEurCents, fromEurCents, currency } = useCurrency();
  const display = asCCY(currency);

  const [dbCounts, setDbCounts] = useState({ copies: 0, unique: 0 });

  async function fetchSummary() {
    const urls = ["/api/owned/summary", "/api/owned-summary"];
    for (const url of urls) {
      try {
        const r = await fetch(url, { cache: "no-store", credentials: "include" });
        if (!r.ok) continue;
        const j = await r.json();
        if (typeof j?.copies === "number" && typeof j?.unique === "number") {
          setDbCounts({ copies: j.copies, unique: j.unique });
          return;
        }
      } catch { /* try next */ }
    }
    setDbCounts({ copies: 0, unique: 0 });
  }

  useEffect(() => { fetchSummary(); }, []);
  useEffect(() => {
    const h = () => fetchSummary();
    document.addEventListener("owned:changed", h);
    return () => document.removeEventListener("owned:changed", h);
  }, []);

  // Spend (client-side)
  const spendDispCents = useMemo(() => {
    let eur = 0;
    for (const o of owned) {
      const line = (o.pricePaidCents ?? 0) + (o.taxCents ?? 0) + (o.shippingCents ?? 0);
      eur += toEurCents(line, o.currency, o.fxPerEUR ?? undefined);
    }
    return fromEurCents(eur, display);
  }, [owned, toEurCents, fromEurCents, display]);

  // MSRP copies
  const msrpDispCents = useMemo(() => {
    let eur = 0;
    for (const o of owned) {
      const f = byId.get(o.figureId);
      if (!f) continue;
      eur += toEurCents(f.msrpCents, f.msrpCurrency as CCY, 1);
    }
    return fromEurCents(eur, display);
  }, [owned, byId, toEurCents, fromEurCents, display]);

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card label="Owned (unique)" value={String(dbCounts.unique)} />
      <Card label="Owned (copies)" value={String(dbCounts.copies)} />
      <Card label="Spend" value={formatCents(spendDispCents, display)} />
      <Card label="MSRP (copies)" value={formatCents(msrpDispCents, display)} />
    </section>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-[11px] uppercase tracking-wide text-gray-600">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
