"use client";
import Header from "../components/Header";
import FiguresGrid from "../components/FiguresGrid";
import DashboardSummary from "../components/DashboardSummary";
import PurchaseModal from "../components/PurchaseModal";
import WishModal from "../components/WishModal";
import OwnedManagerModal from "../components/OwnedManagerModal";
import { useState, useMemo } from "react";
import type { Figure } from "../components/types";
import { useCatalog } from "../components/catalog";
import { useSearchParams, useRouter } from "next/navigation";

export default function Home() {
  const [activeFigure, setActiveFigure] = useState<Figure | null>(null);
  const [editOwnedId, setEditOwnedId] = useState<string | null>(null);
  const [wishFigure, setWishFigure] = useState<Figure | null>(null);
  const [manageFigure, setManageFigure] = useState<Figure | null>(null);

  const { figures, loading } = useCatalog();
  const params = useSearchParams();
  const router = useRouter();
  const selectedSeries = params.get("series");

  const visibleFigures = useMemo(() => {
    if (!figures) return [];
    if (!selectedSeries) return figures;
    return figures.filter(f => f.series === selectedSeries);
  }, [figures, selectedSeries]);

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-6 space-y-6">
        <h1 className="text-xl font-semibold">All Figures</h1>

        <DashboardSummary />

        {/* If filtered by series via URL, show a chip with clear action */}
        {selectedSeries && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Filtered by series:</span>
            <span className="text-sm px-2 py-1 rounded-full bg-gray-100">
              {selectedSeries}
            </span>
            <button
              className="btn btn-ghost h-8"
              onClick={() => router.push("/")}
              title="Clear series filter"
            >
              Clear
            </button>
          </div>
        )}

        {loading ? (
          <div className="card p-6 text-center text-gray-600">Loading…</div>
        ) : (
          <FiguresGrid
            figures={visibleFigures}
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

        <PurchaseModal
          open={!!activeFigure}
          onClose={() => {
            setActiveFigure(null);
            setEditOwnedId(null);
          }}
          figure={activeFigure}
          ownedId={editOwnedId}
        />

        <WishModal
          open={!!wishFigure}
          onClose={() => setWishFigure(null)}
          figure={wishFigure}
        />

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
      </main>
    </>
  );
}
