// app/api/admin/series/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { prisma } from "../../../../../lib/prisma";

function forbid() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = (await getServerSession(authOptions as any)) as any;
  if (!session?.user || session.user.role !== "ADMIN") return forbid();

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const name = body?.name ? String(body.name).trim() : undefined;
  const slug = body?.slug ? String(body.slug).trim() : undefined;
  if (!name && !slug) return NextResponse.json({ error: "nothing to update" }, { status: 400 });

  const updated = await prisma.series.update({
    where: { id },
    data: { ...(name ? { name } : {}), ...(slug ? { slug } : {}) },
  });
  return NextResponse.json({ series: updated });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = (await getServerSession(authOptions as any)) as any;
  if (!session?.user || session.user.role !== "ADMIN") return forbid();

  const { id } = await ctx.params;
  const figCount = await prisma.figure.count({ where: { seriesId: id } });
  if (figCount > 0) {
    return NextResponse.json({ error: "Series has figures – delete blocked." }, { status: 409 });
  }
  await prisma.series.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
