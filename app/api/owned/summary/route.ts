import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session as any)?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Count all owned (ignore sold if you use that flag)
  const total = await prisma.owned.count({
    where: { userId, isSold: false as any | undefined }
  });

  // Count distinct figures for this user
  const distinct = await prisma.owned.findMany({
    where: { userId, isSold: false as any | undefined },
    select: { figureId: true },
    distinct: ["figureId"],
  });
  const unique = distinct.length;
  const copies = Math.max(0, total - unique); // duplicates only

  return NextResponse.json({ unique, copies });
}
