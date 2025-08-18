// app/api/dev/seed/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import bcrypt from "bcryptjs";

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Disabled in production" }, { status: 404 });
  }

  // 1) Create/ensure a test user
  const email = "demo@example.com";
  const plain = "demo12345";
  const hash = await bcrypt.hash(plain, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, password: hash, role: "ADMIN" },
    select: { id: true, email: true, role: true },
  });

  // 2) Create/ensure a Series + Figure
  const series = await prisma.series.upsert({
    where: { name: "Dragon Ball" },
    update: {},
    create: { name: "Dragon Ball" },
    select: { id: true, name: true },
  });

  const figure = await prisma.figure.upsert({
    where: { id: "seed-fig-1" }, // deterministic id to keep it idempotent
    update: {},
    create: {
      id: "seed-fig-1",
      name: "Goku SSG (Event Exclusive)",
      character: "Son Goku (SSG)",
      characterBase: "Son Goku",
      variant: "SSG",
      line: "S.H.Figuarts",
      image: "/placeholder/goku.jpg",
      releaseYear: 2022,
      releaseType: "event_exclusive",
      bodyVersion: "V2_0",
      saga: "Super",
      msrpCents: 6499,
      msrpCurrency: "EUR",
      seriesId: series.id,
    },
    select: { id: true, name: true, seriesId: true },
  });

  return NextResponse.json({
    ok: true,
    user,
    credentials: { email, password: plain },
    series,
    figure,
    note: "Go to /auth/signin and use the credentials above.",
  });
}
