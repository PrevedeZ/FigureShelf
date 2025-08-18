import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";

// PATCH /api/owned/:id
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const toInt = (v: any) => {
    const n = Number.isFinite(v) ? Math.trunc(Number(v)) : parseInt(String(v ?? 0), 10);
    return Number.isFinite(n) ? n : 0;
    };

  // ensure ownership
  const row = await prisma.owned.findUnique({ where: { id: params.id } });
  if (!row || row.userId !== session.user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.owned.update({
    where: { id: params.id },
    data: {
      pricePaidCents: body.pricePaidCents === undefined ? row.pricePaidCents : toInt(body.pricePaidCents),
      taxCents: body.taxCents === undefined ? row.taxCents : toInt(body.taxCents),
      shippingCents: body.shippingCents === undefined ? row.shippingCents : toInt(body.shippingCents),
      currency: (body.currency ?? row.currency) as any,
      fxPerEUR:
        body.fxPerEUR === undefined
          ? row.fxPerEUR
          : body.fxPerEUR === null
          ? null
          : Number(body.fxPerEUR),
    },
  });

  return NextResponse.json({ owned: updated }, { status: 200 });
}

// DELETE /api/owned/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const row = await prisma.owned.findUnique({ where: { id: params.id } });
  if (!row || row.userId !== session.user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.owned.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true }, { status: 200 });
}
