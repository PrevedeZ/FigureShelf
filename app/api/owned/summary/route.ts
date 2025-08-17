import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const copies = await (prisma as any).owned.count({ where: { userId: user.id } });
  const distinct = await (prisma as any).owned.findMany({
    where: { userId: user.id },
    distinct: ["figureId"],
    select: { figureId: true },
  });

  return NextResponse.json({ copies, unique: distinct.length });
}
