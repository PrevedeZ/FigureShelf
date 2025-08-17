"use client";
import { useMemo } from "react";
import { useCollection } from "./CollectionStore";
import type { Figure } from "./types";
import { useCurrency, formatCents } from "./CurrencyContext";

export default function OwnedManagerModal({
  open,
  onClose,
  figure,
  onEditOwned,
}: {
  open: boolean;
  onClose: () => void;
  figure: Figure | null;
  onEditOwned: (ownedId: string) => void;
}) {
  const { ownedByFigure, sellOne } = useCollection();
  const { currency, convert } = useCurrency();

  const list = useMemo(() => (figure ? ownedByFigure(figure.id) : []), [figure, ownedByFigure]);
  if (!open || !figure) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(720px,calc(100%-2rem))]">
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-base font-semibold">Manage purchases — {figure.name}</div>
            <button className="btn btn-ghost" onClick={onClose}>✕</button>
          </div>

          {list.length === 0 ? (
            <div className="text-gray-600">No purchases yet.</div>
          ) : (
            <div className="border border-[var(--border)] rounded-lg overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:text-xs [&>th]:uppercase [&>th]:text-gray-500">
                    <th>Date</th><th>Store</th><th>Total</th><th>Currency</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2">
                  {list.map((o) => {
                    const totalCents = (o.pricePaidCents ?? 0) + (o.taxCents ?? 0) + (o.shippingCents ?? 0);
                    const display = convert(totalCents, o.currency, currency);
                    return (
                      <tr key={o.id} className="border-t border-[var(--border)]">
                        <td>{o.purchasedAt ? new Date(o.purchasedAt).toLocaleDateString() : "—"}</td>
                        <td>{o.store ?? "—"}</td>
                        <td>{formatCents(display, currency)}</td>
                        <td>{o.currency}</td>
                        <td className="whitespace-nowrap">
                          <div className="flex gap-2">
                            <button className="btn btn-ghost" onClick={() => onEditOwned(o.id)}>Edit</button>
                            <button className="btn btn-ghost" onClick={() => sellOne(figure.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
