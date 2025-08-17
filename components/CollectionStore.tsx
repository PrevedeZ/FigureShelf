"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";

/* ---------- Types ---------- */
export type CurrencyCode = "EUR" | "USD" | "GBP" | "JPY";

export type OwnedEntry = {
  id: string;
  figureId: string;
  currency: CurrencyCode;
  pricePaidCents: number;
  taxCents?: number;
  shippingCents?: number;
  store?: string;
  purchasedAt?: string; // ISO
  fxPerEUR?: number;
};

export type WishEntry = {
  figureId: string;
  wantAnother?: boolean;
  note?: string;
};

type AddOwnedPayload = {
  figureId: string;
  currency: CurrencyCode;
  pricePaidCents?: number;
  taxCents?: number;
  shippingCents?: number;
  store?: string;
  purchasedAt?: string;
  fxPerEUR?: number;
};

type UpdateOwnedPatch = Partial<Omit<OwnedEntry, "id" | "figureId">>;

export type CollectionContextType = {
  owned: OwnedEntry[];
  wishlist: WishEntry[];
  // queries
  ownedCountForFigure: (figureId: string) => number;
  ownedByFigure: (figureId: string) => OwnedEntry[];
  ownedById: (ownedId: string) => OwnedEntry | null;
  isWished: (figureId: string) => boolean;
  wishFor: (figureId: string) => WishEntry | null;
  // mutations
  addOwned: (payload: AddOwnedPayload) => OwnedEntry;
  updateOwned: (ownedId: string, patch: UpdateOwnedPatch) => void;
  sellOne: (figureId: string) => void;
  addWish: (figureId: string, data?: { wantAnother?: boolean; note?: string }) => void;
  removeWish: (figureId: string) => void;
  resetLocalData: () => void; // NEW: clear current user's namespace
};

const CollectionContext = createContext<CollectionContextType | null>(null);

/* ---------- Storage helpers ---------- */
const SCHEMA_VERSION = "2";

function ns(email?: string | null) {
  return (email && email.trim()) ? `u:${email.trim().toLowerCase()}` : "u:guest";
}
function keysFor(email?: string | null) {
  const N = ns(email);
  return {
    OWNED: `figures/${N}/owned`,
    WISH: `figures/${N}/wishlist`,
    META: `figures/${N}/meta`,
  };
}

function loadOwned(k: string): OwnedEntry[] {
  if (typeof window === "undefined") return [];
  try { const raw = localStorage.getItem(k); return raw ? (JSON.parse(raw) as OwnedEntry[]) : []; } catch { return []; }
}
function loadWish(k: string): WishEntry[] {
  if (typeof window === "undefined") return [];
  try { const raw = localStorage.getItem(k); return raw ? (JSON.parse(raw) as WishEntry[]) : []; } catch { return []; }
}
function saveOwned(k: string, list: OwnedEntry[]) { try { localStorage.setItem(k, JSON.stringify(list)); } catch {} }
function saveWish(k: string, list: WishEntry[]) { try { localStorage.setItem(k, JSON.stringify(list)); } catch {} }

function readMeta(k: string) {
  try { return JSON.parse(localStorage.getItem(k) || "{}") as { schemaVersion?: string }; } catch { return {}; }
}
function writeMeta(k: string, meta: any) { try { localStorage.setItem(k, JSON.stringify(meta)); } catch {} }

