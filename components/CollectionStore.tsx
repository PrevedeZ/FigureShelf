"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CCY } from "./types";

export type Owned = {
  id: string;
  figureId: string;
  pricePaidCents?: number | null;
  taxCents?: number | null;
  shippingCents?: number | null;
  currency: CCY;
  fxPerEUR?: number | null;
  note?: string | null;
  createdAt?: string;
};

export type Wish = {
  id: string;
  figureId: string;
  wantAnother?: boolean | null;
  note?: string | null;
  createdAt?: string;
};

type Ctx = {
  owned: Owned[];
  wishlist: Wish[];
  refresh: () => Promise<void>;

  ownedIdsByFigure: (figureId: string) => string[];
  ownedCountForFigure: (figureId: string) => number;

  isWished: (figureId: string) => boolean;
  wishFor: (figureId: string) => Wish | undefined;

  addOwned: (figureId: string, payload?: Partial<Owned>) => Promise<boolean>;
  updateOwned: (ownedId: string, patch: Partial<Owned>) => Promise<boolean>;
  removeOwned: (ownedId: string) => Promise<boolean>;
  sellOne: (figureId: string) => Promise<boolean>;

  addWish: (figureId: string, opts?: { wantAnother?: boolean; note?: string }) => Promise<boolean>;
  removeWish: (figureId: string) => Promise<boolean>;
};

const CollectionContext = createContext<Ctx | null>(null);

async function getJSON<T = any>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store", credentials: "include" });
  if (!r.ok) {
    let msg = `${r.status} ${r.statusText}`;
    try { msg = (await r.json())?.error ?? msg; } catch {}
    throw new Error(msg);
  }
  return (await r.json()) as T;
}

async function postJSON<T = any>(url: string, body: any): Promise<T> {
  const r = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  const json = text ? JSON.parse(text) : null;
  if (!r.ok) throw new Error((json && json.error) || `${r.status} ${r.statusText}`);
  return json as T;
}

async function patchJSON<T = any>(url: string, body: any): Promise<T> {
  const r = await fetch(url, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  const json = text ? JSON.parse(text) : null;
  if (!r.ok) throw new Error((json && json.error) || `${r.status} ${r.statusText}`);
  return json as T;
}

async function del(url: string): Promise<void> {
  const r = await fetch(url, { method: "DELETE", credentials: "include" });
  if (!r.ok) {
    let msg = `${r.status} ${r.statusText}`;
    try { msg = (await r.json())?.error ?? msg; } catch {}
    throw new Error(msg);
  }
}

/* ---------- provider ---------- */
export function CollectionProvider({ children }: { children: React.ReactNode }) {
  const [owned, setOwned] = useState<Owned[]>([]);
  const [wishlist, setWishlist] = useState<Wish[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = async () => {
    try {
      const [ownedList, wishList] = await Promise.all([
        getJSON<Owned[]>("/api/owned"),
        getJSON<Wish[]>("/api/wishlist"),
      ]);
      setOwned(Array.isArray(ownedList) ? ownedList : []);
      setWishlist(Array.isArray(wishList) ? wishList : []);
    } catch {
      setOwned([]);
      setWishlist([]);
    } finally {
      setReady(true);
    }
  };

  useEffect(() => { refresh(); }, []);

  const ownedIdsByFigure = (figureId: string) =>
    owned.filter(o => o.figureId === figureId).map(o => o.id);

  const ownedCountForFigure = (figureId: string) =>
    ownedIdsByFigure(figureId).length;

  const isWished = (figureId: string) =>
    wishlist.some(w => w.figureId === figureId);

  const wishFor = (figureId: string) =>
    wishlist.find(w => w.figureId === figureId);

  const addOwned: Ctx["addOwned"] = async (figureId, payload = {}) => {
    try {
      const res = await postJSON<{ owned: Owned }>("/api/owned", { figureId, ...payload });
      setOwned(prev => [...prev, res.owned]);
      document.dispatchEvent(new CustomEvent("owned:changed"));
      return true;
    } catch (e: any) {
      alert(e?.message ?? "Could not add to owned.");
      return false;
    }
  };

  const updateOwned: Ctx["updateOwned"] = async (ownedId, patch) => {
    try {
      const res = await patchJSON<{ owned: Owned }>(`/api/owned/${ownedId}`, patch);
      setOwned(prev => prev.map(o => (o.id === ownedId ? { ...o, ...res.owned } : o)));
      document.dispatchEvent(new CustomEvent("owned:changed"));
      return true;
    } catch (e: any) {
      alert(e?.message ?? "Could not update owned.");
      return false;
    }
  };

  const removeOwned: Ctx["removeOwned"] = async (ownedId) => {
    try {
      await del(`/api/owned/${ownedId}`);
      setOwned(prev => prev.filter(o => o.id !== ownedId));
      document.dispatchEvent(new CustomEvent("owned:changed"));
      return true;
    } catch (e: any) {
      alert(e?.message ?? "Could not remove owned item.");
      return false;
    }
  };

  const sellOne: Ctx["sellOne"] = async (figureId) => {
    const ids = ownedIdsByFigure(figureId);
    if (ids.length === 0) return true;
    return removeOwned(ids[ids.length - 1]);
  };

  const addWish: Ctx["addWish"] = async (figureId, opts) => {
    try {
      const res = await postJSON<{ wish: Wish }>("/api/wishlist", { figureId, ...(opts ?? {}) });
      setWishlist(prev => [...prev, res.wish]);
      document.dispatchEvent(new CustomEvent("wishlist:changed"));
      return true;
    } catch (e: any) {
      alert(e?.message ?? "Could not add to wishlist.");
      return false;
    }
  };

  const removeWish: Ctx["removeWish"] = async (figureId) => {
    try {
      const w = wishlist.find(x => x.figureId === figureId);
      if (!w) return true;
      await del(`/api/wishlist/${w.id}`);
      setWishlist(prev => prev.filter(x => x.id !== w.id));
      document.dispatchEvent(new CustomEvent("wishlist:changed"));
      return true;
    } catch (e: any) {
      alert(e?.message ?? "Could not remove wishlist item.");
      return false;
    }
  };

  const value: Ctx = useMemo(() => ({
    owned, wishlist, refresh,
    ownedIdsByFigure, ownedCountForFigure,
    isWished, wishFor,
    addOwned, updateOwned, removeOwned, sellOne,
    addWish, removeWish,
  }), [owned, wishlist]);

  if (!ready) return null;
  return <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>;
}

export function useCollection() {
  const ctx = useContext(CollectionContext);
  if (!ctx) throw new Error("useCollection must be used within CollectionProvider");
  return ctx;
}

export default CollectionProvider;
