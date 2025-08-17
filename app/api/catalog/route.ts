import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

/* Types matching your schema */
type CCY = "EUR" | "USD" | "GBP" | "JPY";

/* V2 row (new columns exist) */
type FigureRowV2 = {
  id: string;
  name: string;
  character: string;
  characterBase: string | null;
  variant: string | null;
  line: string;
  releaseYear: number;
  msrpCents: number;
  msrpCurrency: CCY;
  image: string;
  releaseType: "retail" | "tamashii_web" | "event_exclusive" | "sdcc" | null;
  bodyVersion: string | null;
  saga: string | null;
  series: { name: string };
};

/* V1 row (before new columns) – fallback so the page still loads */
type FigureRowV1 = {
  id: string;
  name: string;
  character: string;
  line: string;
  releaseYear: number;
  msrpCents: number;
  msrpCurrency: CCY;
  image: string;
  releaseType: any | null;
  series: { name: string };
};

function splitCharacter(name: string): { base: string; variant: string } {
  const m = name.match(/^(.+?)\s*\((.+)\)\s*$/);
  if (m) return { base: m[1].trim(), variant: m[2].trim() };
  return { base: name.trim(), variant: "" };
}

export async function GET() {
  // All series names (even empty ones) for filters/overview
  const dbSeries = await prisma.series.findMany({
    select: { name: true },
    orderBy: { name: "asc" },
  });
  const series = dbSeries.map((s) => s.name);

  // Try selecting the new fields first (V2). If columns don't exist yet, fall back to V1.
  try {
    const dbFigures: FigureRowV2[] = await prisma.figure.findMany({
      select: {
        id: true,
        name: true,
        character: true,
        characterBase: true,
        variant: true,
        line: true,
        releaseYear: true,
        msrpCents: true,
        msrpCurrency: true,
        image: true,
        releaseType: true,
        bodyVersion: true,
        saga: true,
        series: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });

    const figures = dbFigures.map((f) => ({
      id: f.id,
      name: f.name,
      character: f.character,
      characterBase: f.characterBase ?? undefined,
      variant: f.variant ?? undefined,
      line: f.line,
      series: f.series.name,
      image: f.image,
      releaseYear: f.releaseYear,
      releaseType: f.releaseType ?? undefined,
      bodyVersion: f.bodyVersion ?? undefined,
      saga: f.saga ?? undefined,
      msrpCents: f.msrpCents,
      msrpCurrency: f.msrpCurrency,
    }));

    return NextResponse.json({ series, figures });
  } catch {
    // Fallback when DB hasn't been migrated yet
    const dbFigures: FigureRowV1[] = await prisma.figure.findMany({
      select: {
        id: true,
        name: true,
        character: true,
        line: true,
        releaseYear: true,
        msrpCents: true,
        msrpCurrency: true,
        image: true,
        releaseType: true,
        series: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });

    const figures = dbFigures.map((f) => {
      const { base, variant } = splitCharacter(f.character);
      return {
        id: f.id,
        name: f.name,
        character: f.character,
        characterBase: base || undefined,
        variant: variant || undefined,
        line: f.line,
        series: f.series.name,
        image: f.image,
        releaseYear: f.releaseYear,
        releaseType: (f.releaseType as any) ?? undefined,
        bodyVersion: undefined,
        saga: undefined,
        msrpCents: f.msrpCents,
        msrpCurrency: f.msrpCurrency,
      };
    });

    return NextResponse.json({ series, figures });
  }
}
