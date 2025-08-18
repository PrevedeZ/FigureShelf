// components/types.ts

export type CCY = "EUR" | "USD" | "GBP" | "JPY";

export type ReleaseType =
  | "retail"
  | "tamashii_web"
  | "event_exclusive"
  | "sdcc"
  | "web_exclusive"
  | "reissue"
  | "unknown";

export interface Figure {
  id: string;
  // NOTE: in the FE catalog we use the resolved series name, not seriesId
  series: string;

  name: string;
  character: string;
  characterBase?: string | null; // <- allow null to match catalog
  variant?: string | null;       // <- allow null to match catalog

  line: string;
  image: string;

  releaseYear: number;
  releaseType?: ReleaseType | null;

  // optional/legacy fields present in FE data
  bodyVersion?: string | null;
  saga?: string | null;

  msrpCents: number;
  msrpCurrency: CCY;
}
