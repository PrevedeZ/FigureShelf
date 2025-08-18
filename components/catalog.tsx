"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

/** ----- Types coming from the server ----- */
type ServerSeries = { id: string; name: string; slug?: string };
type ServerFigure = {
  id: string;
  name: string;
  character: string;
  characterBase?: string | null;
  variant?: string | null;
  line: string;
  image: string;
  releaseYear: number;
  releaseType?: string | null;
  bodyVersionTag?: string | null;
  bodyVersion?: string | null;
  saga?: string | null;
  msrpCents: number;
  msrpCurrency: "EUR" | "USD" | "GBP" | "JPY";
  seriesId?: string;
  series?: { id: string; name: string } | string | null;
};

/** ----- UI Figure type (normalized) ----- */
export type Figure = {
  id: string;
  name: string;
  character: string;
  characterBase?: string | null;
  variant?: string | null;
  line: string;
  image: string;
  releaseYear: number;
  releaseType?: string | null;
  bodyVersionTag?: string | null;
  bodyVersion?: string | null;
  saga?: string | null;
  msrpCents: number;
  msrpCurrency: "EUR" | "USD" | "GBP" | "JPY";
  series: string;          // ALWAYS a series name for UI
  seriesId?: string;       // optional, if you need it
};

/** ----- Context ----- */
type CatalogCtx = {
  loading: boolean;
  figures: Figure[];
  series: string[];           // series names
  byId: Map<string, Figure>;
  refresh: () => Promise<void>;
  splitCharacter: (s: string) => { base: string; variant: string };
};

const CatalogContext = createContext<CatalogCtx | null>(null);

/** Small util for robustness (Admin endpoints may return slightly different shapes) */
function safeJson<T = any>(r: Response): Promise<T | null> {
  const ct = r.headers.get("content-type") || "";
  if (!ct.includes("application/json")) return Promise.resolve(null);
  return r.json().catch(() => null);
}

/** Turn any server figure’s series into a plain name for UI */
function extractSeriesName(s: ServerFigure["series"]): string {
  if (!s) return "Unknown";
  if (typeof s === "string") return s;
  if (typeof s === "object" && s.name) return s.name;
  return "Unknown";
}

/** You asked for this helper to remain exported */
export function splitCharacter(input: string): { base: string; variant: string } {
  // examples:
  //  "Son Goku (SSG)" -> base="Son Goku", variant="SSG"
  //  "Trunks"         -> base="Trunks",   variant=""
  const m = input.match(/^(.*?)(?:\s*\((.+)\))?$/);
  const base = (m?.[1] ?? input).trim();
  const variant = (m?.[2] ?? "").trim();
  return { base, variant };
}

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [figures, setFigures] = useState<Figure[]>([]);
  const [seriesNames, setSeriesNames] = useState<string[]>([]);

  const refresh = async () => {
    setLoading(true);
    try {
      // Prefer admin datasets if present; otherwise fall back to public catalog.
      const [adminFigsRes, adminSeriesRes] = await Promise.all([
        fetch("/api/admin/figures", { cache: "no-store", credentials: "include" }),
        fetch("/api/admin/series", { cache: "no-store", credentials: "include" }),
      ]);

      let srvFigures: ServerFigure[] | null = null;
      let srvSeries: ServerSeries[] | null = null;

      if (adminFigsRes.ok) {
        const jf = await safeJson<{ items?: ServerFigure[] }>(adminFigsRes);
        srvFigures = Array.isArray(jf?.items) ? jf!.items! : [];
      }
      if (adminSeriesRes.ok) {
        const js = await safeJson<{ items?: ServerSeries[] }>(adminSeriesRes);
        srvSeries = Array.isArray(js?.items) ? js!.items! : [];
      }

      if (!srvFigures || srvFigures.length === 0 || !srvSeries) {
        const catRes = await fetch("/api/catalog", { cache: "no-store", credentials: "include" });
        const jc = await safeJson<{ figures?: ServerFigure[]; series?: (ServerSeries | string)[] }>(catRes);
        if (catRes.ok && jc) {
          if (!srvFigures || srvFigures.length === 0) srvFigures = jc.figures ?? [];
          if (!srvSeries) {
            // Normalize: if server returns strings, map to {name}
            const sList = (jc.series ?? []).map((s) =>
              typeof s === "string" ? ({ id: s, name: s } as ServerSeries) : s
            );
            srvSeries = sList;
          }
        }
      }

      const uiFigures: Figure[] = (srvFigures ?? []).map((f) => ({
        id: f.id,
        name: f.name,
        character: f.character,
        characterBase: f.characterBase ?? null,
        variant: f.variant ?? null,
        line: f.line,
        image: f.image,
        releaseYear: f.releaseYear,
        releaseType: f.releaseType ?? null,
        bodyVersionTag: f.bodyVersionTag ?? null,
        bodyVersion: f.bodyVersion ?? null,
        saga: f.saga ?? null,
        msrpCents: f.msrpCents,
        msrpCurrency: f.msrpCurrency,
        series: extractSeriesName(f.series), // <— normalize to plain string
        seriesId: f.seriesId,
      }));

      const names = ((srvSeries ?? []) as ServerSeries[])
        .map((s) => s?.name || "")
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

      setFigures(uiFigures);
      setSeriesNames(names);
    } catch {
      setFigures([]);
      setSeriesNames([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const onCat = () => refresh();
    document.addEventListener("catalog:changed", onCat as any);
    return () => document.removeEventListener("catalog:changed", onCat as any);
  }, []);

  const byId = useMemo(() => {
    const m = new Map<string, Figure>();
    for (const f of figures) m.set(f.id, f);
    return m;
  }, [figures]);

  const value: CatalogCtx = {
    loading,
    figures,
    series: seriesNames, // always string[]
    byId,
    refresh,
    splitCharacter,
  };

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within CatalogProvider");
  return ctx;
}

export default CatalogProvider;
