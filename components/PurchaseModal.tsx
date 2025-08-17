"use client";
import { useEffect, useMemo, useState } from "react";
import { useCurrency } from "./CurrencyContext";
import { useCollection } from "./CollectionStore";
import type { Figure } from "./types";

export default function PurchaseModal({
  open,
  onClose,
  figure,
  ownedId,
}: {
  open: boolean;
  onClose: () => void;
  figure: Figure | null;
  ownedId: string | null;
}) {
  const { currency } = useCurrency();
  const { addOwned, updateOwned, ownedById } = useCollection();
  const existing = useMemo(() => (ownedId ? ownedById(ownedId) : null), [ownedId, ownedById]);

  // DECIMAL strings in current display currency (we persist cents)
  const [price, setPrice] = useState("0.00");
  const [tax, setTax] = useState("0.00");
  const [ship, setShip] = useState("0.00");
  const [store, setStore] = useState("");
  const [date, setDate] = useState("");

  function toCents(s: string): number {
    const n = Number(String(s).replace(",", "."));
    if (!isFinite(n) || n < 0) return 0;
    return Math.round(n * 100);
  }
  function fromCents(c: number): string {
    return (c / 100).toFixed(2);
  }

  useEffect(() => {
    if (!open || !figure) return;
    if (existing) {
      setPrice(fromCents(existing.pricePaidCents ?? 0));
      setTax(fromCents(existing.taxCents ?? 0));
      setShip(fromCents(existing.shippingCents ?? 0));
      setStore(existing.store ?? "");
      setDate(existing.purchasedAt ? existing.purchasedAt.slice(0, 10) : "");
    } else {
      setPrice("0.00"); setTax("0.00"); setShip("0.00"); setStore(""); setDate("");
    }
  }, [open, figure, existing]);

  if (!open || !figure) return null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      figureId: figure.id,
      currency,
      pricePaidCents: toCents(price),
      taxCents: toCents(tax),
      shippingCents: toCents(ship),
      store: store || undefined,
      purchasedAt: date ? new Date(date).toISOString() : undefined,
    };
    if (existing && ownedId) updateOwned(ownedId, payload);
    else addOwned(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(560px,calc(100%-2rem))]">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-base font-semibold">{existing ? "Edit purchase" : "Add to Owned"}</div>
            <button className="btn btn-ghost" onClick={onClose}>✕</button>
          </div>

          <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2 text-sm text-gray-600">{figure.name}</div>

            <div>
              <label className="text-xs text-gray-600">Price ({currency})</label>
              <input className="field" type="number" step="0.01" min="0" value={price} onChange={(e)=>setPrice(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-600">Tax ({currency})</label>
              <input className="field" type="number" step="0.01" min="0" value={tax} onChange={(e)=>setTax(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-600">Shipping ({currency})</label>
              <input className="field" type="number" step="0.01" min="0" value={ship} onChange={(e)=>setShip(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-600">Store</label>
              <input className="field" value={store} onChange={(e)=>setStore(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-gray-600">Purchased at</label>
              <input className="field" type="date" value={date} onChange={(e)=>setDate(e.target.value)} />
            </div>

            <div className="sm:col-span-2 flex justify-end gap-2 mt-2">
              <button className="btn btn-ghost" type="button" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" type="submit">{existing ? "Save" : "Add"}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
