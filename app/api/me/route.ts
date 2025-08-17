import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const me = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  return NextResponse.json({ user: me });
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name } = await req.json();
  const updated = await prisma.user.update({
    where: { email: session.user.email.toLowerCase() },
    data: { name: name?.toString()?.trim() || null },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });
  return NextResponse.json({ user: updated });
}
