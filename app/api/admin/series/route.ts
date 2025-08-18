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

export async function GET() {
  const session = (await getServerSession(authOptions as any)) as AppSession | null;
  if (!session?.user?.id || session.user.role !== "ADMIN") return forbid();

  const items = await prisma.series.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true },
  });
  return NextResponse.json({ items }, { status: 200 });
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as AppSession | null;
  if (!session?.user?.id || session.user.role !== "ADMIN") return forbid();

  let body: any = {};
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const name = (body?.name ?? "").toString().trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  // unique slug
  const base = slugify(name);
  let slug = base;
  let n = 2;
  while (await prisma.series.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }

  const series = await prisma.series.create({
    data: { name, slug },
    select: { id: true, name: true, slug: true },
  });

  return NextResponse.json({ series }, { status: 200 });
}
