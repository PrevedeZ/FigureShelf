"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { CCY } from "./types";

type Ctx = {
  currency: CCY;
  setCurrency: (c: CCY) => void;
  toEurCents: (amountCents: number, from: CCY, fxPerEUR?: number | null | undefined) => number;
  fromEurCents: (eurCents: number, to: CCY) => number;
  format: (amountCents: number, ccy?: CCY) => string;
};

const CurrencyContext = createContext<Ctx | null>(null);

const CCYS: CCY[] = ["EUR", "USD", "GBP", "JPY"];

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<CCY>("EUR");
  const [rates, setRates] = useState<Record<CCY, number>>({ EUR: 1, USD: 1.1, GBP: 0.85, JPY: 160 });

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/fx", { cache: "no-store" });
        const j = await r.json().catch(() => ({}));
        if (j && typeof j === "object") {
          setRates((prev) => ({ ...prev, ...j }));
        }
      } catch { /* keep defaults */ }
    })();
  }, []);

  const toEurCents = (amountCents: number, from: CCY, fxPerEUR?: number | null | undefined) => {
    if (!amountCents) return 0;
    if (from === "EUR") return amountCents;
    if (fxPerEUR && fxPerEUR > 0) {
      // fxPerEUR = how many FROM per 1 EUR → EUR = FROM / fxPerEUR
      return Math.round(amountCents / fxPerEUR);
    }
    const perEur = rates[from];
    return perEur > 0 ? Math.round(amountCents / perEur) : amountCents;
  };

  const fromEurCents = (eurCents: number, to: CCY) => {
    if (to === "EUR") return eurCents;
    const perEur = rates[to];
    return Math.round(eurCents * (perEur || 1));
  };

  const format = (amountCents: number, ccy: CCY = currency) => {
    const v = (amountCents / 100).toLocaleString(undefined, {
      style: "currency",
      currency: ccy,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return v;
  };

  const value = useMemo<Ctx>(() => ({
    currency,
    setCurrency: (c) => setCurrency(CCYS.includes(c) ? c : "EUR"),
    toEurCents,
    fromEurCents,
    format,
  }), [currency, rates]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}
export default CurrencyProvider; // also export default

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}

// convenient helpers for components that only need formatting
export function formatCents(cents: number, ccy: CCY) {
  return (cents / 100).toLocaleString(undefined, { style: "currency", currency: ccy });
}
