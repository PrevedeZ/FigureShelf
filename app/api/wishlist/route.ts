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

  const rows = await prisma.wishlist.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      figureId: true,
      wantAnother: true,
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
  const figureId: string | undefined = body?.figureId;
  if (!figureId || typeof figureId !== "string") {
    return NextResponse.json({ error: "figureId is required" }, { status: 400 });
  }

  const fig = await prisma.figure.findUnique({ where: { id: figureId } });
  if (!fig) return NextResponse.json({ error: "Figure not found" }, { status: 404 });

  const wish = await prisma.wishlist.upsert({
    where: { userId_figureId: { userId: session.user.id, figureId } },
    update: {
      wantAnother: !!body?.wantAnother,
      note: typeof body?.note === "string" ? body.note : null,
    },
    create: {
      userId: session.user.id,
      figureId,
      wantAnother: !!body?.wantAnother,
      note: typeof body?.note === "string" ? body.note : null,
    },
    select: {
      id: true,
      figureId: true,
      wantAnother: true,
      note: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ wish }, { status: 200 });
}
