// app/api/admin/series/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";

function forbid() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function GET() {
  const session = (await getServerSession(authOptions as any)) as any;
  if (!session?.user || session.user.role !== "ADMIN") return forbid();

  const series = await prisma.series.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { figures: true } } },
  });
  return NextResponse.json({ series });
}

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as any;
  if (!session?.user || session.user.role !== "ADMIN") return forbid();

  const body = await req.json().catch(() => ({}));
  const name = String(body?.name ?? "").trim();
  const slug = body?.slug ? String(body.slug).trim() : undefined;
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const created = await prisma.series.create({ data: { name, slug } });
  return NextResponse.json({ series: created }, { status: 201 });
}
