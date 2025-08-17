import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";

async function getUserId() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return null;
  const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return u?.id ?? null;
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = params.id;
  const body = await req.json().catch(() => ({}));
  const data: any = {};
  if ("currency" in body) data.currency = String(body.currency);
  if ("pricePaidCents" in body) data.pricePaidCents = Number(body.pricePaidCents || 0);
  if ("taxCents" in body) data.taxCents = Number(body.taxCents || 0);
  if ("shippingCents" in body) data.shippingCents = Number(body.shippingCents || 0);
  if ("fxPerEUR" in body) data.fxPerEUR = body.fxPerEUR == null ? null : Number(body.fxPerEUR);

  const row = await prisma.owned.update({ where: { id }, data });
  return NextResponse.json({ row });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.owned.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
