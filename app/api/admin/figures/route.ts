import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const {
    name,
    character,
    characterBase,
    variant,
    line,
    image,
    releaseYear,
    releaseType,           // "retail" | "tamashii_web" | "event_exclusive" | "sdcc" | null
    bodyVersion,
    saga,
    msrpCents,
    msrpCurrency,          // "EUR" | "USD" | "GBP" | "JPY"
    seriesId,
    seriesName,            // if no seriesId, create/find by name
  } = body || {};

  try {
    let sid = seriesId as string | undefined;

    // If a name was provided instead of an id, upsert the series by name
    if (!sid && seriesName && String(seriesName).trim()) {
      const s = await prisma.series.upsert({
        where: { name: seriesName.trim() },
        create: { name: seriesName.trim() },
        update: {},
        select: { id: true },
      });
      sid = s.id;
    }

    if (!sid) return NextResponse.json({ error: "seriesId or seriesName required" }, { status: 400 });

    const created = await prisma.figure.create({
      data: {
        name,
        character,
        characterBase: characterBase || null,
        variant: variant || null,
        line,
        image,
        releaseYear: Number(releaseYear),
        releaseType: releaseType || null,
        bodyVersion: bodyVersion || null,
        saga: saga || null,
        msrpCents: Number(msrpCents),
        msrpCurrency,
        seriesId: sid,
      },
      select: { id: true },
    });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: "Create failed", detail: String(e?.message ?? e) }, { status: 400 });
  }
}
