import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }
    const lower = String(email).toLowerCase().trim();
    const exists = await prisma.user.findUnique({ where: { email: lower } });
    if (exists) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

    const hash = await bcrypt.hash(String(password), 10);
    const user = await prisma.user.create({
      data: { email: lower, name: name?.toString()?.trim() || null, password: hash },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    return NextResponse.json({ ok: true, user });
  } catch (e) {
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 });
  }
}
