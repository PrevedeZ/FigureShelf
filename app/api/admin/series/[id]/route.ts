import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { name } = await req.json().catch(() => ({}));
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
  try {
    const updated = await prisma.series.update({ where: { id: params.id }, data: { name } });
    return NextResponse.json({ series: updated });
  } catch (e: any) {
    return NextResponse.json({ error: "Update failed", detail: String(e?.message ?? e) }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "true";
  const count = await prisma.figure.count({ where: { seriesId: params.id } });
  if (count > 0 && !force) {
    return NextResponse.json({ error: "Series has figures. Pass ?force=true to delete all figures first." }, { status: 400 });
  }
  try {
    if (force) await prisma.figure.deleteMany({ where: { seriesId: params.id } });
    await prisma.series.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true, deletedFigures: force ? count : 0 });
  } catch (e: any) {
    return NextResponse.json({ error: "Delete failed", detail: String(e?.message ?? e) }, { status: 400 });
  }
}
