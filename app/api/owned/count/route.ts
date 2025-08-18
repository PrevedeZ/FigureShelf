import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  // Cast to any to avoid TS complaining about the custom fields on session.user
  const session = (await getServerSession(authOptions as any)) as any;
  const userId: string | undefined = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Count duplicates only: sum of (countPerFigure - 1)
  const grouped = await prisma.owned.groupBy({
    by: ["figureId"],
    where: { userId },
    _count: { figureId: true },
  });

  const copies = grouped.reduce((sum, row) => {
    const c = row._count.figureId ?? 0;
    return sum + Math.max(c - 1, 0);
  }, 0);

  return NextResponse.json({ count: copies }, { status: 200 });
}
