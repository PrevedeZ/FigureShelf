// components/types.ts

// --- shared primitives ---
export type CCY = "EUR" | "USD" | "GBP" | "JPY";

export type ReleaseType =
  | "retail"
  | "web_exclusive"
  | "event_exclusive"
  | "sdcc"
  | "reissue"
  | "unknown";

export type BodyVersion = "V1_0" | "V2_0" | "V3_0" | "OTHER";

// --- core app model used by UI ---
export type Figure = {
  id: string;
  name: string;
  character: string;
  characterBase?: string;
  variant?: string;

  line: string;
  image: string;

  releaseYear: number;
  releaseType?: ReleaseType | null;

  // new (match adapter & prisma)
  bodyVersionTag?: string;      // free-form like "2.0", "3.0"
  bodyVersion?: BodyVersion;    // coarse enum, optional

  saga?: string;

  msrpCents: number;
  msrpCurrency: CCY;

  // series as a simple label + optional id
  series: string;
  seriesId?: string;
};
