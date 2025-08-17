"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { Figure } from "./types";

/** Optional helper: split "Goku (SSG)" → { base: "Goku", variant: "SSG" } */
export function splitCharacter(name: string): { base: string; variant: string } {
  const m = name.match(/^(.+?)\s*\((.+)\)\s*$/);
  if (m) return { base: m[1].trim(), variant: m[2].trim() };
  return { base: name.trim(), variant: "" };
}

type CatalogResponse = { series: string[]; figures: Figure[] };

/**
 * Live catalog hook:
 * - fetches series + figures from your API (DB-backed)
 * - no hardcoding
 * - re-fetches on: window focus, "catalog:refresh" events, and when tab becomes visible
 */
export function useCatalog() {
  const [series, setSeries] = useState<string[]>([]);
  const [figures, setFigures] = useState<Figure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/catalog", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch /api/catalog");
      const json = (await res.json()) as CatalogResponse;
      setSeries(json.series || []);
      setFigures(json.figures || []);
      setError(null);
    } catch (e: any) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    const onFocus = () => load();
    const onRefresh = () => load();
    const onVis = () => {
      if (document.visibilityState === "visible") load();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("catalog:refresh", onRefresh as any);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("catalog:refresh", onRefresh as any);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [load]);

  const byId = useMemo(() => new Map(figures.map((f) => [f.id, f])), [figures]);

  return { series, figures, byId, loading, error, refresh: load };
}
