// app/api/admin/users/[id]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { prisma } from "../../../../../lib/prisma";
import bcrypt from "bcryptjs";

function forbid() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = (await getServerSession(authOptions as any)) as any;
  if (!session?.user || session.user.role !== "ADMIN") return forbid();

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const data: any = {};
  if (body.role && (body.role === "USER" || body.role === "ADMIN")) data.role = body.role;
  if (typeof body.password === "string" && body.password.length >= 8) {
    data.password = await bcrypt.hash(body.password, 10);
  }
  if (!Object.keys(data).length) return NextResponse.json({ error: "nothing to update" }, { status: 400 });

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, name: true, role: true },
  });

  return NextResponse.json({ user: updated });
}
