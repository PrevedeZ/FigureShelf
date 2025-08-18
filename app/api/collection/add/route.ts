import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";

type Currency = "EUR" | "USD" | "GBP" | "JPY";
const toInt = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : d);

function parseBody(raw: any) {
  const b = typeof raw === "object" && raw ? raw : {};
  const figureId = b.figureId ?? b.figure_id ?? b.id ?? b?.owned?.figureId ?? b?.owned?.figure_id;
  const currency: Currency =
    (b.currency ?? b?.owned?.currency ?? "EUR").toString().toUpperCase();

  return {
    figureId: typeof figureId === "string" ? figureId : "",
    currency: (["EUR", "USD", "GBP", "JPY"] as const).includes(currency as any)
      ? (currency as Currency)
      : "EUR",
    pricePaidCents: toInt(b.pricePaidCents ?? b.price ?? b?.owned?.pricePaidCents),
    taxCents: toInt(b.taxCents ?? b.tax ?? b?.owned?.taxCents),
    shippingCents: toInt(b.shippingCents ?? b.shipping ?? b?.owned?.shippingCents),
    fxPerEUR:
      b.fxPerEUR === null || b.fxPerEUR === undefined
        ? null
        : Number(b.fxPerEUR) || null,
    note: typeof b.note === "string" ? b.note : null,
  };
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = parseBody(await req.json().catch(() => ({})));
  if (!body.figureId) return NextResponse.json({ error: "figureId is required" }, { status: 400 });

  const fig = await prisma.figure.findUnique({ where: { id: body.figureId } });
  if (!fig) return NextResponse.json({ error: "Figure not found" }, { status: 404 });

  const created = await prisma.owned.create({
    data: {
      userId: session.user.id as string,
      figureId: body.figureId,
      currency: body.currency as any,
      pricePaidCents: body.pricePaidCents,
      taxCents: body.taxCents,
      shippingCents: body.shippingCents,
      fxPerEUR: body.fxPerEUR,
      note: body.note,
    },
  });

  return NextResponse.json({ owned: created }, { status: 200 });
}
