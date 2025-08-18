import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma"; // path from app/api/catalog/route.ts

export async function GET() {
  try {
    const rows = await prisma.figure.findMany({
      include: { series: true },
      orderBy: [{ series: { name: "asc" } }, { name: "asc" }],
    });

    const figures = rows.map((r) => ({
      id: r.id,
      name: r.name,
      character: r.character,
      characterBase: r.characterBase ?? null,
      variant: r.variant ?? null,
      line: r.line,
      image: r.image,
      releaseYear: r.releaseYear,
      releaseType: r.releaseType,
      bodyVersion: r.bodyVersion ?? null,
      saga: r.saga ?? null,
      msrpCents: r.msrpCents,
      msrpCurrency: r.msrpCurrency,
      series: r.series.name, // <-- string expected by the client
    }));

    return NextResponse.json({ figures });
  } catch (err) {
    console.error("GET /api/catalog failed", err);
    return NextResponse.json({ error: "Failed to load catalog" }, { status: 500 });
  }
}
