import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "../../../lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const figureId = String(body.figureId || "");
  if (!figureId) return NextResponse.json({ error: "figureId required" }, { status: 400 });

  // default currency if not provided
  const currency = (body.currency ?? "EUR") as any;
  const pricePaidCents = Number(body.pricePaidCents || 0);
  const taxCents = Number(body.taxCents || 0);
  const shippingCents = Number(body.shippingCents || 0);
  const fxPerEUR = body.fxPerEUR == null ? null : Number(body.fxPerEUR);

  const row = await prisma.owned.create({
    data: {
      userId: user.id,
      figureId,
      currency,
      pricePaidCents,
      taxCents,
      shippingCents,
      fxPerEUR: fxPerEUR ?? undefined,
    },
  });

  return NextResponse.json({ row });
}
