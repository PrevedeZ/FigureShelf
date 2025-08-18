// components/figureAdapter.ts
import type { Figure as AppFigure, ReleaseType, CCY } from "./types";

/** allowed ReleaseType values in your app */
const RELEASE_TYPES = new Set<ReleaseType>([
  "retail",
  "web_exclusive",
  "event_exclusive",
  "sdcc",
  "reissue",
  "unknown",
]);

/**
 * Convert a "raw" figure (e.g. from catalog or API) into the
 * strict App Figure type (components/types).
 * - normalizes null -> undefined
 * - maps string releaseType -> ReleaseType enum when possible
 */
export function toAppFigure(raw: any): AppFigure {
  const rt = raw?.releaseType;
  let releaseType: ReleaseType | null | undefined = undefined;
  if (rt === null) {
    releaseType = null;
  } else if (typeof rt === "string") {
    releaseType = RELEASE_TYPES.has(rt as ReleaseType) ? (rt as ReleaseType) : undefined;
  } else if (rt !== undefined) {
    // already an enum or null/undefined from the app side
    releaseType = rt as ReleaseType | null | undefined;
  }

  return {
    id: String(raw.id),
    name: String(raw.name),
    character: String(raw.character),
    characterBase: raw.characterBase ?? undefined,
    variant: raw.variant ?? undefined,
    line: String(raw.line),
    image: String(raw.image),
    releaseYear: Number(raw.releaseYear),
    releaseType,
    bodyVersionTag: raw.bodyVersionTag ?? undefined,
    bodyVersion: raw.bodyVersion ?? undefined,
    saga: raw.saga ?? undefined,
    msrpCents: Number(raw.msrpCents),
    msrpCurrency: String(raw.msrpCurrency) as CCY,
    series: String(raw.series ?? raw.seriesName ?? ""),
    // keep any extra fields you carry around:
    seriesId: raw.seriesId ?? undefined,
  };
}

/** convenience bulk adapter */
export function toAppFigures(list: any[]): AppFigure[] {
  return (list ?? []).map(toAppFigure);
}
