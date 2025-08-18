import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";

type AppSession = Session & { user?: { id?: string; role?: "USER" | "ADMIN" } };

function forbid() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function splitCharacter(character: string): { base: string; variant: string | null } {
  const m = character.match(/^(.*?)(?:\s*\((.+)\))?$/);
  if (!m) return { base: character, variant: null };
  const base = m[1].trim();
  const variant = (m[2] ?? "").trim() || null;
  return { base, variant };
}

export async function GET() {
  try {
    const session = (await getServerSession(authOptions as any)) as AppSession | null;
    if (!session?.user?.id || session.user.role !== "ADMIN") return forbid();

    const items = await prisma.figure.findMany({
      orderBy: [{ releaseYear: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        character: true,
        variant: true,
        image: true,
        releaseYear: true,
        releaseType: true,
        msrpCents: true,
        msrpCurrency: true,
        series: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ items }, { status: 200 });
  } catch (err) {
    console.error("[admin/figures] GET failed:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as AppSession | null;
    if (!session?.user?.id || session.user.role !== "ADMIN") return forbid();

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const seriesId = (body?.seriesId ?? "").toString().trim();
    const name = (body?.name ?? "").toString().trim();
    const character = (body?.character ?? "").toString().trim();
    const line = (body?.line ?? "").toString().trim();
    const image = (body?.image ?? "").toString().trim();
    const releaseYear = Number(body?.releaseYear ?? 0);
    const msrpCents = Number(body?.msrpCents ?? 0);
    const msrpCurrency = (body?.msrpCurrency ?? "EUR").toString().trim();

    if (!seriesId || !name || !character || !line || !image || !releaseYear || !msrpCents) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ensure unique slug based on name + year
    const base = slugify(`${name}-${releaseYear}`);
    let slug = base;
    let n = 2;
    while (await prisma.figure.findUnique({ where: { slug } })) {
      slug = `${base}-${n++}`;
    }

    const { base: characterBase, variant } = splitCharacter(character);

    const figure = await prisma.figure.create({
      data: {
        slug,
        name,
        character,
        characterBase,
        variant,
        line,
        image,
        releaseYear,
        // default releaseType can be set here if needed
        msrpCents,
        msrpCurrency,
        seriesId,
      },
      select: {
        id: true,
        name: true,
        character: true,
        variant: true,
        image: true,
        releaseYear: true,
        releaseType: true,
        msrpCents: true,
        msrpCurrency: true,
        series: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ figure }, { status: 200 });
  } catch (err: any) {
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Figure with same slug already exists" }, { status: 409 });
    }
    console.error("[admin/figures] POST failed:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
