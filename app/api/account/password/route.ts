import { NextResponse } from "next/server";
import { getServerSession, type Session } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "../../../../lib/prisma";
import bcrypt from "bcryptjs";

type AppSession = Session & {
  user?: { email?: string | null };
};

export async function PATCH(req: Request) {
  const session = (await getServerSession(authOptions)) as AppSession | null;
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json().catch(() => ({} as any));
  if (!currentPassword || !newPassword || String(newPassword).length < 8) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email as string },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const ok = await bcrypt.compare(String(currentPassword), user.password);
  if (!ok) return NextResponse.json({ error: "Current password incorrect" }, { status: 400 });

  const hash = await bcrypt.hash(String(newPassword), 10);
  await prisma.user.update({ where: { id: user.id }, data: { password: hash } });

  return NextResponse.json({ ok: true });
}
