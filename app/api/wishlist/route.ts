import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { prisma } from "../../../lib/prisma";

// GET /api/wishlist  (list for current user)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json([], { status: 200 });

  const list = await prisma.wishlist.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(list, { status: 200 });
}

// POST /api/wishlist  (create or update note/wantAnother)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const figureId: string | undefined =
    typeof body?.figureId === "string"
      ? body.figureId
      : typeof body?.id === "string"
      ? body.id
      : undefined;

  if (!figureId) {
    return NextResponse.json({ error: "figureId is required" }, { status: 400 });
  }

  const existing = await prisma.wishlist.findFirst({
    where: { userId: session.user.id, figureId },
  });

  const wish = existing
    ? await prisma.wishlist.update({
        where: { id: existing.id },
        data: {
          wantAnother:
            body.wantAnother === undefined ? existing.wantAnother : !!body.wantAnother,
          note:
            body.note === undefined
              ? existing.note
              : body.note === null
              ? null
              : String(body.note),
        },
      })
    : await prisma.wishlist.create({
        data: {
          userId: session.user.id,
          figureId,
          wantAnother: !!body.wantAnother,
          note: body.note === undefined ? null : String(body.note),
        },
      });

  return NextResponse.json({ wish }, { status: 200 });
}
