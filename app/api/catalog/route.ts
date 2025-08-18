import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  const [figures, series] = await Promise.all([
    prisma.figure.findMany({
      orderBy: [{ releaseYear: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        character: true,
        characterBase: true,
        variant: true,
        line: true,
        image: true,
        releaseYear: true,
        releaseType: true,
        bodyVersionTag: true,
        bodyVersion: true,
        saga: true,
        msrpCents: true,
        msrpCurrency: true,
        seriesId: true,
        series: { select: { id: true, name: true } },
      },
    }),
    prisma.series.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  ]);

  return NextResponse.json({ figures, series }, { status: 200 });
}
