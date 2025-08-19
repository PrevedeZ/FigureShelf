// components/figureAdapter.ts
import type { Figure as AppFigure, ReleaseType, CCY } from "./types";

const RELEASE_TYPES = new Set<ReleaseType>([
  "retail",
  "web_exclusive",
  "event_exclusive",
  "sdcc",
  "reissue",
  "unknown",
]);

export function toAppFigure(raw: any): AppFigure {
  const rt = raw?.releaseType;
  let releaseType: ReleaseType | null | undefined = undefined;
  if (rt === null) releaseType = null;
  else if (typeof rt === "string")
    releaseType = RELEASE_TYPES.has(rt as ReleaseType) ? (rt as ReleaseType) : undefined;
  else if (rt !== undefined) releaseType = rt as ReleaseType | null | undefined;

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
    seriesId: raw.seriesId ?? undefined,
  };
}

export function toAppFigures(list: any[]): AppFigure[] {
  return (list ?? []).map(toAppFigure);
}
