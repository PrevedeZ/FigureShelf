// app/api/admin/figures/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const series = await prisma.series.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const figures = await prisma.figure.findMany({
    orderBy: { name: "asc" },
    include: { series: { select: { id: true, name: true } } },
  });

  return NextResponse.json(
    {
      series,
      figures: figures.map((f) => ({
        id: f.id,
        name: f.name,
        seriesId: f.seriesId,
        seriesName: f.series?.name ?? null,
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const figureId = body?.figureId as string | undefined;
  const seriesId = body?.seriesId as string | undefined;

  if (!figureId || !seriesId) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // ensure both exist
  const [figure, series] = await Promise.all([
    prisma.figure.findUnique({ where: { id: figureId } }),
    prisma.series.findUnique({ where: { id: seriesId } }),
  ]);
  if (!figure || !series) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  await prisma.figure.update({
    where: { id: figureId },
    data: { seriesId },
  });

  return NextResponse.json({ ok: true });
}
