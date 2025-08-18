import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { prisma } from "../../../../../lib/prisma";

type AppSession = Session & { user?: { id?: string; role?: "USER" | "ADMIN" } };

function forbid() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as AppSession | null;
  if (!session?.user?.id || session.user.role !== "ADMIN") return forbid();

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  // refuse to delete if any figures exist
  const count = await prisma.figure.count({ where: { seriesId: id } });
  if (count > 0) {
    return NextResponse.json(
      { error: "Series has figures. Delete/move them first." },
      { status: 409 }
    );
  }

  await prisma.series.delete({ where: { id } });
  return NextResponse.json({ ok: true }, { status: 200 });
}
