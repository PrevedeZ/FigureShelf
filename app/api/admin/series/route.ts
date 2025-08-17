import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  const list = await prisma.series.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ series: list });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name } = await req.json();
  if (!name || typeof name !== "string") return NextResponse.json({ error: "Name required" }, { status: 400 });

  const s = await prisma.series.create({ data: { name: name.trim() } });
  return NextResponse.json({ series: s });
}
