"use client";

import { useMemo, useState } from "react";
import type { Figure, CCY } from "./types";
import { useCollection } from "./CollectionStore";
import { useCurrency, formatCents } from "./CurrencyContext";

type Props = {
  open: boolean;
  onClose: () => void;
  figure: Figure | null;
  /** Called when user clicks “Edit” on one owned row */
  onEditOwned: (ownedId: string) => void;
};

export default function OwnedManagerModal({ open, onClose, figure, onEditOwned }: Props) {
  const { owned, removeOwned } = useCollection();
  const { convert, currency } = useCurrency();
  const [busyId, setBusyId] = useState<string | null>(null);

  // All hooks first, then any conditional return
  const rows = useMemo(() => {
    if (!figure) return [];
    const list = owned.filter(o => o.figureId === figure.id);
    // most recent first
    return list.sort((a, b) => {
      const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bd - ad;
    });
  }, [owned, figure]);

  const totalDisplayCents = useMemo(() => {
    let sum = 0;
    for (const o of rows) {
      const line =
        (o.pricePaidCents ?? 0) +
        (o.taxCents ?? 0) +
        (o.shippingCents ?? 0);
      sum += convert(line, (o.currency as CCY) ?? "EUR", currency);
    }
    return sum;
  }, [rows, currency, convert]);

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this copy from your collection?")) return;
    setBusyId(id);
    const ok = await removeOwned(id);
    setBusyId(null);
    if (!ok) alert("Could not remove item.");
    // optional: auto-close when nothing left
    // if (ok && rows.length === 1) onClose();
  };

  // Only now it’s safe to bail
  if (!open || !figure) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full sm:w-[42rem] bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <div className="font-semibold">Manage · {figure.name}</div>
          <button className="btn btn-ghost h-9" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Totals */}
          <div className="card p-3 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Copies: <b>{rows.length}</b>
            </div>
            <div className="text-sm">
              Total Spend: <b>{formatCents(totalDisplayCents, currency)}</b>
            </div>
          </div>

          {/* List */}
          {rows.length === 0 ? (
            <div className="card p-6 text-center text-gray-600">
              You don’t own this figure yet.
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((o) => {
                const line =
                  (o.pricePaidCents ?? 0) +
                  (o.taxCents ?? 0) +
                  (o.shippingCents ?? 0);
                const display = convert(line, (o.currency as CCY) ?? "EUR", currency);

                return (
                  <div key={o.id} className="card p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-600">
                        {o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "—"}
                      </div>
                      <div className="text-sm">
                        Price/Tax/Ship:{" "}
                        <b>
                          {((o.pricePaidCents ?? 0) / 100).toFixed(2)} {(o.currency as CCY) ?? "EUR"}
                        </b>{" "}
                        /{" "}
                        <b>
                          {((o.taxCents ?? 0) / 100).toFixed(2)} {(o.currency as CCY) ?? "EUR"}
                        </b>{" "}
                        /{" "}
                        <b>
                          {((o.shippingCents ?? 0) / 100).toFixed(2)} {(o.currency as CCY) ?? "EUR"}
                        </b>
                        {typeof o.fxPerEUR === "number" ? (
                          <span className="text-gray-600"> · FX/€: {o.fxPerEUR}</span>
                        ) : null}
                      </div>
                      <div className="text-sm text-gray-800">
                        Display: <b>{formatCents(display, currency)}</b>
                      </div>
                      {o.note ? (
                        <div className="text-sm text-gray-600 mt-1">Note: {o.note}</div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        className="btn btn-ghost h-9"
                        onClick={() => onEditOwned(o.id)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger h-9"
                        disabled={busyId === o.id}
                        onClick={() => handleDelete(o.id)}
                      >
                        {busyId === o.id ? "Removing…" : "Delete"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer (optional actions) */}
        <div className="px-4 py-3 border-t border-[var(--border)] flex justify-end">
          <button className="btn btn-ghost h-9" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
