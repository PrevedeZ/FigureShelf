"use client";

import { useMemo, useState } from "react";
import FiguresGrid from "./FiguresGrid";
import PurchaseModal from "./PurchaseModal";
import WishModal from "./WishModal";
import OwnedManagerModal from "./OwnedManagerModal";
import { useCatalog } from "./catalog";
import type { Figure as AppFigure } from "./types";
import { toAppFigures } from "./figureAdapter";

// slug helper that matches /series/[slug]
function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function SeriesClient({ slug }: { slug: string }) {
  const { figures, loading } = useCatalog();

  // keep only figures that belong to this series slug
  const seriesFigures: AppFigure[] = useMemo(() => {
    const raw = (figures ?? []).filter((f: any) => slugify(f.series) === slug);
    return toAppFigures(raw);
  }, [figures, slug]);

  // modal state
  const [activeFigure, setActiveFigure] = useState<AppFigure | null>(null);
  const [editOwnedId, setEditOwnedId] = useState<string | null>(null);
  const [wishFigure, setWishFigure] = useState<AppFigure | null>(null);
  const [manageFigure, setManageFigure] = useState<AppFigure | null>(null);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Series</h1>

      {loading ? (
        <div className="card p-6 text-center text-gray-600">Loading…</div>
      ) : (
        <FiguresGrid
          figures={seriesFigures}
          onAdd={(f) => {
            setActiveFigure(f);
            setEditOwnedId(null);
          }}
          onEditOwned={(ownedId, f) => {
            setActiveFigure(f);
            setEditOwnedId(ownedId);
          }}
          onOpenWish={(f) => setWishFigure(f)}
          onManageOwned={(f) => setManageFigure(f)}
        />
      )}

      {/* Modals */}
      <PurchaseModal
        open={!!activeFigure}
        onClose={() => {
          setActiveFigure(null);
          setEditOwnedId(null);
        }}
        figure={activeFigure}
        ownedId={editOwnedId}
      />

      <WishModal open={!!wishFigure} onClose={() => setWishFigure(null)} figure={wishFigure} />

      <OwnedManagerModal
        open={!!manageFigure}
        onClose={() => setManageFigure(null)}
        figure={manageFigure}
        onEditOwned={(ownedId) => {
          if (!manageFigure) return;
          setActiveFigure(manageFigure);
          setEditOwnedId(ownedId);
          setManageFigure(null);
        }}
      />
    </div>
  );
}
