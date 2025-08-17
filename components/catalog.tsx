"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Figure } from "./types";

/* Helpers kept for compatibility */
export function splitCharacter(input: string): { base: string; variant?: string } {
  if (!input) return { base: "" };
  const paren = input.match(/^(.*)\((.*)\)\s*$/);
  if (paren) {
    const base = paren[1].trim().replace(/[–-]\s*$/, "").trim();
    const variant = paren[2].trim();
    return { base, variant: variant || undefined };
  }
  const parts = input.split(/[-–:•]| {2,}/).map(s => s.trim()).filter(Boolean);
  if (parts.length > 1) return { base: parts[0], variant: parts.slice(1).join(" ") };
  return { base: input.trim() };
}

type CatalogCtx = {
  figures: Figure[];
  series: string[];
  byId: Map<string, Figure>;
  loading: boolean;
  refresh: () => Promise<void>;
};

const CatalogContext = createContext<CatalogCtx | null>(null);

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [figures, setFigures] = useState<Figure[]>([]);
  const [series, setSeries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/catalog", { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      setFigures(Array.isArray(j.figures) ? j.figures : []);
      setSeries(Array.isArray(j.series) ? j.series : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    document.addEventListener("admin:catalog:changed", onChange);
    document.addEventListener("catalog:refresh", onChange);
    return () => {
      document.removeEventListener("admin:catalog:changed", onChange);
      document.removeEventListener("catalog:refresh", onChange);
    };
  }, []);

  const byId = useMemo(() => new Map(figures.map(f => [f.id, f] as const)), [figures]);

  return (
    <CatalogContext.Provider value={{ figures, series, byId, loading, refresh }}>
      {children}
    </CatalogContext.Provider>
  );
}
export default CatalogProvider; // also export default
export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within CatalogProvider");
  return ctx;
}
