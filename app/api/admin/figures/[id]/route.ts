import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = params.id;
  const body = await req.json().catch(() => ({}));
  const data: any = {};
  const fields = ["name","character","characterBase","variant","line","image","releaseYear","releaseType","bodyVersion","saga","msrpCents","msrpCurrency"];
  for (const k of fields) if (k in body) data[k] = body[k];

  try {
    const updated = await prisma.figure.update({ where: { id }, data });
    return NextResponse.json({ figure: updated });
  } catch (e: any) {
    return NextResponse.json({ error: "Update failed", detail: String(e?.message ?? e) }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    await prisma.figure.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Delete failed", detail: String(e?.message ?? e) }, { status: 400 });
  }
}
