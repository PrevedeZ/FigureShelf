"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CCY } from "./types";

/* ---------- types ---------- */
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

/* ---------- cross-tab broadcast ---------- */
let bc: BroadcastChannel | null = null;
if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try { bc = new BroadcastChannel("figureshelf-collection"); } catch {}
}

function ping(topic: "owned:changed" | "wishlist:changed") {
  if (typeof document !== "undefined") {
    document.dispatchEvent(new CustomEvent(topic));
  }
  try { bc?.postMessage({ type: topic }); } catch {}
}

/* ---------- HTTP helpers ---------- */
async function getJSON<T = any>(urls: string[]): Promise<T> {
  let lastErr: any;
  for (const url of urls) {
    try {
      const r = await fetch(url, { cache: "no-store", credentials: "include" });
      if (!r.ok) continue;
      return (await r.json()) as T;
    } catch (e) { lastErr = e; }
  }
  throw lastErr ?? new Error("GET failed");
}

async function postJSON<T = any>(urls: string[], body: any): Promise<T | null> {
  for (const url of urls) {
    try {
      const r = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) continue;
      return (await r.json()) as T;
    } catch {}
  }
  return null;
}

async function patchJSON<T = any>(url: string, body: any): Promise<T | null> {
  try {
    const r = await fetch(url, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch { return null; }
}

async function del(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { method: "DELETE", credentials: "include" });
    return r.ok;
  } catch { return false; }
}

/* ---------- provider ---------- */
export function CollectionProvider({ children }: { children: React.ReactNode }) {
  const [owned, setOwned] = useState<Owned[]>([]);
  const [wishlist, setWishlist] = useState<Wish[]>([]);
  const [ready, setReady] = useState(false);

  const refresh = async () => {
    try {
      const [ownedList, wishList] = await Promise.all([
        getJSON<Owned[]>(["/api/owned/list", "/api/owned"]),
        getJSON<Wish[]>(["/api/wishlist/list", "/api/wishlist"]),
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

  useEffect(() => {
    refresh();
    // cross-tab listener
    if (bc) {
      const handler = (e: MessageEvent) => {
        const t = e.data?.type as string | undefined;
        if (t === "owned:changed" || t === "wishlist:changed") {
          refresh();
        }
      };
      bc.addEventListener("message", handler);
      return () => bc?.removeEventListener("message", handler);
    }
  }, []);

  /* derived helpers */
  const ownedIdsByFigure = (figureId: string) =>
    owned.filter(o => o.figureId === figureId).map(o => o.id);

  const ownedCountForFigure = (figureId: string) =>
    ownedIdsByFigure(figureId).length;

  const isWished = (figureId: string) =>
    wishlist.some(w => w.figureId === figureId);

  const wishFor = (figureId: string) =>
    wishlist.find(w => w.figureId === figureId);

  /* ---------- mutations (NEVER throw) ---------- */
  const addOwned: Ctx["addOwned"] = async (figureId, payload = {}) => {
    const res = await postJSON<{ owned: Owned }>(["/api/owned", "/api/collection/add", "/api/purchase"], { figureId, ...payload });
    if (!res?.owned) { alert("Could not add to owned (API not found)."); return false; }
    setOwned(prev => [...prev, res.owned]);
    ping("owned:changed");
    return true;
  };

  const updateOwned: Ctx["updateOwned"] = async (ownedId, patch) => {
    const res = await patchJSON<{ owned: Owned }>(`/api/owned/${ownedId}`, patch);
    if (!res?.owned) { alert("Could not update owned."); return false; }
    setOwned(prev => prev.map(o => (o.id === ownedId ? { ...o, ...res.owned } : o)));
    ping("owned:changed");
    return true;
  };

  const removeOwned: Ctx["removeOwned"] = async (ownedId) => {
    const ok = await del(`/api/owned/${ownedId}`);
    if (!ok) { alert("Could not remove owned item."); return false; }
    setOwned(prev => prev.filter(o => o.id !== ownedId));
    ping("owned:changed");
    return true;
  };

  const sellOne: Ctx["sellOne"] = async (figureId) => {
    const ids = ownedIdsByFigure(figureId);
    if (ids.length === 0) return true;
    return removeOwned(ids[ids.length - 1]);
    // (removeOwned() will ping + broadcast)
  };

  const addWish: Ctx["addWish"] = async (figureId, opts) => {
    const res = await postJSON<{ wish: Wish }>(["/api/wishlist", "/api/wishlist/add"], { figureId, ...(opts ?? {}) });
    if (!res?.wish) { alert("Could not add to wishlist (API not found)."); return false; }
    setWishlist(prev => [...prev, res.wish]);
    ping("wishlist:changed");
    return true;
  };

  const removeWish: Ctx["removeWish"] = async (figureId) => {
    const w = wishlist.find(x => x.figureId === figureId);
    if (!w) return true;
    const ok = await del(`/api/wishlist/${w.id}`);
    if (!ok) { alert("Could not remove wishlist item."); return false; }
    setWishlist(prev => prev.filter(x => x.id !== w.id));
    ping("wishlist:changed");
    return true;
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
