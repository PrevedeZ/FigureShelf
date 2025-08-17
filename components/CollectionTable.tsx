"use client";
import { useMemo, useState } from "react";
import { useCollection } from "./CollectionStore";
import { formatCents, useCurrency } from "./CurrencyContext";
import type { Figure } from "./types";
import { useCatalog } from "./catalog";

type Row = {
  ownedId: string;
  fig: Figure;
  paidCents: number;
  taxCents: number;
  shipCents: number;
  currency: "EUR"|"USD"|"GBP"|"JPY";
  eurCents: number;
  displayCents: number;
  retailer?: string;
  date?: string;
  condition?: string;
  notes?: string;
};

export default function CollectionTable({ onEdit }:{ onEdit:(ownedId:string, fig:Figure)=>void }) {
  const { figures } = useCatalog();
  const { owned, removeOwned } = useCollection();
  const { toEurCents, fromEurCents, currency } = useCurrency();
  const [sort, setSort] = useState<{key: keyof Row | "name"; dir: "asc"|"desc"}>({ key: "date", dir: "desc" });

  const rows: Row[] = useMemo(() => {
    if (!figures) return [];
    return owned.map(o => {
      const fig = figures.find(f => f.id === o.figureId);
      if (!fig) return null as any;
      const sum = (o.pricePaidCents ?? 0) + (o.taxCents ?? 0) + (o.shippingCents ?? 0);
      const eur = toEurCents(sum, o.currency, o.fxPerEUR);
      const display = fromEurCents(eur, currency);
      return {
        ownedId: o.id,
        fig,
        paidCents: o.pricePaidCents ?? 0,
        taxCents: o.taxCents ?? 0,
        shipCents: o.shippingCents ?? 0,
        currency: o.currency,
        eurCents: eur,
        displayCents: display,
        retailer: o.retailer,
        date: o.orderDate ?? o.createdAt.slice(0,10),
        condition: o.condition,
        notes: o.notes,
      };
    }).filter(Boolean);
  }, [figures, owned, toEurCents, fromEurCents, currency]);

  const sorted = useMemo(() => {
    const list = rows.slice();
    const dir = sort.dir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      const k = sort.key;
      if (k === "name") return a.fig.name.localeCompare(b.fig.name) * dir;
      const av = (a[k] as any) ?? 0;
      const bv = (b[k] as any) ?? 0;
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dir;
      return (av - bv) * dir;
    });
    return list;
  }, [rows, sort]);

  const set = (key: typeof sort.key) => setSort(s => ({ key, dir: s.key === key && s.dir === "asc" ? "desc" : "asc" }));

  const exportCsv = () => {
    const header = [
      "Owned ID","Name","Character","Paid","Tax","Shipping","Item Currency",
      "Total (EUR)","Total ("+currency+")","Retailer","Order Date","Condition","Notes"
    ];
    const lines = [header.join(",")];
    for (const r of sorted) {
      lines.push([
        q(r.ownedId), q(r.fig.name), q(r.fig.character),
        q(formatCents(r.paidCents, r.currency)), q(formatCents(r.taxCents, r.currency)), q(formatCents(r.shipCents, r.currency)),
        r.currency,
        q(formatCents(r.eurCents, "EUR" as any)), q(formatCents(r.displayCents, currency as any)),
        q(r.retailer ?? ""), q(r.date ?? ""), q(r.condition ?? ""), q(r.notes ?? "")
      ].join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "my-collection.csv"; a.click();
    URL.revokeObjectURL(url);
  };
  const q = (s: string) => `"${(s ?? "").replace(/"/g, '""')}"`;

  if (!figures) return <div className="card p-6 text-center text-gray-600">Loading…</div>;

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">My Collection</h2>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={exportCsv}>Export CSV</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:text-xs [&>th]:uppercase [&>th]:text-gray-500">
              <th onClick={()=>set("name")} className="cursor-pointer">Figure</th>
              <th onClick={()=>set("paidCents")} className="cursor-pointer">Paid</th>
              <th onClick={()=>set("taxCents")} className="cursor-pointer">Tax</th>
              <th onClick={()=>set("shipCents")} className="cursor-pointer">Shipping</th>
              <th>Item CCY</th>
              <th onClick={()=>set("eurCents")} className="cursor-pointer">Total (EUR)</th>
              <th onClick={()=>set("displayCents")} className="cursor-pointer">Total ({currency})</th>
              <th onClick={()=>set("retailer")} className="cursor-pointer">Retailer</th>
              <th onClick={()=>set("date")} className="cursor-pointer">Date</th>
              <th onClick={()=>set("condition")} className="cursor-pointer">Condition</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2">
            {sorted.map(r => (
              <tr key={r.ownedId} className="border-t border-[var(--border)]">
                <td className="whitespace-nowrap">{r.fig.name}</td>
                <td>{formatCents(r.paidCents, r.currency)}</td>
                <td>{formatCents(r.taxCents, r.currency)}</td>
                <td>{formatCents(r.shipCents, r.currency)}</td>
                <td>{r.currency}</td>
                <td>{formatCents(r.eurCents, "EUR" as any)}</td>
                <td>{formatCents(r.displayCents, currency as any)}</td>
                <td>{r.retailer ?? "—"}</td>
                <td>{r.date ?? "—"}</td>
                <td className="whitespace-nowrap">{r.condition ?? "—"}</td>
                <td className="flex gap-2">
                  <button className="btn btn-ghost" onClick={()=>onEdit(r.ownedId, r.fig)}>Edit</button>
                  <button className="btn btn-ghost" onClick={()=>removeOwned(r.ownedId)}>Sell this copy</button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={11} className="text-center text-gray-600 py-10">No owned items yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
