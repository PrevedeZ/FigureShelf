// components/FigureCard.tsx
"use client";
import Image from "next/image";
import { useCollection } from "./CollectionStore";
import { useCurrency, formatCents } from "./CurrencyContext";
import type { Figure } from "./types";

type Props = {
  fig: Figure;
  onAdd: (f: Figure) => void;
  onEditOwned: (ownedId: string, f: Figure) => void; // kept for API parity; unused here
  onWishlist?: () => void;
  onOpenWish?: (f: Figure) => void;
  onManageOwned: (f: Figure) => void;
};

export default function FigureCard({
  fig,
  onAdd,
  onEditOwned, // eslint-disable-line @typescript-eslint/no-unused-vars
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
    <div className="card">
      {/* Keep overflow only on image area; prevents clipping the buttons */}
      <div className="relative h-64 overflow-hidden rounded-t-lg">
        <Image src={fig.image} alt={fig.name} fill className="object-cover" />
        <div className="absolute left-2 top-2 flex gap-2">
          <span className="badge">{fig.series}</span>
          {fig.releaseType && <span className="badge">{fig.releaseType}</span>}
          {ownedCount > 0 && <span className="badge">Owned ×{ownedCount}</span>}
          {!ownedCount && wished && <span className="badge">Wish</span>}
          {ownedCount && wished && !wish?.wantAnother && (
            <span className="badge">Wish (Owned)</span>
          )}
        </div>
      </div>

      <div className="p-3 space-y-1">
        <div className="font-medium truncate" title={fig.name}>
          {fig.name}
        </div>
        <div className="text-sm text-gray-600 truncate">
          {(fig.characterBase ?? fig.character)}
          {fig.variant ? ` (${fig.variant})` : ""} · {fig.releaseYear}
        </div>
        <div className="text-sm text-gray-800">
          {formatCents(msrp, currency)}
        </div>

        {/* Stable 3-button action row; wraps nicely on narrow cards */}
        <div className="mt-2 flex flex-wrap gap-2 min-h-[44px]">
          {/* 1) Add / Add another */}
          <button
            className="btn btn-primary flex-1 min-w-[120px]"
            onClick={() => onAdd(fig)}
            title={ownedCount ? "Add another copy" : "Add to collection"}
          >
            {ownedCount ? "Add another" : "Add"}
          </button>

          {/* 2) Wishlist / Remove wish */}
          {wished ? (
            <button
              className="btn btn-ghost flex-1 min-w-[120px]"
              onClick={() => removeWish(fig.id)}
              title="Remove from wishlist"
            >
              Remove wish
            </button>
          ) : (
            <button
              className="btn btn-ghost flex-1 min-w-[120px]"
              onClick={triggerWish}
              title="Add to wishlist"
            >
              Wishlist
            </button>
          )}

          {/* 3) Manage — always visible, disabled when nothing to manage */}
          <button
            className={`btn btn-ghost flex-1 min-w-[120px] ${
              ownedCount === 0 ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={ownedCount === 0}
            onClick={() => ownedCount > 0 && onManageOwned(fig)}
            title={ownedCount === 0 ? "You don't own this yet" : "Manage owned copies"}
          >
            Manage
          </button>
        </div>
      </div>
    </div>
  );
}
