// components/types.ts

// Keep this union in sync with your CurrencyContext
export type CCY = "EUR" | "USD" | "GBP" | "JPY";

export type Figure = {
  id: string;
  name: string;
  character: string;          // legacy full name, may include "(Variant)"
  characterBase?: string;     // preferred base
  variant?: string;           // preferred variant
  line: string;
  series: string;
  image: string;

  releaseYear: number;
  // match your Prisma enum values
  releaseType?: "retail" | "tamashii_web" | "event_exclusive" | "sdcc" | string;
  bodyVersion?: string;       // e.g. "V1.0" | "V2.0" | "V3.0" | "Other"
  saga?: string;

  msrpCents: number;
  msrpCurrency: CCY;          // <-- IMPORTANT: not plain string
};
