"use client";

import React from "react";
import { useCatalog } from "../../../components/catalog";
import { useCollection } from "../../../components/CollectionStore";

export default function CollectionPage() {
  const { figures } = useCatalog();           // all catalog figures (client cache)
  const { owned, wishlist } = useCollection(); // your collection state

  const figuresCount = figures?.length ?? 0;
  const ownedCopies = owned.length;
  const ownedUnique = new Set(owned.map(o => o.figureId)).size;
  const wishlistCount = wishlist.length;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">My Collection</h1>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Figures in Catalog" value={String(figuresCount)} />
        <Card label="Owned (unique)" value={String(ownedUnique)} />
        <Card label="Owned (copies)" value={String(ownedCopies)} />
        <Card label="Wishlist" value={String(wishlistCount)} />
      </section>

      {/* add whatever collection UI you want below */}
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <div className="text-[11px] uppercase tracking-wide text-gray-600">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}
