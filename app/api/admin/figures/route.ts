// app/api/admin/figures/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";

function forbid() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

async function resolveSeriesId(seriesIdOrName?: string): Promise<string | null> {
  if (!seriesIdOrName) return null;
  const foundById = await prisma.series.findUnique({ where: { id: seriesIdOrName } });
  if (foundById) return foundById.id;
  const foundByName = await prisma.series.findFirst({ where: { name: seriesIdOrName } });
  return foundByName?.id ?? null;
}

export async function GET(req: Request) {
  const session = (await getServerSession(authOptions as any)) as any;
  if (!session?.user || session.user.role !== "ADMIN") return forbid();

  const { searchParams } = new URL(req.url);
  const seriesId = searchParams.get("seriesId") || undefined;

  const figures = await prisma.figure.findMany({
    where: { ...(seriesId ? { seriesId } : {}) },
    orderBy: [{ seriesId: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ figures });
}

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as any;
  if (!session?.user || session.user.role !== "ADMIN") return forbid();

  const b = await req.json().catch(() => ({}));
  const seriesId = await resolveSeriesId(String(b.seriesId || "").trim());
  if (!seriesId) return NextResponse.json({ error: "seriesId (or valid series name) required" }, { status: 400 });

  const name = (b.name ?? "").toString().trim();
  const image = (b.image ?? "").toString().trim();
  const line = (b.line ?? "").toString().trim();
  const character = (b.character ?? "").toString().trim();
  const characterBase = b.characterBase ? String(b.characterBase).trim() : null;
  const variant = b.variant ? String(b.variant).trim() : null;
  const releaseYear = Number(b.releaseYear ?? 0) || new Date().getFullYear();
  const releaseType = b.releaseType ? String(b.releaseType) : null;
  const msrpCents = Number.isFinite(b.msrpCents) ? Number(b.msrpCents) : 0;
  const msrpCurrency = (b.msrpCurrency ?? "EUR") as "EUR" | "USD" | "GBP" | "JPY";
  const bodyVersionTag = b.bodyVersionTag ? String(b.bodyVersionTag).trim() : null;
  const bodyVersion = b.bodyVersion ? (String(b.bodyVersion) as any) : undefined;
  const saga = b.saga ? String(b.saga).trim() : null;

  if (!name || !image || !line) {
    return NextResponse.json({ error: "name, line, image required" }, { status: 400 });
  }

  const created = await prisma.figure.create({
    data: {
      name,
      character,
      characterBase,
      variant,
      line,
      image,
      releaseYear,
      releaseType: releaseType as any,
      msrpCents,
      msrpCurrency: msrpCurrency as any,
      seriesId,
      bodyVersionTag,
      bodyVersion,
      saga,
    },
  });

  return NextResponse.json({ figure: created }, { status: 201 });
}
