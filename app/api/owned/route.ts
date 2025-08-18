import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "../../../lib/prisma";

type AppSession = Session & { user?: { id?: string; role?: "USER" | "ADMIN" } };

function forbid() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  const session = (await getServerSession(authOptions as any)) as AppSession | null;
  if (!session?.user?.id) return forbid();

  const rows = await prisma.owned.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
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
  return NextResponse.json(rows, { status: 200 });
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as AppSession | null;
  if (!session?.user?.id) return forbid();

  const body = await req.json().catch(() => ({} as any));
  const figureId: string | undefined =
    body?.figureId ?? body?.id ?? body?.figure_id;

  if (!figureId || typeof figureId !== "string") {
    return NextResponse.json({ error: "figureId is required" }, { status: 400 });
  }

  const fig = await prisma.figure.findUnique({ where: { id: figureId } });
  if (!fig) return NextResponse.json({ error: "Figure not found" }, { status: 404 });

  const created = await prisma.owned.create({
    data: {
      userId: session.user.id,
      figureId,
      currency: body?.currency ?? "EUR",
      pricePaidCents: Number.isFinite(+body?.pricePaidCents) ? +body.pricePaidCents : 0,
      taxCents: Number.isFinite(+body?.taxCents) ? +body.taxCents : 0,
      shippingCents: Number.isFinite(+body?.shippingCents) ? +body.shippingCents : 0,
      fxPerEUR: body?.fxPerEUR == null ? null : Number(body.fxPerEUR),
      note: body?.note ?? null,
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

  return NextResponse.json({ owned: created }, { status: 200 });
}
