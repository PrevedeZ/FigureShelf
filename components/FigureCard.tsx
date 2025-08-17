"use client";
import Image from "next/image";
import type { Figure } from "./types";
import { useCurrency, formatCents } from "./CurrencyContext";
import { useCollection } from "./CollectionStore";

export default function FigureCard({
  fig,
  onAdd,
  onEditOwned,
  onWishlist,
  onManageOwned,
}: {
  fig: Figure;
  onAdd: (f: Figure) => void;
  onEditOwned: (ownedId: string, fig: Figure) => void;
  onWishlist: () => void;
  onManageOwned: (f: Figure) => void;
}) {
  const { convert, currency } = useCurrency();
  const { ownedCountForFigure, isWished, wishFor, sellOne, removeWish } = useCollection();

  const msrpInDisplay = convert(fig.msrpCents, fig.msrpCurrency, currency);
  const count = ownedCountForFigure(fig.id);
  const hasOwned = count > 0;
  const wished = isWished(fig.id);
  const wish = wishFor(fig.id);

  return (
    <div className="card overflow-hidden flex flex-col">
      <div className="relative aspect-[4/5]">
        <Image src={fig.image} alt={fig.name} fill className="object-cover" />
        <div className="absolute left-2 top-2 badge">{fig.series}</div>
        {fig.releaseType && <div className="absolute left-2 bottom-2 badge">{fig.releaseType}</div>}
        {hasOwned && <div className="absolute right-2 top-2 badge">Owned ×{count}</div>}
        {!hasOwned && wished && <div className="absolute right-2 top-2 badge">Wish</div>}
        {hasOwned && wished && !wish?.wantAnother && <div className="absolute right-2 bottom-2 badge">Wish (Owned)</div>}
      </div>

      <div className="p-3 flex flex-col gap-2">
        <div className="w-full">
          <h3 className="font-semibold leading-snug text-center">{fig.name}</h3>
          <p className="text-sm text-gray-600 text-center">
            {fig.characterBase ?? fig.character}
            {fig.variant ? ` (${fig.variant})` : ""} · {fig.releaseYear}
          </p>
        </div>
        <div className="text-sm text-gray-700 text-center">MSRP {formatCents(msrpInDisplay, currency)}</div>

        {hasOwned && (
          <div className="mt-1 flex items-center justify-center gap-2">
            <button className="btn btn-ghost" onClick={() => sellOne(fig.id)} aria-label="Sell one">−</button>
            <div className="px-3 py-1 rounded-md border border-[var(--border)] min-w-10 text-center">{count}</div>
            <button className="btn btn-ghost" onClick={() => onAdd(fig)} aria-label="Add another">+</button>
          </div>
        )}

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button className="btn btn-primary" onClick={() => onAdd(fig)}>
            {hasOwned ? "Add another" : "Add to Owned"}
          </button>

          {hasOwned ? (
            <button className="btn btn-ghost" onClick={() => onManageOwned(fig)}>Manage</button>
          ) : wished ? (
            <button className="btn btn-ghost" onClick={() => removeWish(fig.id)}>Remove wish</button>
          ) : (
            <button className="btn btn-ghost" onClick={onWishlist}>Wishlist</button>
          )}
        </div>
      </div>
    </div>
  );
}
