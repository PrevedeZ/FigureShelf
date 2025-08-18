import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";

type AppSession = Session & { user?: { id?: string; role?: "USER" | "ADMIN" } };

function forbid() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = (await getServerSession(authOptions as any)) as AppSession | null;
  if (!session?.user?.id) return forbid();

  const { id } = await ctx.params;

  const row = await prisma.wishlist.findUnique({ where: { id } });
  if (!row || row.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.wishlist.delete({ where: { id } });
  return NextResponse.json({ ok: true }, { status: 200 });
}