function uid() {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

/* ---------- Provider ---------- */
export function CollectionProvider({ children }: { children: React.ReactNode }) {
  const { data } = useSession();
  const email = (data?.user as any)?.email || null;
  const { OWNED, WISH, META } = keysFor(email);

  const [owned, setOwned] = useState<OwnedEntry[]>([]);
  const [wishlist, setWishlist] = useState<WishEntry[]>([]);

  // reload when user changes
  const lastNs = useRef<string | null>(null);
  useEffect(() => {
    const currentNs = ns(email);
    if (lastNs.current === currentNs) return;
    lastNs.current = currentNs;

    // schema bump -> clear this namespace
    const meta = readMeta(META);
    if (meta.schemaVersion !== SCHEMA_VERSION) {
      localStorage.removeItem(OWNED);
      localStorage.removeItem(WISH);
      writeMeta(META, { schemaVersion: SCHEMA_VERSION });
    }

    setOwned(loadOwned(OWNED));
    setWishlist(loadWish(WISH));
  }, [email, OWNED, WISH, META]);

  // persist on change
  useEffect(() => { saveOwned(OWNED, owned); }, [OWNED, owned]);
  useEffect(() => { saveWish(WISH, wishlist); }, [WISH, wishlist]);

  /* ----- queries ----- */
  const ownedCountForFigure = useCallback((figureId: string) => owned.filter(o => o.figureId === figureId).length, [owned]);
  const ownedByFigure = useCallback((figureId: string) =>
    owned.filter(o => o.figureId === figureId).sort((a,b)=> (Date.parse(b.purchasedAt||"")||0)-(Date.parse(a.purchasedAt||"")||0)), [owned]);
  const ownedById = useCallback((ownedId: string) => owned.find(o => o.id === ownedId) ?? null, [owned]);
  const isWished = useCallback((figureId: string) => wishlist.some(w => w.figureId === figureId), [wishlist]);
  const wishFor  = useCallback((figureId: string) => wishlist.find(w => w.figureId === figureId) ?? null, [wishlist]);

  /* ----- mutations ----- */
  const addOwned = useCallback((p: AddOwnedPayload): OwnedEntry => {
    const entry: OwnedEntry = {
      id: uid(),
      figureId: p.figureId,
      currency: p.currency,
      pricePaidCents: Math.max(0, Math.round(p.pricePaidCents ?? 0)),
      taxCents: Math.max(0, Math.round(p.taxCents ?? 0)),
      shippingCents: Math.max(0, Math.round(p.shippingCents ?? 0)),
      store: p.store || undefined,
      purchasedAt: p.purchasedAt || new Date().toISOString(),
      fxPerEUR: p.fxPerEUR,
    };
    setOwned(list => [entry, ...list]);
    // auto-remove wish unless wantAnother
    setWishlist(list => {
      const w = list.find(x => x.figureId === p.figureId);
      if (w && !w.wantAnother) return list.filter(x => x.figureId !== p.figureId);
      return list;
    });
    return entry;
  }, []);

  const updateOwned = useCallback((ownedId: string, patch: UpdateOwnedPatch) => {
    setOwned(list =>
      list.map(o =>
        o.id === ownedId ? {
          ...o,
          ...(patch.pricePaidCents !== undefined ? { pricePaidCents: Math.max(0, Math.round(patch.pricePaidCents)) } : {}),
          ...(patch.taxCents !== undefined ? { taxCents: Math.max(0, Math.round(patch.taxCents)) } : {}),
          ...(patch.shippingCents !== undefined ? { shippingCents: Math.max(0, Math.round(patch.shippingCents)) } : {}),
          ...(patch.currency ? { currency: patch.currency } : {}),
          ...(patch.store !== undefined ? { store: patch.store || undefined } : {}),
          ...(patch.purchasedAt !== undefined ? { purchasedAt: patch.purchasedAt || undefined } : {}),
          ...(patch.fxPerEUR !== undefined ? { fxPerEUR: patch.fxPerEUR } : {}),
        } : o
      )
    );
  }, []);

  const sellOne = useCallback((figureId: string) => {
    setOwned(list => {
      const idx = list.findIndex(o => o.figureId === figureId);
      if (idx === -1) return list;
      const copy = list.slice(); copy.splice(idx, 1); return copy;
    });
  }, []);

  const addWish = useCallback((figureId: string, data?: { wantAnother?: boolean; note?: string }) => {
    setWishlist(list => {
      const entry: WishEntry = { figureId, ...data };
      const exists = list.some(w => w.figureId === figureId);
      return exists ? list.map(w => (w.figureId === figureId ? entry : w)) : [...list, entry];
    });
  }, []);

  const removeWish = useCallback((figureId: string) => {
    setWishlist(list => list.filter(w => w.figureId !== figureId));
  }, []);

  const resetLocalData = useCallback(() => {
    localStorage.removeItem(OWNED);
    localStorage.removeItem(WISH);
    setOwned([]);
    setWishlist([]);
  }, [OWNED, WISH]);

  const value = useMemo<CollectionContextType>(() => ({
    owned, wishlist,
    ownedCountForFigure, ownedByFigure, ownedById, isWished, wishFor,
    addOwned, updateOwned, sellOne, addWish, removeWish,
    resetLocalData,
  }), [owned, wishlist, ownedCountForFigure, ownedByFigure, ownedById, isWished, wishFor, addOwned, updateOwned, sellOne, addWish, removeWish, resetLocalData]);

  return <CollectionContext.Provider value={value}>{children}</CollectionContext.Provider>;
}

export function useCollection(): CollectionContextType {
  const ctx = useContext(CollectionContext);
  if (!ctx) throw new Error("useCollection must be used inside <CollectionProvider>");
  return ctx;
}
