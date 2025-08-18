"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Figure } from "./types";

/* ---------- helpers ---------- */
/** "Son Goku (Super Saiyan)" -> { base: "Son Goku", variant: "Super Saiyan" } */
export function splitCharacter(input: string): { base: string; variant: string | null } {
  const m = (input ?? "").match(/^\s*(.*?)\s*(?:\((.*?)\))?\s*$/);
  const base = (m?.[1] ?? input ?? "").trim();
  const variant = (m?.[2] ?? "").trim();
  return { base, variant: variant ? variant : null };
}

/* ---------- context ---------- */
type Ctx = {
  figures: Figure[] | null;
  series: string[];
  byId: Map<string, Figure>;
  loading: boolean;
  /** refresh function (new name) */
  refresh: () => Promise<void>;
  /** refresh function (legacy name used by AdminDock) */
  refreshCatalog: () => Promise<void>;
};

const CatalogContext = createContext<Ctx | null>(null);

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [figures, setFigures] = useState<Figure[] | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/catalog", { cache: "no-store", credentials: "include" });
      const j = await r.json();
      setFigures(Array.isArray(j?.figures) ? j.figures : []);
    } catch {
      setFigures([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const series = useMemo(() => {
    if (!figures) return [];
    const s = new Set<string>();
    for (const f of figures) s.add(f.series);
    return [...s].sort((a, b) => a.localeCompare(b));
  }, [figures]);

  const byId = useMemo(() => {
    const m = new Map<string, Figure>();
    for (const f of figures ?? []) m.set(f.id, f);
    return m;
  }, [figures]);

  const value: Ctx = {
    figures,
    series,
    byId,
    loading,
    refresh: fetchCatalog,
    refreshCatalog: fetchCatalog, // alias for backward compatibility
  };

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

// keep both default and named exports to match imports elsewhere
export default CatalogProvider;

export function useCatalog(): Ctx {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within <CatalogProvider>");
  return ctx;
}
