import { NextResponse } from "next/server";
import { getServerSession, type Session } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";

type AppSession = Session & {
  user?: { email?: string | null };
};

export async function GET() {
  const session = (await getServerSession(authOptions)) as AppSession | null;
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email as string },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
  });

  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  const session = (await getServerSession(authOptions)) as AppSession | null;
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({} as any));
  const name = (body?.name ?? "").toString().trim();

  const user = await prisma.user.update({
    where: { email: session.user.email as string },
    data: { name: name.length ? name : null },
    select: { id: true, email: true, name: true },
  });

  return NextResponse.json({ user });
}
