import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if ((session?.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const meId = (session?.user as any)?.id;
  if (params.id === meId) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }
  try {
    await prisma.user.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Delete failed", detail: String(e?.message ?? e) }, { status: 400 });
  }
}
