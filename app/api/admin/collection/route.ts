// app/api/admin/collection/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";

function forbid() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function GET() {
  const session = (await getServerSession(authOptions as any)) as any;
  if (!session?.user || session.user.role !== "ADMIN") return forbid();

  const [users, owned] = await Promise.all([
    prisma.user.findMany({ select: { id: true, email: true, name: true } }),
    prisma.owned.findMany({
      select: {
        userId: true,
        figureId: true,
        currency: true,
        pricePaidCents: true,
        taxCents: true,
        shippingCents: true,
        fxPerEUR: true,
      },
    }),
  ]);

  const byUser: Record<string, { copies: number; unique: Set<string>; spendEUR: number }> = {};
  for (const u of users) byUser[u.id] = { copies: 0, unique: new Set(), spendEUR: 0 };

  for (const o of owned) {
    if (!byUser[o.userId]) continue;
    byUser[o.userId].copies += 1;
    byUser[o.userId].unique.add(o.figureId);
    const line = (o.pricePaidCents ?? 0) + (o.taxCents ?? 0) + (o.shippingCents ?? 0);
    const eur = o.currency === "EUR" || !o.fxPerEUR ? line : Math.round(line / (o.fxPerEUR || 1));
    byUser[o.userId].spendEUR += eur;
  }

  const rows = users.map((u) => ({
    userId: u.id,
    email: u.email,
    name: u.name ?? null,
    ownedCopies: byUser[u.id]?.copies ?? 0,
    ownedUnique: byUser[u.id]?.unique.size ?? 0,
    spendCentsEUR: byUser[u.id]?.spendEUR ?? 0,
  }));

  return NextResponse.json({ rows });
}
