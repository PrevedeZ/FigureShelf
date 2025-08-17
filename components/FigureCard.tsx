"use client";
import type { Figure, CCY } from "./types";
import { useCollection } from "./CollectionStore";
import { formatCents } from "./CurrencyContext";

export default function FigureCard({ fig }: { fig: Figure }) {
  const { addOwned, removeOneOwnedByFigure, addWish, ownedIdsByFigure } = useCollection();
  const qty = ownedIdsByFigure(fig.id).length;

  return (
    <div className="card overflow-hidden">
      <div className="relative">
        <img src={fig.image} alt={fig.name} className="w-full h-72 object-cover" />
        <div className="absolute top-2 left-2 text-xs px-2 py-1 rounded-full bg-white/90">
          {fig.series}
        </div>
        {qty > 0 && (
          <div className="absolute top-2 right-2 text-xs px-2 py-1 rounded-full bg-white/90">
            Owned ×{qty}
          </div>
        )}
      </div>

      <div className="p-3">
        <div className="text-center font-semibold">{fig.name}</div>
        <div className="text-center text-sm text-gray-600">
          {fig.character} · {fig.releaseYear}
        </div>
        <div className="mt-1 text-center text-sm">
          MSRP {formatCents(fig.msrpCents, fig.msrpCurrency as CCY)}
        </div>

        <div className="mt-3 flex items-center justify-center gap-2">
          <button className="btn btn-ghost h-9" disabled={qty === 0}
                  onClick={() => removeOneOwnedByFigure(fig.id)}>−</button>
          <span className="px-3">{qty}</span>
          <button className="btn btn-ghost h-9" onClick={() => addOwned(fig.id)}>+</button>
        </div>

        <div className="mt-2 flex gap-2">
          <button className="btn btn-primary h-9 flex-1" onClick={() => addOwned(fig.id)}>
            Add another
          </button>
          <button className="btn btn-ghost h-9" onClick={() => addWish(fig.id)}>
            Wishlist
          </button>
        </div>
      </div>
    </div>
  );
}
