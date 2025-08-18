// app/api/admin/figures/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { prisma } from "../../../../../lib/prisma";

function forbid() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = (await getServerSession(authOptions as any)) as any;
  if (!session?.user || session.user.role !== "ADMIN") return forbid();

  const { id } = await ctx.params;
  const refs =
    (await prisma.owned.count({ where: { figureId: id } })) +
    (await prisma.wishlist.count({ where: { figureId: id } }));
  if (refs > 0) {
    return NextResponse.json({ error: "Figure is referenced in owned/wishlist." }, { status: 409 });
  }

  await prisma.figure.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = (await getServerSession(authOptions as any)) as any;
  if (!session?.user || session.user.role !== "ADMIN") return forbid();

  const { id } = await ctx.params;
  const b = await req.json().catch(() => ({}));

  const updated = await prisma.figure.update({
    where: { id },
    data: {
      ...(b.name ? { name: String(b.name) } : {}),
      ...(b.image ? { image: String(b.image) } : {}),
      ...(b.line ? { line: String(b.line) } : {}),
      ...(b.character ? { character: String(b.character) } : {}),
      ...(b.characterBase !== undefined ? { characterBase: b.characterBase ? String(b.characterBase) : null } : {}),
      ...(b.variant !== undefined ? { variant: b.variant ? String(b.variant) : null } : {}),
      ...(b.releaseYear ? { releaseYear: Number(b.releaseYear) } : {}),
      ...(b.releaseType !== undefined ? { releaseType: b.releaseType ? (String(b.releaseType) as any) : null } : {}),
      ...(b.msrpCents !== undefined ? { msrpCents: Number(b.msrpCents) } : {}),
      ...(b.msrpCurrency ? { msrpCurrency: String(b.msrpCurrency) as any } : {}),
      ...(b.bodyVersionTag !== undefined ? { bodyVersionTag: b.bodyVersionTag ? String(b.bodyVersionTag) : null } : {}),
      ...(b.bodyVersion !== undefined ? { bodyVersion: b.bodyVersion ? (String(b.bodyVersion) as any) : null } : {}),
      ...(b.saga !== undefined ? { saga: b.saga ? String(b.saga) : null } : {}),
    },
  });

  return NextResponse.json({ figure: updated });
}
