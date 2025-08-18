"use client";
import Image from "next/image";
import { useCollection } from "./CollectionStore";
import { useCurrency, formatCents } from "./CurrencyContext";
import type { Figure } from "./types";

type Props = {
  fig: Figure;
  onAdd: (f: Figure) => void;
  onEditOwned: (ownedId: string, f: Figure) => void;
  /** you call this from FiguresGrid – we keep both names */
  onWishlist?: () => void;
  onOpenWish?: (f: Figure) => void;
  onManageOwned: (f: Figure) => void;
};

export default function FigureCard({
  fig,
  onAdd,
  onEditOwned,
  onWishlist,
  onOpenWish,
  onManageOwned,
}: Props) {
  const { convert, currency } = useCurrency();
  const { isWished, wishFor, ownedCountForFigure, removeWish } = useCollection();

  const msrp = convert(fig.msrpCents, fig.msrpCurrency, currency);
  const ownedCount = ownedCountForFigure(fig.id);
  const wished = isWished(fig.id);
  const wish = wishFor(fig.id);

  const triggerWish = () => {
    if (onWishlist) onWishlist();
    else if (onOpenWish) onOpenWish(fig);
  };

  return (
    <div className="card overflow-hidden">
      <div className="relative h-64">
        <Image src={fig.image} alt={fig.name} fill className="object-cover" />
        <div className="absolute left-2 top-2 flex gap-2">
          <span className="badge">{fig.series}</span>
          {fig.releaseType && <span className="badge">{fig.releaseType}</span>}
          {ownedCount > 0 && <span className="badge">Owned ×{ownedCount}</span>}
          {!ownedCount && wished && <span className="badge">Wish</span>}
          {ownedCount && wished && !wish?.wantAnother && <span className="badge">Wish (Owned)</span>}
        </div>
      </div>

      <div className="p-3 space-y-1">
        <div className="font-medium">{fig.name}</div>
        <div className="text-sm text-gray-600">
          {(fig.characterBase ?? fig.character)}
          {fig.variant ? ` (${fig.variant})` : ""} · {fig.releaseYear}
        </div>
        <div className="text-sm text-gray-800">{formatCents(msrp, currency)}</div>

        <div className="mt-2 flex gap-2">
          <button className="btn btn-primary" onClick={() => onAdd(fig)}>{ownedCount ? "Add another" : "Add"}</button>
          {wished
            ? <button className="btn btn-ghost" onClick={() => removeWish(fig.id)}>Remove wish</button>
            : <button className="btn btn-ghost" onClick={triggerWish}>Wishlist</button>}
          {ownedCount > 0 && (
            <button className="btn btn-ghost" onClick={() => onManageOwned(fig)}>Manage</button>
          )}
        </div>
      </div>
    </div>
  );
}
