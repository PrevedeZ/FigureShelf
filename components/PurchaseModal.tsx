"use client";

import { useEffect, useState } from "react";
import type { Figure, CCY } from "./types";
import { useCollection } from "./CollectionStore";
import { useCurrency } from "./CurrencyContext";

type Props = {
  open: boolean;
  onClose: () => void;
  figure: Figure | null;       // when set -> add flow
  ownedId?: string | null;     // when set -> edit existing
};

export default function PurchaseModal({ open, onClose, figure, ownedId = null }: Props) {
  const { addOwned, updateOwned } = useCollection();
  const { currency: uiCurrency } = useCurrency();

  // form state
  const [currency, setCurrency] = useState<CCY>("EUR");
  const [price, setPrice] = useState<string>("0");
  const [tax, setTax] = useState<string>("0");
  const [shipping, setShipping] = useState<string>("0");
  const [fxPerEUR, setFxPerEUR] = useState<string>(""); // optional

  // reset every time modal opens
  useEffect(() => {
    if (!open) return;
    setCurrency((uiCurrency as CCY) ?? "EUR");
    setPrice("0");
    setTax("0");
    setShipping("0");
    setFxPerEUR("");
  }, [open, uiCurrency]);

  // --- helpers (not hooks) ---
  const toCents = (v: string) => {
    const n = Number.parseFloat((v || "0").replace(",", "."));
    return Number.isFinite(n) ? Math.round(n * 100) : 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!figure) return;

    const payload = {
      currency,
      pricePaidCents: toCents(price),
      taxCents: toCents(tax),
      shippingCents: toCents(shipping),
      fxPerEUR: fxPerEUR.trim() === "" ? null : Number(fxPerEUR),
    };

    const ok = ownedId
      ? await updateOwned(ownedId, payload)
      : await addOwned(figure.id, payload);

    if (ok) onClose();
  };

  // after all hooks are declared, we can conditionally render
  if (!open || !figure) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(560px,calc(100%-2rem))]">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-base font-semibold">
              {ownedId ? "Edit Purchase" : "Add to Collection"}
            </div>
            <button className="btn btn-ghost" onClick={onClose}>✕</button>
          </div>

          <div className="text-sm text-gray-600 mb-4">{figure.name}</div>

          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
            <label className="col-span-2 sm:col-span-1">
              <span className="text-xs text-gray-600">Currency</span>
              <select
                className="field w-full"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as CCY)}
              >
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
                <option value="GBP">GBP</option>
                <option value="JPY">JPY</option>
              </select>
            </label>

            <label className="col-span-2 sm:col-span-1">
              <span className="text-xs text-gray-600">FX per 1 EUR (optional)</span>
              <input
                className="field w-full"
                placeholder="e.g. 1.07"
                value={fxPerEUR}
                onChange={(e) => setFxPerEUR(e.target.value)}
              />
            </label>

            <label>
              <span className="text-xs text-gray-600">Price</span>
              <input className="field w-full" value={price} onChange={(e) => setPrice(e.target.value)} />
            </label>

            <label>
              <span className="text-xs text-gray-600">Tax</span>
              <input className="field w-full" value={tax} onChange={(e) => setTax(e.target.value)} />
            </label>

            <label className="col-span-2 sm:col-span-1">
              <span className="text-xs text-gray-600">Shipping</span>
              <input className="field w-full" value={shipping} onChange={(e) => setShipping(e.target.value)} />
            </label>

            <div className="col-span-2 flex justify-end gap-2 mt-2">
              <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary">
                {ownedId ? "Save" : "Add"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
