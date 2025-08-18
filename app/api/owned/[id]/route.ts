import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";

type AppSession = Session & { user?: { id?: string; role?: "USER" | "ADMIN" } };

function forbid() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = (await getServerSession(authOptions as any)) as AppSession | null;
  if (!session?.user?.id) return forbid();

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({} as any));

  const row = await prisma.owned.findUnique({ where: { id } });
  if (!row || row.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.owned.update({
    where: { id },
    data: {
      pricePaidCents: body?.pricePaidCents == null ? row.pricePaidCents : Number(body.pricePaidCents),
      taxCents: body?.taxCents == null ? row.taxCents : Number(body.taxCents),
      shippingCents: body?.shippingCents == null ? row.shippingCents : Number(body.shippingCents),
      currency: body?.currency ?? row.currency,
      fxPerEUR: body?.fxPerEUR == null ? row.fxPerEUR : Number(body.fxPerEUR),
      note: typeof body?.note === "string" ? body.note : body?.note === null ? null : row.note,
    },
    select: {
      id: true,
      figureId: true,
      pricePaidCents: true,
      taxCents: true,
      shippingCents: true,
      currency: true,
      fxPerEUR: true,
      note: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ owned: updated }, { status: 200 });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = (await getServerSession(authOptions as any)) as AppSession | null;
  if (!session?.user?.id) return forbid();

  const { id } = await ctx.params;

  const row = await prisma.owned.findUnique({ where: { id } });
  if (!row || row.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.owned.delete({ where: { id } });
  return NextResponse.json({ ok: true }, { status: 200 });
}
