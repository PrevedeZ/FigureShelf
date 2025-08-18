"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CCY } from "./types";

type Ctx = {
  currency: CCY;
  setCurrency: (c: CCY) => void;

  // conversions in cents
  toEurCents: (amountCents: number, from: CCY, fxPerEUR?: number | null | undefined) => number;
  fromEurCents: (eurCents: number, to: CCY) => number;
  convert: (amountCents: number, from: CCY, to?: CCY, fxPerEUR?: number | null | undefined) => number;

  // formatting
  format: (amountCents: number, ccy?: CCY) => string;
};

// ⚠️ Pick one locale for both server & client so HTML matches during hydration.
const LOCALE = "en-US";

const CCYS: CCY[] = ["EUR", "USD", "GBP", "JPY"];
const CurrencyContext = createContext<Ctx | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<CCY>("EUR");
  // simple default rates; your /api/fx can override them
  const [rates, setRates] = useState<Record<CCY, number>>({
    EUR: 1,
    USD: 1.1,
    GBP: 0.85,
    JPY: 160,
  });

  // try to pull fresh rates (optional)
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/fx", { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (j && typeof j === "object") {
          setRates(prev => ({ ...prev, ...j }));
        }
      } catch {
        // ignore — keep defaults
      }
    })();
  }, []);

  // cents in 'from' -> EUR cents
  const toEurCents = (amountCents: number, from: CCY, fxPerEUR?: number | null | undefined) => {
    if (!amountCents) return 0;
    if (from === "EUR") return amountCents;

    // fxPerEUR = how many FROM per 1 EUR → EUR = FROM / fxPerEUR
    if (fxPerEUR && fxPerEUR > 0) return Math.round(amountCents / fxPerEUR);

    const perEur = rates[from]; // FROM per 1 EUR
    return perEur > 0 ? Math.round(amountCents / perEur) : amountCents;
  };

  // EUR cents -> cents in 'to'
  const fromEurCents = (eurCents: number, to: CCY) => {
    if (to === "EUR") return eurCents;
    const perEur = rates[to]; // TO per 1 EUR
    return Math.round(eurCents * (perEur || 1));
  };

  // convenience: FROM -> TO directly (TO defaults to current display currency)
  const convert = (
    amountCents: number,
    from: CCY,
    to?: CCY,
    fxPerEUR?: number | null | undefined
  ) => {
    const eur = toEurCents(amountCents, from, fxPerEUR);
    return fromEurCents(eur, to ?? currency);
  };

  const format = (amountCents: number, ccy: CCY = currency) =>
    (amountCents / 100).toLocaleString(LOCALE, {
      style: "currency",
      currency: ccy,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const value = useMemo<Ctx>(() => ({
    currency,
    setCurrency: (c) => setCurrency(CCYS.includes(c) ? c : "EUR"),
    toEurCents,
    fromEurCents,
    convert,
    format,
  }), [currency, rates]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}
export default CurrencyProvider;

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}

// keep this helper for components that import it
export function formatCents(cents: number, ccy: CCY) {
  return (cents / 100).toLocaleString(LOCALE, {
    style: "currency",
    currency: ccy,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
