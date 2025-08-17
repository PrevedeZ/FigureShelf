"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CCY } from "./types";

export type OwnedRow = {
  id: string;
  figureId: string;
  currency: CCY;
  pricePaidCents: number;
  taxCents: number;
  shippingCents: number;
  fxPerEUR?: number | null;
  createdAt?: string;
};

export type WishRow = {
  id: string;
  figureId: string;
  note?: string | null;
  createdAt?: string;
};

type Ctx = {
  owned: OwnedRow[];
  wishlist: WishRow[];
  refresh: () => Promise<void>;

  ownedById: (figureId: string) => number;

  addOwned: (figureId: string, input: Partial<OwnedRow>) => Promise<void>;
  updateOwned: (ownedId: string, input: Partial<OwnedRow>) => Promise<void>;
  deleteOwned: (ownedId: string) => Promise<void>;

  addWish: (figureId: string, note?: string) => Promise<void>;
  removeWish: (wishId: string) => Promise<void>;
};

const CollectionContext = createContext<Ctx | null>(null);

async function getJSON(url: string) {
  const r = await fetch(url, { cache: "no-store", credentials: "include" });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}
async function sendJSON(url: string, method: "POST"|"PUT"|"PATCH"|"DELETE", body?: any) {
  const r = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json().catch(() => ({}));
}

export function CollectionProvider({ children }: { children: React.ReactNode }) {
  const [owned, setOwned] = useState<OwnedRow[]>([]);
  const [wishlist, setWishlist] = useState<WishRow[]>([]);

  const refresh = async () => {
    const [o, w] = await Promise.all([
      getJSON("/api/owned/list").then((j) => Array.isArray(j.rows) ? j.rows : []),
      getJSON("/api/wishlist/list").then((j) => Array.isArray(j.rows) ? j.rows : []),
    ]).catch(() => [[], []] as [OwnedRow[], WishRow[]]);
    setOwned(o);
    setWishlist(w);
  };

  useEffect(() => {
    refresh();
  }, []);

  const ownedById = (figureId: string) => owned.filter(o => o.figureId === figureId).length;

  const addOwned = async (figureId: string, input: Partial<OwnedRow>) => {
    await sendJSON("/api/owned", "POST", { figureId, ...input });
    await refresh();
    document.dispatchEvent(new CustomEvent("owned:changed"));
  };
  const updateOwned = async (ownedId: string, input: Partial<OwnedRow>) => {
    await sendJSON(`/api/owned/${ownedId}`, "PUT", input);
    await refresh();
    document.dispatchEvent(new CustomEvent("owned:changed"));
  };
  const deleteOwned = async (ownedId: string) => {
    await sendJSON(`/api/owned/${ownedId}`, "DELETE");
    await refresh();
    document.dispatchEvent(new CustomEvent("owned:changed"));
  };

  const addWish = async (figureId: string, note?: string) => {
    await sendJSON("/api/wishlist", "POST", { figureId, note });
    await refresh();
    document.dispatchEvent(new CustomEvent("wishlist:changed"));
  };
  const removeWish = async (wishId: string) => {
    await sendJSON(`/api/wishlist/${wishId}`, "DELETE");
    await refresh();
    document.dispatchEvent(new CustomEvent("wishlist:changed"));
  };

  const value: Ctx = useMemo(() => ({
    owned, wishlist, refresh, ownedById,
    addOwned, updateOwned, deleteOwned,
    addWish, removeWish,
  }), [owned, wishlist]);

  return <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>;
}
export default CollectionProvider; // also export default

export function useCollection() {
  const ctx = useContext(CollectionContext);
  if (!ctx) throw new Error("useCollection must be used within CollectionProvider");
  return ctx;
}
