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

/* ---------- small helpers ---------- */
function ping(topic: "owned:changed" | "wishlist:changed") {
  if (typeof document !== "undefined") {
    document.dispatchEvent(new CustomEvent(topic));
  }
}

async function getJSON(url: string) {
  const r = await fetch(url, { cache: "no-store", credentials: "include" });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

async function tryGetAny(urls: string[]) {
  let lastErr: unknown;
  for (const u of urls) {
    try {
      return await getJSON(u);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("GET failed");
}

async function postJSON(url: string, body: any) {
  const r = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r;
}

async function tryPostAny(urls: string[], body: any) {
  for (const u of urls) {
    try {
      const r = await postJSON(u, body);
      if (!r.ok) continue;
      return await r.json();
    } catch {
      // try next
    }
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
  } catch {
    return null;
  }
}

async function del(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { method: "DELETE", credentials: "include" });
    return r.ok;
  } catch {
    return false;
  }
}

/* ---------- provider ---------- */
export function CollectionProvider({ children }: { children: React.ReactNode }) {
  const [owned, setOwned] = useState<Owned[]>([]);
  const [wishlist, setWishlist] = useState<Wish[]>([]);
  const [ready, setReady] = useState(false);

  // Normalizes various API shapes into arrays
  function coerceOwned(input: any): Owned[] {
    if (Array.isArray(input)) return input as Owned[];
    if (Array.isArray(input?.owned)) return input.owned as Owned[];
    if (Array.isArray(input?.list)) return input.list as Owned[];
    return [];
  }
  function coerceWishlist(input: any): Wish[] {
    if (Array.isArray(input)) return input as Wish[];
    if (Array.isArray(input?.wishlist)) return input.wishlist as Wish[];
    if (Array.isArray(input?.list)) return input.list as Wish[];
    return [];
  }

  const refresh = async () => {
    try {
      const [ownedRaw, wishRaw] = await Promise.all([
        tryGetAny(["/api/owned/list", "/api/owned"]),
        tryGetAny(["/api/wishlist/list", "/api/wishlist"]),
      ]);
      setOwned(coerceOwned(ownedRaw));
      setWishlist(coerceWishlist(wishRaw));
    } catch {
      setOwned([]);
      setWishlist([]);
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  /* derived helpers */
  const ownedIdsByFigure = (figureId: string) =>
    owned.filter((o) => o.figureId === figureId).map((o) => o.id);

  const ownedCountForFigure = (figureId: string) => ownedIdsByFigure(figureId).length;

  const isWished = (figureId: string) => wishlist.some((w) => w.figureId === figureId);

  const wishFor = (figureId: string) => wishlist.find((w) => w.figureId === figureId);

  /* ---------- mutations (NEVER throw) ---------- */
  const addOwned: Ctx["addOwned"] = async (figureId, payload = {}) => {
    // Primary: /api/owned. Fallbacks just delegate to /api/owned in your API.
    const res = await tryPostAny(
      ["/api/owned", "/api/collection/add", "/api/purchase"],
      { figureId, ...payload }
    );
    if (!res?.owned) {
      alert("Could not add to owned (API not found).");
      return false;
    }
    setOwned((prev) => [...prev, res.owned as Owned]);
    ping("owned:changed");
    return true;
  };

  const updateOwned: Ctx["updateOwned"] = async (ownedId, patch) => {
    const res = await patchJSON<{ owned: Owned }>(`/api/owned/${ownedId}`, patch);
    if (!res?.owned) {
      alert("Could not update owned.");
      return false;
    }
    setOwned((prev) => prev.map((o) => (o.id === ownedId ? { ...o, ...res.owned } : o)));
    ping("owned:changed");
    return true;
  };

  const removeOwned: Ctx["removeOwned"] = async (ownedId) => {
    const ok = await del(`/api/owned/${ownedId}`);
    if (!ok) {
      alert("Could not remove owned item.");
      return false;
    }
    setOwned((prev) => prev.filter((o) => o.id !== ownedId));
    ping("owned:changed");
    return true;
  };

  const sellOne: Ctx["sellOne"] = async (figureId) => {
    const ids = ownedIdsByFigure(figureId);
    if (ids.length === 0) return true;
    return removeOwned(ids[ids.length - 1]);
  };

  const addWish: Ctx["addWish"] = async (figureId, opts) => {
    const res = await tryPostAny(
      ["/api/wishlist", "/api/wishlist/add"],
      { figureId, ...(opts ?? {}) }
    );
    if (!res?.wish) {
      alert("Could not add to wishlist (API not found).");
      return false;
    }
    setWishlist((prev) => [...prev, res.wish as Wish]);
    ping("wishlist:changed");
    return true;
  };

  const removeWish: Ctx["removeWish"] = async (figureId) => {
    const w = wishlist.find((x) => x.figureId === figureId);
    if (!w) return true;
    const ok = await del(`/api/wishlist/${w.id}`);
    if (!ok) {
      alert("Could not remove wishlist item.");
      return false;
    }
    setWishlist((prev) => prev.filter((x) => x.id !== w.id));
    ping("wishlist:changed");
    return true;
  };

  const value: Ctx = useMemo(
    () => ({
      owned,
      wishlist,
      refresh,
      ownedIdsByFigure,
      ownedCountForFigure,
      isWished,
      wishFor,
      addOwned,
      updateOwned,
      removeOwned,
      sellOne,
      addWish,
      removeWish,
    }),
    [owned, wishlist]
  );

  if (!ready) return null;
  return <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>;
}

export function useCollection() {
  const ctx = useContext(CollectionContext);
  if (!ctx) throw new Error("useCollection must be used within CollectionProvider");
  return ctx;
}

export default CollectionProvider;