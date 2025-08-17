"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CCY = "EUR" | "USD" | "GBP" | "JPY";
type Rates = Record<CCY, number>;

// Pick ONE locale to avoid SSR/CSR mismatch.
// "de-DE" → 0,00 €   |   "en-US" → €0.00
const LOCALE = "de-DE";

type Ctx = {
  currency: CCY;
  setCurrency: (c: CCY) => void;
  rates: Rates;          // 1 EUR = rates[ccy]
  lastFxDate?: string;
  ratePerEUR: (ccy: CCY) => number;
  toEurCents: (amountCents: number, from: CCY, fxPerEUR?: number) => number;
  fromEurCents: (eurCents: number, to: CCY) => number;
  convert: (amountCents: number, from: CCY, to?: CCY) => number;
};

const CurrencyContext = createContext<Ctx | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrency] = useState<CCY>("EUR");
  const [rates, setRates] = useState<Rates>({ EUR: 1, USD: 1.09, GBP: 0.84, JPY: 169 });
  const [lastFxDate, setLastFxDate] = useState<string | undefined>(undefined);

  // Load live FX from our API (server caches it)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/fx", { cache: "no-store" });
        const data = await res.json();
        // ensure the 4 keys exist
        setRates({
          EUR: 1,
          USD: data?.rates?.USD ?? 1.09,
          GBP: data?.rates?.GBP ?? 0.84,
          JPY: data?.rates?.JPY ?? 169,
        });
        setLastFxDate(data?.date);
      } catch {
        /* keep defaults */
      }
    })();
  }, []);

  const ratePerEUR = (ccy: CCY) => (ccy === "EUR" ? 1 : rates[ccy]);

  const toEurCents = (amountCents: number, from: CCY, fxPerEUR?: number) => {
    // amount is in 'from' currency. If we know the historical fxPerEUR snapshot, use it.
    if (from === "EUR") return amountCents;
    const perEUR = fxPerEUR ?? ratePerEUR(from);
    return Math.round(amountCents / perEUR);
  };

  const fromEurCents = (eurCents: number, to: CCY) => {
    if (to === "EUR") return eurCents;
    return Math.round(eurCents * ratePerEUR(to));
  };

  const convert = (amountCents: number, from: CCY, to: CCY = currency) => {
    const eur = toEurCents(amountCents, from);
    return fromEurCents(eur, to);
  };

  const value = useMemo(
    () => ({ currency, setCurrency, rates, lastFxDate, ratePerEUR, toEurCents, fromEurCents, convert }),
    [currency, rates, lastFxDate]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}

export function formatCents(cents: number, ccy: CCY) {
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency: ccy }).format(cents / 100);
}
